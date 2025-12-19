"use client";

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import createDynamicScreenshotTools from "@/lib/dynamic-screenshot-tools";
import { createDynamicBrowserTools } from "@/lib/browser-tools";
import { getDemoModeManager } from "@/lib/demo-mode";

interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
}

interface BrowserConfig {
    navigation_routes: any[];
    base_url: string;
    default_url?: string;
}

export interface RealtimeVoiceAgentHandle {
    start: () => void;
    stop: () => void;
    toggle: () => void;
}

interface RealtimeVoiceAgentProps {
    playwrightStatus: "disconnected" | "connecting" | "connected";
    onDebugMessage: (source: string, message: string) => void;
    // Optional dynamic configuration
    systemPrompt?: string; // Deprecated: instructions are now set server-side
    screenshots?: Screenshot[];
    browserConfig?: BrowserConfig;
    agentName?: string;
    websiteName?: string;
    websiteSlug?: string;
    // If true, use dynamic config; if false, use original hardcoded logic
    useDynamicConfig?: boolean;
    // If true, hide the header (title and status indicator)
    hideHeader?: boolean;
    // If true, hide the internal start/stop control button
    hideControlButton?: boolean;
    // Observe status changes for parent-controlled UI
    onStatusChange?: (status: {
        isInitialized: boolean;
        isInitializing: boolean;
        isConnected: boolean;
        isConnecting: boolean;
        isMuted: boolean;
    }) => void;
}

