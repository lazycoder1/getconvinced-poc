"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RealtimeVoiceAgent from "@/components/RealtimeVoiceAgent";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Home, X } from "lucide-react";

interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
}

interface AgentConfig {
    system_prompt?: string;
    screenshots: Screenshot[];
    voice_config: {
        voice: string;
        model: string;
    };
    timestamp: string;
}

// Minimal fallback prompts - only used as absolute last resort
const MINIMAL_FALLBACK_PROMPTS: Record<string, string> = {
    hubspot: `You are a helpful AI assistant for HubSpot CRM. Guide users through HubSpot features and provide helpful CRM assistance.`,
    salesforce: `You are a helpful AI assistant for Salesforce CRM. Guide users through Salesforce features and provide helpful CRM assistance.`,
    default: `You are a helpful AI assistant. Guide users through software applications and provide helpful assistance.`,
};

// Get minimal fallback prompt - only use if everything else fails
const getMinimalFallbackPrompt = (websiteSlug: string): string => {
    return MINIMAL_FALLBACK_PROMPTS[websiteSlug] || MINIMAL_FALLBACK_PROMPTS.default;
};

function AgentDemoPageContent() {
    const searchParams = useSearchParams();
    const websiteSlug = searchParams.get("website") || "hubspot";

    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playwrightStatus, setPlaywrightStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [debugMessages, setDebugMessages] = useState<Array<{ source: string; message: string; timestamp: Date }>>([]);
    const [activeScreenshot, setActiveScreenshot] = useState<Screenshot | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const loadConfiguration = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch agent configuration
                const agentConfigResponse = await fetch(`/api/agent/config/${websiteSlug}`);
                if (!agentConfigResponse.ok) {
                    throw new Error(`Failed to fetch agent config: ${agentConfigResponse.statusText}`);
                }
                const agentConfigData = await agentConfigResponse.json();

                // Use the prompt from the API (which should come from the database)
                const apiPrompt = agentConfigData.system_prompt;

                if (apiPrompt && apiPrompt.trim().length > 0) {
                    setDebugMessages((prev) => [
                        ...prev,
                        {
                            source: "system",
                            message: `✅ Database prompt loaded successfully (${apiPrompt.length} characters)`,
                            timestamp: new Date(),
                        },
                    ]);
                } else {
                    setDebugMessages((prev) => [
                        ...prev,
                        {
                            source: "system",
                            message: `⚠️ WARNING: API returned empty prompt! Check if database has prompts for "${websiteSlug}"`,
                            timestamp: new Date(),
                        },
                    ]);
                }

                // Ensure we have a valid prompt, otherwise use minimal fallback
                if (!apiPrompt || !apiPrompt.trim().length) {
                    const fallbackPrompt = getMinimalFallbackPrompt(websiteSlug);
                    agentConfigData.system_prompt = fallbackPrompt;

                    setDebugMessages((prev) => [
                        ...prev,
                        {
                            source: "system",
                            message: `🔧 Using minimal fallback prompt since API returned empty prompt`,
                            timestamp: new Date(),
                        },
                    ]);
                }

                setAgentConfig(agentConfigData);

                // Set first screenshot as active by default
                if (agentConfigData.screenshots && agentConfigData.screenshots.length > 0) {
                    setActiveScreenshot(agentConfigData.screenshots[0]);
                }
            } catch (err: any) {
                console.error("Error loading configuration:", err);

                // Provide minimal fallback configuration - API completely failed
                const fallbackPrompt = getMinimalFallbackPrompt(websiteSlug);
                const fallbackConfig = {
                    system_prompt: fallbackPrompt,
                    screenshots: [],
                    voice_config: {
                        voice: "alloy",
                        model: "gpt-4o-realtime-preview-2025-06-03",
                    },
                    timestamp: new Date().toISOString(),
                };

                setAgentConfig(fallbackConfig);

                // Log that we're using minimal fallback configuration
                setDebugMessages((prev) => [
                    ...prev,
                    {
                        source: "system",
                        message: `⚠️ API FAILED: Using minimal fallback prompt. Database may be empty or unreachable. Error: ${err.message}`,
                        timestamp: new Date(),
                    },
                ]);

                setError(`Using default configuration due to API error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadConfiguration();
    }, [websiteSlug]);

    const handleDebugMessage = (source: string, message: string) => {
        setDebugMessages((prev) => [...prev, { source, message, timestamp: new Date() }]);

        // Check if the message indicates a screenshot should be shown
        if (message.toLowerCase().includes("screenshot") || message.toLowerCase().includes("show")) {
            // Try to find a screenshot that matches the message
            if (agentConfig?.screenshots) {
                const matchingScreenshot = agentConfig.screenshots.find(
                    (screenshot) =>
                        message.toLowerCase().includes(screenshot.filename.toLowerCase()) ||
                        message.toLowerCase().includes(screenshot.description?.toLowerCase() || "") ||
                        (screenshot.annotation && message.toLowerCase().includes(screenshot.annotation.toLowerCase()))
                );

                if (matchingScreenshot) {
                    setActiveScreenshot(matchingScreenshot);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <Loader2 className="mx-auto mb-4 w-12 h-12 text-blue-600 animate-spin" />
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">Loading Agent Demo</h2>
                    <p className="text-gray-600">Preparing {websiteSlug} assistant...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="mb-4 text-6xl text-red-500">⚠️</div>
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">Configuration Error</h2>
                    <p className="mb-4 text-gray-600">{error}</p>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                        <a href="/dashboard" className="px-4 py-2 text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700">
                            Go to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Main Content */}
            <div className="flex flex-col flex-1">
                {/* Simple Header */}
                <div className="px-6 py-4 bg-white border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{websiteSlug} Voice Assistant</h1>
                            <p className="text-sm text-gray-600">AI-powered visual guidance</p>
                        </div>
                        <a
                            href="/"
                            className="flex items-center px-3 py-2 text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                        >
                            <Home className="mr-2 w-4 h-4" />
                            Home
                        </a>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col flex-1 p-6 space-y-6">
                    {/* Concept demo notice */}
                    <div className="p-3 text-sm text-yellow-900 bg-yellow-50 rounded-lg border border-yellow-200">
                        <strong>Concept demo:</strong> This is an early prototype for evaluation only and not the final product.
                        Performance, features, and behavior may change. For now, you can ask only about HubSpot Contacts.
                    </div>
                    {/* Screenshot Area - Larger */}
                    <div className="h-[600px]">
                        {activeScreenshot ? (
                            <div className="flex overflow-hidden justify-center items-center h-full bg-white rounded-lg border border-gray-200 shadow-sm">
                                {/* Screenshot Image - Contain within frame without cropping */}
                                <img
                                    src={activeScreenshot.s3_url}
                                    alt={activeScreenshot.filename}
                                    className="object-contain w-full h-full rounded-lg"
                                />
                            </div>
                        ) : (
                            <div className="flex justify-center items-center h-full bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-center text-gray-500">
                                    <div className="mb-4 text-4xl">📱</div>
                                    <h3 className="mb-2 text-lg font-semibold">No Screenshot Active</h3>
                                    <p>Start the voice agent to see visual guidance</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Voice Controls Below Screenshot */}
                    <div className="flex justify-center">
                        <div className="w-full max-w-sm">
                            <RealtimeVoiceAgent
                                playwrightStatus={playwrightStatus}
                                onDebugMessage={handleDebugMessage}
                                systemPrompt={agentConfig?.system_prompt}
                                screenshots={agentConfig?.screenshots}
                                agentName={`${websiteSlug} Assistant`}
                                websiteName={websiteSlug}
                                useDynamicConfig={true}
                            />
                        </div>
                    </div>

                    {/* Feedback box */}
                    <div className="max-w-xl mx-auto w-full">
                        <form
                            className="space-y-2"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget as HTMLFormElement;
                                const textarea = form.elements.namedItem("feedback") as HTMLTextAreaElement;
                                const value = textarea?.value.trim();
                                if (!value) return;
                                try {
                                    const res = await fetch("/api/feedback", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ feedback: value }),
                                    });
                                    if (res.ok) {
                                        textarea.value = "";
                                        alert("Thanks for your feedback!");
                                    } else {
                                        alert("Failed to submit feedback. Please try again later.");
                                    }
                                } catch {
                                    alert("Failed to submit feedback. Please try again later.");
                                }
                            }}
                        >
                            <label className="block text-sm font-medium text-gray-700">Quick feedback</label>
                            <textarea
                                name="feedback"
                                rows={3}
                                placeholder="Share your thoughts about this concept demo..."
                                className="block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end">
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md text-sm hover:bg-blue-700">
                                    Submit feedback
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Collapsible Debug Panel */}
            <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${sidebarCollapsed ? "w-12" : "w-80"}`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200">
                    {sidebarCollapsed ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(false)}
                            className="w-full text-gray-800 border border-gray-300 hover:bg-gray-100 hover:text-black"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                    ) : (
                        <div className="flex justify-between items-center">
                            <h2 className="font-semibold text-gray-900">Debug Panel</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarCollapsed(true)}
                                className="text-gray-800 border border-gray-300 hover:bg-red-50 hover:text-red-600"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Debug Content */}
                {!sidebarCollapsed && (
                    <div className="p-4 h-full">
                        {/* Debug Messages */}
                        {debugMessages.length > 0 ? (
                            <div className="h-full">
                                <h4 className="mb-2 font-medium text-gray-900">Recent Activity</h4>
                                <div className="overflow-y-auto space-y-2 max-h-full">
                                    {debugMessages.slice(-10).map((msg, index) => (
                                        <div key={index} className="p-2 text-xs bg-gray-100 rounded">
                                            <span className="text-gray-500">[{msg.timestamp.toLocaleTimeString()}]</span>
                                            <span className="text-blue-600"> {msg.source}:</span>
                                            <span className="text-gray-700"> {msg.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center items-center h-full text-gray-500">
                                <div className="text-center">
                                    <MessageSquare className="mx-auto mb-2 w-8 h-8" />
                                    <p className="text-sm">No debug messages yet</p>
                                    <p className="text-xs">Start the voice agent to see activity</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AgentDemoPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center items-center min-h-screen">
                    <div className="text-center">
                        <Loader2 className="mx-auto mb-4 w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-gray-600">Loading agent demo...</p>
                    </div>
                </div>
            }
        >
            <AgentDemoPageContent />
        </Suspense>
    );
}
