"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveBrowserViewer from "@/components/LiveBrowserViewer";
import {
    ArrowLeft,
    Settings,
    Navigation,
    Shield,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Trash2,
    Eye,
} from "lucide-react";

interface WebsiteConfig {
    website_id: string;
    website_name: string;
    website_slug: string;
    base_url: string;
    default_url: string | null;
    portal_id: string | null;
    auth_domain: string | null;
    nav_yaml_raw: string | null;
    voice_type: string;
    model: string;
    default_mode: string;
    has_cookies: boolean;
    cookies_updated: string | null;
}

interface ParsedRoute {
    key: string;
    path: string;
    label: string;
    description?: string;
    category?: string;
}

interface CookieStatus {
    has_cookies: boolean;
    cookie_count: number;
    cookies_updated: string | null;
    auth_domain: string | null;
}

export default function WebsiteSetupPage() {
    const params = useParams();
    const websiteSlug = params.slug as string;

    // Generate a unique tab ID for browser session isolation
    // Use useEffect to ensure websiteSlug is available
    const [tabId, setTabId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && websiteSlug) {
            const storageKey = `browserTabId_setup_${websiteSlug}`;
            let existingTabId = sessionStorage.getItem(storageKey);
            if (!existingTabId) {
                existingTabId = crypto.randomUUID();
                sessionStorage.setItem(storageKey, existingTabId);
            }
            setTabId(existingTabId);
        }
    }, [websiteSlug]);

    // Pre-warm browser session when tabId is ready
    useEffect(() => {
        if (!tabId || !websiteSlug) return;

        // Check if session already exists, if not create one
        const preWarmSession = async () => {
            try {
                // First check if session exists
                const checkResponse = await fetch(`/api/browser/session?tabId=${encodeURIComponent(tabId)}`);
                if (checkResponse.ok) {
                    console.log(`[setup] Browser session already exists for tabId: ${tabId}`);
                    return;
                }

                // Create new session
                console.log(`[setup] Pre-warming browser session for tabId: ${tabId}`);
                const response = await fetch("/api/browser/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tabId,
                        headless: false,
                        loadFromDb: true,
                        websiteSlug,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`[setup] Browser session created: ${data.browserbaseSessionId}`);
                    // Store browserbaseSessionId for later use
                    if (data.browserbaseSessionId && data.liveUrl) {
                        const cacheKey = `browser_session_${tabId}`;
                        sessionStorage.setItem(
                            cacheKey,
                            JSON.stringify({
                                browserbaseSessionId: data.browserbaseSessionId,
                                debugUrl: data.liveUrl,
                                createdAt: Date.now(),
                            })
                        );
                    }
                } else {
                    console.error(`[setup] Failed to create browser session:`, await response.text());
                }
            } catch (err) {
                console.error(`[setup] Error pre-warming session:`, err);
            }
        };

        preWarmSession();
    }, [tabId, websiteSlug]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<WebsiteConfig | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Navigation state
    const [yamlContent, setYamlContent] = useState("");
    const [parsedRoutes, setParsedRoutes] = useState<ParsedRoute[]>([]);
    const [yamlErrors, setYamlErrors] = useState<string[]>([]);
    const [showExample, setShowExample] = useState(false);
    const [exampleYaml, setExampleYaml] = useState("");

    // Cookie state
    const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);
    const [savingCookies, setSavingCookies] = useState(false);

    // Form state for config tab
    const [formData, setFormData] = useState({
        base_url: "",
        default_url: "",
        portal_id: "",
        auth_domain: "",
        voice_type: "alloy",
        model: "gpt-4o-realtime-preview",
        default_mode: "screenshot",
    });

    const loadConfig = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/config`);
            if (!response.ok) throw new Error("Failed to load configuration");

            const data = await response.json();
            setConfig(data);
            setFormData({
                base_url: data.base_url || "",
                default_url: data.default_url || "",
                portal_id: data.portal_id || "",
                auth_domain: data.auth_domain || "",
                voice_type: data.voice_type || "alloy",
                model: data.model || "gpt-4o-realtime-preview",
                default_mode: data.default_mode || "screenshot",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, [websiteSlug]);

    const loadNavigation = useCallback(async () => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/navigation`);
            if (!response.ok) throw new Error("Failed to load navigation");

            const data = await response.json();
            setYamlContent(data.yaml_raw || "");
            setParsedRoutes(data.routes || []);
            setExampleYaml(data.example_yaml || "");
        } catch (err) {
            console.error("Failed to load navigation:", err);
        }
    }, [websiteSlug]);

    const loadCookieStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/cookies`);
            if (!response.ok) throw new Error("Failed to load cookie status");

            const data = await response.json();
            setCookieStatus(data);
        } catch (err) {
            console.error("Failed to load cookie status:", err);
        }
    }, [websiteSlug]);

    useEffect(() => {
        loadConfig();
        loadNavigation();
        loadCookieStatus();
    }, [loadConfig, loadNavigation, loadCookieStatus]);

    const saveConfig = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/config`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save configuration");
            }

            setSuccessMessage("Configuration saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setSaving(false);
        }
    };

    const validateYaml = async () => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/navigation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ yaml_content: yamlContent, validate_only: true }),
            });

            const data = await response.json();
            setParsedRoutes(data.routes || []);
            setYamlErrors(data.errors || []);

            if (data.success) {
                setSuccessMessage(`Valid! Found ${data.route_count} routes.`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            setYamlErrors([err instanceof Error ? err.message : "Validation failed"]);
        }
    };

    const saveNavigation = async () => {
        setSaving(true);
        setError(null);
        setYamlErrors([]);

        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/navigation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ yaml_content: yamlContent }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setYamlErrors(data.errors || ["Failed to save navigation"]);
                return;
            }

            setParsedRoutes(data.routes || []);
            setSuccessMessage(`Saved ${data.route_count} navigation routes!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setSaving(false);
        }
    };

    const saveCookies = async () => {
        setSavingCookies(true);
        setError(null);

        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/cookies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filter_domain: formData.auth_domain || undefined }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save cookies");
            }

            setCookieStatus({
                has_cookies: true,
                cookie_count: data.cookie_count,
                cookies_updated: data.cookies_updated,
                auth_domain: data.auth_domain,
            });
            setSuccessMessage(`Saved ${data.cookie_count} cookies!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setSavingCookies(false);
        }
    };

    const clearCookies = async () => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/cookies`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to clear cookies");

            setCookieStatus({
                has_cookies: false,
                cookie_count: 0,
                cookies_updated: null,
                auth_domain: cookieStatus?.auth_domain || null,
            });
            setSuccessMessage("Cookies cleared!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <Loader2 className="mx-auto mb-4 w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600">Loading setup...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/dashboard/websites/${websiteSlug}`}
                    className="flex items-center mb-4 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="mr-1 w-4 h-4" />
                    Back to {config?.website_name || websiteSlug}
                </Link>
                <h1 className="text-3xl font-bold text-gray-950">Website Setup</h1>
                <p className="mt-2 text-gray-700">
                    Configure browser settings, navigation routes, and authentication for <strong>{config?.website_name}</strong>
                </p>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="flex items-center gap-2 p-4 mb-6 text-red-800 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="flex items-center gap-2 p-4 mb-6 text-green-800 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="config" className="space-y-6">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Configuration
                    </TabsTrigger>
                    <TabsTrigger value="navigation" className="flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        Navigation
                    </TabsTrigger>
                    <TabsTrigger value="auth" className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Authentication
                    </TabsTrigger>
                </TabsList>

                {/* Configuration Tab */}
                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Website Configuration</CardTitle>
                            <CardDescription>Set base URLs, portal ID, and voice agent settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* URLs Section */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">
                                        Base URL <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.base_url}
                                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                        placeholder="https://app.example.com"
                                        className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">The base URL for navigation routes</p>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Default Page URL</label>
                                    <input
                                        type="url"
                                        value={formData.default_url}
                                        onChange={(e) => setFormData({ ...formData, default_url: e.target.value })}
                                        placeholder="https://app.example.com/dashboard"
                                        className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Start page after authentication</p>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Portal/Account ID</label>
                                    <input
                                        type="text"
                                        value={formData.portal_id}
                                        onChange={(e) => setFormData({ ...formData, portal_id: e.target.value })}
                                        placeholder="12345"
                                        className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{"Used for {{PORTAL_ID}} in routes"}</p>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Auth Domain</label>
                                    <input
                                        type="text"
                                        value={formData.auth_domain}
                                        onChange={(e) => setFormData({ ...formData, auth_domain: e.target.value })}
                                        placeholder="*.example.com"
                                        className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Cookie domain filter</p>
                                </div>
                            </div>

                            {/* Voice Settings */}
                            <div className="pt-4 border-t">
                                <h3 className="mb-4 text-sm font-semibold text-gray-900">Voice Agent Settings</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">Voice</label>
                                        <select
                                            value={formData.voice_type}
                                            onChange={(e) => setFormData({ ...formData, voice_type: e.target.value })}
                                            className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="alloy">Alloy</option>
                                            <option value="echo">Echo</option>
                                            <option value="fable">Fable</option>
                                            <option value="onyx">Onyx</option>
                                            <option value="nova">Nova</option>
                                            <option value="shimmer">Shimmer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">Model</label>
                                        <select
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="gpt-4o-realtime-preview">GPT-4o Realtime Preview</option>
                                            <option value="gpt-4o-realtime-preview-2025-06-03">GPT-4o Realtime (2025-06-03)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">Default Mode</label>
                                        <select
                                            value={formData.default_mode}
                                            onChange={(e) => setFormData({ ...formData, default_mode: e.target.value })}
                                            className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="screenshot">Screenshot Mode</option>
                                            <option value="live">Live Browser Mode</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={saveConfig} disabled={saving || !formData.base_url}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 w-4 h-4" />
                                            Save Configuration
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Navigation Tab */}
                <TabsContent value="navigation">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* YAML Editor */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Navigation Routes (YAML)</CardTitle>
                                <CardDescription>Define navigation routes for the agent</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Instructions */}
                                <div className="p-3 text-sm text-blue-800 bg-blue-50 rounded-lg">
                                    <p className="font-medium">Format: route_key: /path | Label | Description</p>
                                    <p className="mt-1 text-xs">{"Use {{PORTAL_ID}} for dynamic substitution"}</p>
                                </div>

                                {/* Example Toggle */}
                                <button
                                    onClick={() => setShowExample(!showExample)}
                                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                                >
                                    {showExample ? <ChevronUp className="mr-1 w-4 h-4" /> : <ChevronDown className="mr-1 w-4 h-4" />}
                                    {showExample ? "Hide Example" : "Show Example"}
                                </button>

                                {showExample && (
                                    <div className="p-3 overflow-auto max-h-48 font-mono text-xs text-gray-700 bg-gray-100 rounded-lg">
                                        <pre>{exampleYaml}</pre>
                                    </div>
                                )}

                                {/* YAML Editor */}
                                <textarea
                                    value={yamlContent}
                                    onChange={(e) => setYamlContent(e.target.value)}
                                    placeholder="# Enter your navigation routes here..."
                                    className="p-3 w-full h-80 font-mono text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                {/* Errors */}
                                {yamlErrors.length > 0 && (
                                    <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg">
                                        <p className="font-medium">Validation Errors:</p>
                                        <ul className="mt-1 list-disc list-inside">
                                            {yamlErrors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={validateYaml} disabled={!yamlContent}>
                                        <Eye className="mr-2 w-4 h-4" />
                                        Validate
                                    </Button>
                                    <Button onClick={saveNavigation} disabled={saving || !yamlContent}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 w-4 h-4" />
                                                Save Routes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Route Preview</CardTitle>
                                <CardDescription>{parsedRoutes.length} routes configured</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {parsedRoutes.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <Navigation className="mx-auto mb-2 w-12 h-12 text-gray-300" />
                                        <p>No routes configured yet</p>
                                        <p className="text-sm">Add YAML configuration to see routes</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 overflow-auto max-h-96">
                                        {/* Group by category */}
                                        {Object.entries(
                                            parsedRoutes.reduce((acc, route) => {
                                                const cat = route.category || "General";
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(route);
                                                return acc;
                                            }, {} as Record<string, ParsedRoute[]>)
                                        ).map(([category, routes]) => (
                                            <div key={category}>
                                                <h4 className="mb-2 text-sm font-semibold text-gray-900">{category}</h4>
                                                <div className="space-y-2">
                                                    {routes.map((route) => (
                                                        <div
                                                            key={route.key}
                                                            className="p-2 text-sm bg-gray-50 rounded border border-gray-200"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <code className="font-medium text-blue-600">{route.key}</code>
                                                                <span className="text-gray-600">{route.label}</span>
                                                            </div>
                                                            <div className="mt-1 font-mono text-xs text-gray-500 truncate">
                                                                {route.path}
                                                            </div>
                                                            {route.description && (
                                                                <div className="mt-1 text-xs text-gray-400">{route.description}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Authentication Tab */}
                <TabsContent value="auth">
                    <div className="space-y-6">
                        {/* Cookie Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Cookie Status</CardTitle>
                                <CardDescription>Authentication cookies stored for this website</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {cookieStatus?.has_cookies ? (
                                            <>
                                                <Badge className="bg-green-100 text-green-800">
                                                    <CheckCircle className="mr-1 w-3 h-3" />
                                                    Authenticated
                                                </Badge>
                                                <span className="text-sm text-gray-600">{cookieStatus.cookie_count} cookies stored</span>
                                                {cookieStatus.cookies_updated && (
                                                    <span className="text-sm text-gray-500">
                                                        Updated: {new Date(cookieStatus.cookies_updated).toLocaleString()}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <Badge variant="secondary">
                                                <AlertCircle className="mr-1 w-3 h-3" />
                                                No Cookies
                                            </Badge>
                                        )}
                                    </div>
                                    {cookieStatus?.has_cookies && (
                                        <Button variant="outline" size="sm" onClick={clearCookies}>
                                            <Trash2 className="mr-2 w-4 h-4" />
                                            Clear Cookies
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Browser Viewer - Maximized */}
                        <div className="h-[850px] rounded-xl overflow-hidden shadow-lg">
                            {tabId ? (
                                <LiveBrowserViewer
                                    defaultUrl={formData.default_url || formData.base_url || undefined}
                                    loadHubspotCookies={false}
                                    websiteSlug={websiteSlug}
                                    showSaveCookies={true}
                                    tabId={tabId}
                                    onDebugMessage={(type, msg) => console.log(`[${type}] ${msg}`)}
                                    onCookiesSaved={(count) => {
                                        loadCookieStatus();
                                        setSuccessMessage(`Saved ${count} cookies!`);
                                        setTimeout(() => setSuccessMessage(null), 3000);
                                    }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-gray-100">
                                    <p className="text-gray-500">Initializing browser session...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