const RealtimeVoiceAgent = forwardRef<RealtimeVoiceAgentHandle, RealtimeVoiceAgentProps>(function RealtimeVoiceAgent(
    {
        playwrightStatus,
        onDebugMessage,
        systemPrompt,
        screenshots = [],
        browserConfig,
        agentName = "HubSpot Assistant",
        websiteName = "hubspot",
        websiteSlug = "hubspot",
        useDynamicConfig = false,
        hideHeader = false,
        hideControlButton = false,
        onStatusChange,
    }: RealtimeVoiceAgentProps,
    ref
) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [ephemeralToken, setEphemeralToken] = useState<{ value: string } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

    const sessionRef = useRef<RealtimeSession | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize SDK and fetch ephemeral token when component mounts
    useEffect(() => {
        const initializeSDK = async () => {
            // Prevent multiple initializations
            if (isInitializing || isInitialized) {
                return;
            }

            setIsInitializing(true);

            try {
                // SDK initialization - silent unless error

                // Generate ephemeral token
                const qs = new URLSearchParams();
                if (websiteName) qs.set("website", websiteName.toLowerCase());
                const tokenResponse = await fetch(`/api/realtime-token?${qs.toString()}`);

                if (!tokenResponse.ok) {
                    throw new Error(`Failed to generate ephemeral token: ${tokenResponse.status} ${tokenResponse.statusText}`);
                }

                const tokenData = await tokenResponse.json();

                if (!tokenData.client_secret || !tokenData.client_secret.value) {
                    throw new Error("Invalid token response: missing client_secret.value");
                }

                setEphemeralToken(tokenData.client_secret);
                setIsInitialized(true);
                // SDK initialized - no log needed
            } catch (error: any) {
                console.error("RealtimeVoiceAgent initialization error:", error);
                setError(`🚨 SDK initialization failed: ${error.message}`);
                onDebugMessage("realtime", `❌ SDK initialization failed: ${error.message}`);
            } finally {
                setIsInitializing(false);
            }
        };

        initializeSDK();
    }, []); // Empty dependency array - only run once on mount

    const connectToRealtime = useCallback(async () => {
        if (!ephemeralToken || !isInitialized) {
            setError("🚨 SDK not initialized yet. Please wait...");
            onDebugMessage("realtime", `🚨 SDK not ready - token: ${!!ephemeralToken}, initialized: ${isInitialized}`);
            return;
        }
        setIsConnecting(true);
        setError(null);
        onDebugMessage("realtime", "🔌 Connecting to OpenAI Realtime API...");

        try {
            let assistantName: string = agentName;

            // Do not send instructions from client; rely on server-configured session instructions
            // Skip logging server-side instructions - we know we're using them

            // Create dynamic tools based on available screenshots and browser config
            let dynamicTools: any[] = [];
            let screenshotCount = 0;
            let browserToolCount = 0;

            if (useDynamicConfig) {
                // 1. Add screenshot tools if available
                if (screenshots && screenshots.length > 0) {
                    const screenshotTools = createDynamicScreenshotTools(screenshots);
                    dynamicTools.push(...screenshotTools);
                    screenshotCount = screenshotTools.length;
                }

                // 2. Add browser tools if config available
                if (browserConfig && browserConfig.navigation_routes) {
                    const browserTools = createDynamicBrowserTools(
                        websiteSlug,
                        websiteName,
                        browserConfig.navigation_routes,
                        browserConfig.base_url
                    );
                    dynamicTools.push(...browserTools);
                    browserToolCount = browserTools.length;
                }
            }

            // Single consolidated log for tool registration
            onDebugMessage(
                "realtime",
                `🛠️ Tools: ${dynamicTools.length} total (${browserToolCount} browser, ${screenshotCount} screenshot)`
            );

            const hubspotAgent: RealtimeAgent = new RealtimeAgent({
                name: assistantName,
                // Do not pass instructions from client
                voice: "alloy",
                tools: dynamicTools,
            });

            // Session creation logged below after connect

            // Create session with the agent
            const session = new RealtimeSession(hubspotAgent, {
                model: "gpt-4o-realtime-preview-2025-06-03",
            });
            sessionRef.current = session;

            // If available, provide an explicit audio element to the transport to avoid autoplay issues
            try {
                const transportAny: any = (session as any).transport;
                if (transportAny && audioRef.current) {
                    transportAny.options = transportAny.options || {};
                    transportAny.options.audioElement = audioRef.current;
                }
            } catch {}

            // Hook up logging for inputs, outputs, and tool calls
            const safeTruncate = (value: string, max = 400) => (value.length > max ? value.slice(0, max) + "…" : value);

            // Transport-level diagnostics - only log errors (skip all the noisy session/audio events)
            try {
                (session as any)?.transport?.on?.("*", (evt: any) => {
                    try {
                        const t = typeof evt?.type === "string" ? evt.type : "event";
                        // Only log actual errors, skip all other transport noise
                        if (t.includes("error")) {
                            onDebugMessage("error", `🚨 Transport error: ${t}`);
                        }
                    } catch {}
                });
            } catch {}

            // Skip logging agent_start - it's noisy and we see tool calls anyway
            // session.on("agent_start", () => { });

            // Skip audio_start - noisy
            // session.on("audio_start", () => { });
            // Skip logging individual audio chunks - too noisy
            // session.on("audio", () => { });
            // Skip audio_stopped - noisy, we see the transcript anyway
            // session.on("audio_stopped", () => { });

            session.on("agent_end", (_ctx, _agent, output) => {
                if (output) {
                    onDebugMessage("realtime", `🗣️ Assistant: ${safeTruncate(output)}`);
                }
            });

            session.on("agent_tool_start", (_ctx, _agent, tool, details) => {
                const argsStr = (() => {
                    try {
                        const args = details?.toolCall ?? {};
                        return JSON.stringify(args, null, 0);
                    } catch {
                        return "";
                    }
                })();
                // More prominent tool logging
                onDebugMessage("realtime", `🔧 TOOL CALL: ${tool.name}`);
                if (argsStr && argsStr !== "{}") {
                    onDebugMessage("realtime", `   📥 Args: ${argsStr}`);
                }
            });

            session.on("agent_tool_end", (_ctx, _agent, tool, result, details) => {
                const resultStr = (() => {
                    try {
                        // Try to parse the result if it's a string
                        const parsed = typeof result === "string" ? JSON.parse(result) : result;
                        // Show success/error status prominently
                        if (parsed?.success === false) {
                            return `❌ FAILED: ${parsed.error || JSON.stringify(parsed)}`;
                        }
                        // For successful results, show key info
                        if (parsed?.url) {
                            return `✅ → ${parsed.url}`;
                        }
                        if (parsed?.stats) {
                            return `✅ ${parsed.stats}`;
                        }
                        if (parsed?.message) {
                            return `✅ ${parsed.message}`;
                        }
                        return `✅ ${JSON.stringify(parsed).slice(0, 200)}`;
                    } catch {
                        return String(result ?? "").slice(0, 200);
                    }
                })();
                onDebugMessage("realtime", `   📤 Result: ${resultStr}`);
            });

            session.on("tool_approval_requested", (_ctx, _agent, approval) => {
                try {
                    const summary = `${approval.tool.name}`;
                    onDebugMessage("realtime", `📝 Tool approval requested: ${summary}`);
                } catch {
                    onDebugMessage("realtime", "📝 Tool approval requested");
                }
            });

            session.on("error", (err: any) => {
                try {
                    const msg = typeof err?.error === "string" ? err.error : JSON.stringify(err?.error ?? err);
                    onDebugMessage("realtime", `⚠️ Realtime error: ${safeTruncate(msg, 300)}`);
                } catch {
                    onDebugMessage("realtime", "⚠️ Realtime error");
                }
            });

            session.on("history_added", (item: any) => {
                try {
                    if (item?.type === "message") {
                        if (item.role === "user") {
                            const text = (item.content || [])
                                .map((c: any) => {
                                    if (c.type === "input_text") return c.text;
                                    if (c.type === "input_audio") return c.transcript || "";
                                    return "";
                                })
                                .filter(Boolean)
                                .join(" ");
                            if (text) {
                                setTranscript(text);
                                onDebugMessage("realtime", `🧑 You: ${safeTruncate(text)}`);
                            }
                        } else if (item.role === "assistant") {
                            const text = (item.content || [])
                                .map((c: any) => {
                                    if (c.type === "text") return c.text;
                                    if (c.type === "audio") return c.transcript || "";
                                    return "";
                                })
                                .filter(Boolean)
                                .join(" ");
                            if (text) {
                                onDebugMessage("realtime", `🗣️ Assistant: ${safeTruncate(text)}`);
                            }
                        }
                        // Skip function_call logging here - we log via agent_tool_start/end with more detail
                    }
                } catch (e) {
                    // Best-effort logging; don't break the UI
                    console.warn("history_added parse error", e);
                }
            });

            // Connect with ephemeral token
            await session.connect({
                apiKey: ephemeralToken.value,
                // @ts-expect-error: initialSessionConfig is passed through to the transport layer
                initialSessionConfig: {
                    modalities: ["text", "audio"],
                    voice: "alloy",
                    turn_detection: {
                        type: "server_vad",
                        // Reasonable defaults to detect end-of-speech reliably
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 600,
                    },
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                },
            });

            // Connection successful
            setIsConnected(true);
            setIsConnecting(false);
            onDebugMessage("realtime", "✅ Connected - say 'Hello' to start");
            try {
                await audioRef.current?.play();
            } catch {}
            // Apply current mic state (mute if requested) without stopping agent output
            try {
                sessionRef.current?.mute(isMuted);
            } catch {}
        } catch (error: any) {
            setError(`🚨 Connection failed: ${error.message}`);
            onDebugMessage("realtime", `❌ Connection failed: ${error.message}`);
            setIsConnecting(false);
        }
    }, [ephemeralToken, isInitialized, onDebugMessage]);

    const disconnectFromRealtime = useCallback(async () => {
        if (sessionRef.current) {
            try {
                await sessionRef.current.close();
                onDebugMessage("realtime", "👋 Disconnected from voice agent");
            } catch (error: any) {
                console.error("Error disconnecting:", error);
                setError(`🚨 Failed to disconnect: ${error.message}`);
            } finally {
                sessionRef.current = null;
                setIsConnected(false);
            }
        }
    }, [onDebugMessage]);

    const toggleMute = useCallback(() => {
        const next = !isMuted;
        setIsMuted(next);
        try {
            sessionRef.current?.mute(next);
        } catch {}
        // Skip mic mute logging - UI already shows state
    }, [isMuted, onDebugMessage]);

    const handleVoiceToggle = () => {
        if (isConnected) {
            disconnectFromRealtime();
        } else {
            connectToRealtime();
        }
    };

    // Sync mode changes to the agent session
    useEffect(() => {
        const manager = getDemoModeManager();
        const unsubscribe = manager.subscribe((newMode) => {
            if (isConnected && sessionRef.current) {
                onDebugMessage("realtime", `🔄 Mode switched to: ${newMode}`);

                // Fetch the new prompt for this mode to update session instructions if possible
                // For now, we'll send a system message to the agent to notify it of the mode change
                // This ensures the agent is aware of the change in its conversation history
                try {
                    // @ts-ignore - session.send is used to send control events
                    sessionRef.current.send("conversation.item.create", {
                        item: {
                            type: "message",
                            role: "system",
                            content: [
                                {
                                    type: "input_text",
                                    text: `CRITICAL: Mode has switched to ${newMode.toUpperCase()}. You must now follow the ${newMode.toUpperCase()} mode instructions from your system prompt.`,
                                },
                            ],
                        },
                    });

                    // Trigger a response from the agent if they were in the middle of something
                    // @ts-ignore
                    sessionRef.current.send("response.create");
                } catch (e) {
                    console.warn("Failed to notify agent of mode switch", e);
                }
            }
        });
        return unsubscribe;
    }, [isConnected, onDebugMessage]);

    // Expose imperative controls to parent
    useImperativeHandle(
        ref,
        () => ({
            start: () => {
                if (!isConnected) {
                    connectToRealtime();
                }
            },
            stop: () => {
                if (isConnected) {
                    disconnectFromRealtime();
                }
            },
            toggle: () => {
                handleVoiceToggle();
            },
        }),
        [isConnected, connectToRealtime, disconnectFromRealtime]
    );

    // Notify parent of status changes
    useEffect(() => {
        if (onStatusChange) {
            onStatusChange({
                isInitialized,
                isInitializing,
                isConnected,
                isConnecting,
                isMuted,
            });
        }
    }, [onStatusChange, isInitialized, isInitializing, isConnected, isConnecting, isMuted]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header - conditionally rendered */}
            {!hideHeader && (
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Mic className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Realtime Voice</h2>
                        </div>
                        <div
                            className={`w-2 h-2 rounded-full ${
                                isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-gray-400"
                            }`}
                        />
                    </div>

                    {/* Audio controls */}
                    {isConnected && (
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded-lg transition-colors ${
                                isMuted ? "text-red-600 bg-red-100" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                            }`}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Errors Only */}
                {error && (
                    <div className="p-3 mb-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Voice Control */}
                <div className="flex flex-col items-center space-y-4">
                    {!hideControlButton && (
                        <button
                            onClick={handleVoiceToggle}
                            disabled={isConnecting || !isInitialized}
                            className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all ${
                                isConnected
                                    ? "text-white bg-red-500 hover:bg-red-600"
                                    : isConnecting
                                    ? "text-white bg-yellow-500 cursor-not-allowed"
                                    : "text-white bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {isConnecting ? (
                                <div className="w-5 h-5 rounded-full border-2 border-white animate-spin border-t-transparent" />
                            ) : isConnected ? (
                                <MicOff className="w-5 h-5" />
                            ) : (
                                <Mic className="w-5 h-5" />
                            )}
                            <span>
                                {!isInitialized
                                    ? "Initializing..."
                                    : isConnecting
                                    ? "Connecting..."
                                    : isConnected
                                    ? "Stop Voice Agent"
                                    : "Start Voice Agent"}
                            </span>
                        </button>
                    )}

                    {/* Hidden audio element for explicit playback */}
                    <audio ref={audioRef} className="hidden" autoPlay />

                    {/* Live transcript */}
                    {transcript && (
                        <div className="p-3 w-full bg-gray-50 rounded-lg">
                            <p className="mb-1 text-sm font-medium text-gray-600">You said:</p>
                            <p className="text-sm text-gray-900">"{transcript}"</p>
                        </div>
                    )}

                    {/* Instructions */}
                    {isConnected && (
                        <div className="p-3 w-full bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800">
                                🎤 <strong>Voice agent is listening.</strong>
                                <br />
                                Say "hello" to begin. For this concept demo, ask only about HubSpot Contacts.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default RealtimeVoiceAgent;
