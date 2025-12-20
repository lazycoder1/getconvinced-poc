"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AlertCircle, Play, Square, Loader2, Save, X, Settings } from "lucide-react";
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
    /** Unique tab ID for session isolation (ensures each browser tab gets its own Browserbase session) */
    tabId?: string;
}

type BrowserStatus = "disconnected" | "connecting" | "connected" | "error";

// Session cache helpers - store in sessionStorage to avoid DB calls
interface CachedSession {
    browserbaseSessionId: string;
    debugUrl: string;
    createdAt: number;
}

function getCacheKey(tabId: string): string {
    return `browser_session_${tabId}`;
}

function getCachedSession(tabId: string): CachedSession | null {
    if (typeof window === "undefined") return null;
    try {
        const cached = sessionStorage.getItem(getCacheKey(tabId));
        if (!cached) return null;
        const session = JSON.parse(cached) as CachedSession;
        // Cache expires after 25 minutes (session expires at 30 min)
        if (Date.now() - session.createdAt > 25 * 60 * 1000) {
            sessionStorage.removeItem(getCacheKey(tabId));
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

function setCachedSession(tabId: string, browserbaseSessionId: string, debugUrl: string): void {
    if (typeof window === "undefined") return;
    try {
        const session: CachedSession = {
            browserbaseSessionId,
            debugUrl,
            createdAt: Date.now(),
        };
        sessionStorage.setItem(getCacheKey(tabId), JSON.stringify(session));
    } catch {
        // Ignore storage errors
    }
}

function clearCachedSession(tabId: string): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(getCacheKey(tabId));
    } catch {
        // Ignore storage errors
    }
}

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
    tabId,
}: LiveBrowserViewerProps) {
    const [status, setStatus] = useState<BrowserStatus>("disconnected");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSavingCookies, setIsSavingCookies] = useState(false);
    const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
    const [showToolbar, setShowToolbar] = useState(true);
    const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
    const [showClickOverlay, setShowClickOverlay] = useState(true);

    const onStatusChangeRef = useRef(onStatusChange);
    const onDebugMessageRef = useRef(onDebugMessage);
    const onCookiesSavedRef = useRef(onCookiesSaved);
    const hasNavigatedRef = useRef(false); // Track if we've navigated to defaultUrl

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
            // Helper to navigate to default URL (only once)
            const navigateToDefault = async () => {
                if (defaultUrl && !hasNavigatedRef.current) {
                    hasNavigatedRef.current = true;
                    console.log(`[LiveBrowser] Navigating to: ${defaultUrl}`);
                    await fetch("/api/browser/action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "navigate", url: defaultUrl }),
                    });
                }
            };

            // First check browser cache (no API call needed!)
            if (tabId) {
                const cached = getCachedSession(tabId);
                if (cached) {
                    console.log("[LiveBrowser] Using cached session (no DB call)");
                    setLiveViewUrl(cached.debugUrl);
                    setStatus("connected");
                    // Navigate to default URL
                    await navigateToDefault();
                    return true;
                }
            }

            // Fallback: check API (in-memory session on server)
            const response = await fetch("/api/browser/session");
            if (response.ok) {
                const sessionData = await response.json();

                // Fetch live URL
                const liveResponse = await fetch("/api/browser/live-url");
                if (liveResponse.ok) {
                    const liveData = await liveResponse.json();
                    if (liveData.liveUrl) {
                        console.log("[LiveBrowser] Session connected with live URL");
                        setLiveViewUrl(liveData.liveUrl);
                        setStatus("connected");

                        // Cache the session in browser storage
                        if (tabId && sessionData?.browserbaseSessionId) {
                            setCachedSession(tabId, sessionData.browserbaseSessionId, liveData.liveUrl);
                        }

                        // Navigate to default URL
                        await navigateToDefault();
                        return true;
                    }
                }
                return true;
            }
            return false;
        } catch (err) {
            console.error("[LiveBrowser] Error checking session:", err);
            return false;
        }
    }, [defaultUrl, tabId]);

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
                    // Pass tabId for session isolation
                    tabId,
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

                    // Cache session in browser storage (no DB call needed on refresh)
                    if (tabId && session.browserbaseSessionId) {
                        setCachedSession(tabId, session.browserbaseSessionId, liveData.liveUrl);
                        log(`💾 Session cached in browser`);
                    }
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
    }, [log, updateStatus, defaultUrl, loadHubspotCookies, websiteSlug, tabId]);

    const stopSession = useCallback(async () => {
        setIsLoading(true);
        log("🛑 Stopping browser session...");

        try {
            await fetch("/api/browser/session", { method: "DELETE" });
            log("✅ Session stopped");

            // Clear browser cache
            if (tabId) {
                clearCachedSession(tabId);
            }
        } catch (err) {
            log(`⚠️ Error stopping session: ${err}`);
        } finally {
            setIsLoading(false);
            setLiveViewUrl(null);
            updateStatus("disconnected");
            hasNavigatedRef.current = false; // Reset so next session navigates
        }
    }, [log, updateStatus, tabId]);

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

    // Poll for session until it's ready (handles pre-warm case)
    useEffect(() => {
        // Skip if already connected
        if (status === "connected" && liveViewUrl) {
            return;
        }

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 40; // Try for up to 20 seconds (40 * 500ms)

        const poll = async () => {
            while (!cancelled && attempts < maxAttempts) {
                try {
                    const found = await checkSession();
                    if (found && !cancelled) {
                        return;
                    }
                } catch (err) {
                    // Ignore poll errors, just retry
                }
                attempts++;
                if (!cancelled) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
        };

        poll();

        return () => {
            cancelled = true;
        };
    }, [status, liveViewUrl, checkSession]);

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

    // Waiting for pre-warmed session - Simple loading state
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
