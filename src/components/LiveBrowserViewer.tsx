"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Globe, AlertCircle, Play, Square, Loader2, Save, X, Settings } from "lucide-react";
import { HUBSPOT_CONFIG } from "@/lib/browser/hubspot-config";
import type { ClickEvent } from "@/lib/browser";

interface LiveBrowserViewerProps {
    onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "error") => void;
    onDebugMessage?: (type: string, message: string) => void;
    /** Called when cookies are saved */
    onCookiesSaved?: (count: number) => void;
    /** Default URL to navigate to after starting the session */
    defaultUrl?: string;
    /** Whether to load cookies from the server on session start */
    loadHubspotCookies?: boolean;
    /** Website slug for database operations */
    websiteSlug?: string;
    /** Whether to show the save cookies button */
    showSaveCookies?: boolean;
}

type BrowserStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * LiveBrowserViewer - Full-screen Browserbase live browser
 *
 * - Shows overlay with Start button when disconnected
 * - Maximizes browser space when connected
 * - Floating toolbar at top for controls
 */
export default function LiveBrowserViewer({
    onStatusChange,
    onDebugMessage,
    onCookiesSaved,
    defaultUrl = HUBSPOT_CONFIG.DEFAULT_URL,
    loadHubspotCookies = true,
    websiteSlug,
    showSaveCookies = false,
}: LiveBrowserViewerProps) {
    const [status, setStatus] = useState<BrowserStatus>("disconnected");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSavingCookies, setIsSavingCookies] = useState(false);
    const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
    const [showToolbar, setShowToolbar] = useState(true);
    const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
    const [showClickOverlay, setShowClickOverlay] = useState(true);

    const hasCheckedSessionRef = useRef(false);
    const onStatusChangeRef = useRef(onStatusChange);
    const onDebugMessageRef = useRef(onDebugMessage);
    const onCookiesSavedRef = useRef(onCookiesSaved);

    useEffect(() => {
        onStatusChangeRef.current = onStatusChange;
        onDebugMessageRef.current = onDebugMessage;
        onCookiesSavedRef.current = onCookiesSaved;
    });

    const log = useCallback((message: string) => {
        console.log(`[LiveBrowser] ${message}`);
        onDebugMessageRef.current?.("browser", message);
    }, []);

    const updateStatus = useCallback((newStatus: BrowserStatus) => {
        setStatus(newStatus);
        onStatusChangeRef.current?.(newStatus);
    }, []);

    const checkSession = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch("/api/browser/session");
            if (response.ok) {
                const liveResponse = await fetch("/api/browser/live-url");
                if (liveResponse.ok) {
                    const liveData = await liveResponse.json();
                    if (liveData.liveUrl) {
                        setLiveViewUrl(liveData.liveUrl);
                    }
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }, []);

    const startSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setLiveViewUrl(null);
        updateStatus("connecting");
        log("🚀 Starting browser session...");

        try {
            const response = await fetch("/api/browser/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    headless: false,
                    // Prefer DB cookies if available
                    loadFromDb: !!websiteSlug,
                    websiteSlug,
                    // Keep legacy hubspot cookie loading as fallback (won't hurt if file doesn't exist)
                    loadHubspotCookies: loadHubspotCookies,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to start session");
            }

            const session = await response.json();
            log(`✅ Session started: ${session.id}`);

            const liveResponse = await fetch("/api/browser/live-url");
            if (liveResponse.ok) {
                const liveData = await liveResponse.json();
                if (liveData.liveUrl) {
                    setLiveViewUrl(liveData.liveUrl);
                    log(`🖥️ Live browser ready!`);
                } else {
                    throw new Error("Live view not available - Browserbase required");
                }
            } else {
                throw new Error("Could not get live browser URL");
            }

            updateStatus("connected");

            if (defaultUrl) {
                log(`🧭 Navigating to: ${defaultUrl}`);
                await fetch("/api/browser/action", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "navigate", url: defaultUrl }),
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(message);
            updateStatus("error");
            log(`❌ Failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [log, updateStatus, defaultUrl, loadHubspotCookies]);

    const stopSession = useCallback(async () => {
        setIsLoading(true);
        log("🛑 Stopping browser session...");

        try {
            await fetch("/api/browser/session", { method: "DELETE" });
            log("✅ Session stopped");
        } catch (err) {
            log(`⚠️ Error stopping session: ${err}`);
        } finally {
            setIsLoading(false);
            setLiveViewUrl(null);
            updateStatus("disconnected");
        }
    }, [log, updateStatus]);

    const saveCookiesToDb = useCallback(async () => {
        if (status !== "connected" || !websiteSlug) return;

        setIsSavingCookies(true);
        log("🍪 Saving cookies to database...");

        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/cookies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save cookies");
            }

            log(`✅ Saved ${data.cookie_count} cookies`);
            onCookiesSavedRef.current?.(data.cookie_count);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            log(`❌ Failed to save cookies: ${message}`);
            setError(message);
        } finally {
            setIsSavingCookies(false);
        }
    }, [status, websiteSlug, log]);

    useEffect(() => {
        if (hasCheckedSessionRef.current) return;
        hasCheckedSessionRef.current = true;

        checkSession().then((hasSession) => {
            if (hasSession) {
                updateStatus("connected");
            }
        });
    }, [checkSession, updateStatus]);

    // Poll for click events when connected
    useEffect(() => {
        if (status !== "connected" || !showClickOverlay) return;

        let lastTimestamp = Date.now();
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/browser/clicks?since=${lastTimestamp}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.clicks && data.clicks.length > 0) {
                        setClickEvents((prev) => {
                            const newClicks = data.clicks.filter((c: ClickEvent) => !prev.some((p) => p.timestamp === c.timestamp));
                            return [...prev, ...newClicks].slice(-20); // Keep last 20
                        });
                        lastTimestamp = Math.max(...data.clicks.map((c: ClickEvent) => c.timestamp));
                    }
                }
            } catch (err) {
                // Silently fail - clicks are not critical
            }
        }, 200); // Poll every 200ms

        // Clean up old click events (older than 3 seconds)
        const cleanupInterval = setInterval(() => {
            setClickEvents((prev) => prev.filter((c) => Date.now() - c.timestamp < 3000));
        }, 500);

        return () => {
            clearInterval(pollInterval);
            clearInterval(cleanupInterval);
        };
    }, [status, showClickOverlay]);

    // Connected state - Full browser with floating toolbar
    if (status === "connected" && liveViewUrl) {
        return (
            <div className="relative w-full h-full bg-gray-900">
                {/* Full-screen iframe */}
                <iframe
                    src={liveViewUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="clipboard-read; clipboard-write"
                    title="Live Browser Session"
                />

                {/* Click Overlay */}
                {showClickOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        {clickEvents.map((click, index) => {
                            // Fade out clicks after 2 seconds
                            const age = Date.now() - click.timestamp;
                            const opacity = Math.max(0, 1 - age / 2000);

                            if (opacity <= 0) return null;

                            return (
                                <div
                                    key={`${click.timestamp}-${index}`}
                                    className="absolute"
                                    style={{
                                        left: `${click.x}px`,
                                        top: `${click.y}px`,
                                        transform: "translate(-50%, -50%)",
                                        opacity,
                                        transition: "opacity 0.1s",
                                    }}
                                >
                                    {/* Ripple effect */}
                                    <div className="relative w-8 h-8">
                                        <div
                                            className="absolute inset-0 rounded-full border-4 border-blue-500 bg-blue-500/20"
                                            style={{
                                                animation: "clickRipple 0.6s ease-out forwards",
                                            }}
                                        />
                                        <div className="absolute inset-0 rounded-full bg-blue-500/40" />
                                        <div className="absolute inset-2 rounded-full bg-blue-500" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Floating toolbar */}
                {showToolbar && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-700 z-10">
                        <div className="flex items-center gap-2 pr-3 border-r border-gray-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-white">Live</span>
                        </div>

                        {/* Save Cookies */}
                        {showSaveCookies && websiteSlug && (
                            <button
                                onClick={saveCookiesToDb}
                                disabled={isSavingCookies}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSavingCookies ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Cookies
                            </button>
                        )}

                        {/* Stop */}
                        <button
                            onClick={stopSession}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Square className="w-4 h-4" />
                            Stop
                        </button>

                        {/* Toggle Click Overlay */}
                        <button
                            onClick={() => setShowClickOverlay(!showClickOverlay)}
                            className={`p-1.5 transition-colors ${showClickOverlay ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
                            title={showClickOverlay ? "Hide click overlay" : "Show click overlay"}
                        >
                            <div className="relative w-4 h-4">
                                <div className="absolute inset-0 rounded-full border-2 border-current" />
                                <div className="absolute inset-1 rounded-full bg-current opacity-50" />
                            </div>
                        </button>

                        {/* Hide toolbar */}
                        <button
                            onClick={() => setShowToolbar(false)}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors"
                            title="Hide toolbar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Show toolbar button (when hidden) */}
                {!showToolbar && (
                    <button
                        onClick={() => setShowToolbar(true)}
                        className="absolute top-3 right-3 p-2 bg-gray-900/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-700 text-gray-400 hover:text-white transition-colors z-10"
                        title="Show controls"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}
            </div>
        );
    }

    // Connecting state - Loading overlay
    if (status === "connecting") {
        return (
            <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                    <h2 className="text-2xl font-semibold text-white mb-2">Starting Browser</h2>
                    <p className="text-gray-400">Connecting to Browserbase...</p>
                </div>
            </div>
        );
    }

    // Error state - Error overlay with retry
    if (status === "error") {
        return (
            <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                    <h2 className="text-2xl font-semibold text-white mb-2">Connection Error</h2>
                    <p className="text-gray-400 text-center max-w-md mb-6">{error}</p>
                    <button
                        onClick={startSession}
                        className="flex items-center gap-2 px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Play className="w-5 h-5" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Disconnected state - Start overlay
    return (
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Globe className="w-20 h-20 text-gray-600 mb-8" />

                <h2 className="text-3xl font-bold text-white mb-3">Live Browser</h2>
                <p className="text-gray-400 text-center max-w-md mb-8">
                    Launch an interactive browser session to log in and capture authentication cookies.
                </p>

                {/* Instructions */}
                <div className="flex items-center gap-6 mb-10 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="flex items-center justify-center w-6 h-6 bg-gray-700 rounded-full text-xs font-bold">1</span>
                        Start Browser
                    </div>
                    <div className="w-8 h-px bg-gray-700" />
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="flex items-center justify-center w-6 h-6 bg-gray-700 rounded-full text-xs font-bold">2</span>
                        Log In
                    </div>
                    <div className="w-8 h-px bg-gray-700" />
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="flex items-center justify-center w-6 h-6 bg-gray-700 rounded-full text-xs font-bold">3</span>
                        Save Cookies
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={startSession}
                    disabled={isLoading}
                    className="flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                    Start Browser
                </button>

                {defaultUrl && (
                    <p className="mt-4 text-sm text-gray-500">
                        Will navigate to: <span className="text-gray-400">{defaultUrl}</span>
                    </p>
                )}
            </div>
        </div>
    );
}
