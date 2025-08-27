"use client";

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import createDynamicScreenshotTools from "@/lib/dynamic-screenshot-tools";

interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
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
    agentName?: string;
    websiteName?: string;
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
        agentName = "HubSpot Assistant",
        websiteName = "hubspot",
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
                onDebugMessage("realtime", "🔑 Initializing OpenAI SDK...");

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
                onDebugMessage("realtime", "✅ SDK initialized successfully");
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
            onDebugMessage("realtime", `📝 Using server-side instructions for ${websiteName}`);

            // Create dynamic tools based on available screenshots
            let dynamicTools: any[] = [];

            if (useDynamicConfig && screenshots && screenshots.length > 0) {
                // Use dynamic screenshot tools
                dynamicTools = createDynamicScreenshotTools(screenshots);
                onDebugMessage("realtime", `🛠️ Using dynamic screenshot tools (${dynamicTools.length} tools)`);
            } else {
                // Fallback to basic tools - could add other tools here if needed
                dynamicTools = [];
                onDebugMessage("realtime", `🛠️ Using minimal tools (no dynamic screenshots)`);
            }

            onDebugMessage("realtime", `🤖 Creating agent with ${dynamicTools.length} tools`);

            const hubspotAgent: RealtimeAgent = new RealtimeAgent({
                name: assistantName,
                // Do not pass instructions from client
                voice: "alloy",
                tools: dynamicTools,
            });

            onDebugMessage("realtime", `🎯 Creating session with model: gpt-4o-realtime-preview-2025-06-03`);

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

            // Transport-level diagnostics to help debug silent failures / autoplay
            try {
                (session as any)?.transport?.on?.("*", (evt: any) => {
                    try {
                        const t = typeof evt?.type === "string" ? evt.type : "event";
                        onDebugMessage("realtime", `🛰️ transport: ${t}`);
                    } catch {}
                });
            } catch {}

            session.on("agent_start", () => {
                onDebugMessage("realtime", "🤖 Agent started responding");
            });

            session.on("audio_start", () => {
                onDebugMessage("realtime", "🔊 Audio started");
            });
            session.on("audio", () => {
                onDebugMessage("realtime", "🔈 Audio chunk");
            });
            session.on("audio_stopped", () => {
                onDebugMessage("realtime", "🔇 Audio stopped");
            });

            session.on("agent_end", (_ctx, _agent, output) => {
                if (output) {
                    onDebugMessage("realtime", `🗣️ Assistant: ${safeTruncate(output)}`);
                }
            });

            session.on("agent_tool_start", (_ctx, _agent, tool, details) => {
                const argsStr = (() => {
                    try {
                        return JSON.stringify(details?.toolCall ?? {});
                    } catch {
                        return "";
                    }
                })();
                onDebugMessage("realtime", `🛠️ Tool start: ${tool.name} ${safeTruncate(argsStr, 300)}`);
            });

            session.on("agent_tool_end", (_ctx, _agent, tool, result, details) => {
                const endStr = (() => {
                    try {
                        return result ?? JSON.stringify(details ?? {});
                    } catch {
                        return String(result ?? "");
                    }
                })();
                onDebugMessage("realtime", `✅ Tool end: ${tool.name} → ${safeTruncate(String(endStr), 300)}`);
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
                    } else if (item?.type === "function_call") {
                        onDebugMessage("realtime", `🔧 Tool call: ${item.name}(${safeTruncate(item.arguments || "", 300)})`);
                        if (item.output) {
                            onDebugMessage("realtime", `🔎 Tool result: ${safeTruncate(item.output, 300)}`);
                        }
                    }
                } catch (e) {
                    // Best-effort logging; don't break the UI
                    console.warn("history_added parse error", e);
                }
            });

            onDebugMessage("realtime", "🎤 Voice agent ready - connecting to OpenAI...");

            // Connect with ephemeral token
            onDebugMessage("realtime", `🔑 Connecting with token: ${ephemeralToken.value.substring(0, 10)}...`);
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
            onDebugMessage("realtime", "✅ Connected to OpenAI Realtime API");
            try {
                await audioRef.current?.play();
            } catch {}
            onDebugMessage("realtime", "🎤 Say 'Hello' to start your HubSpot consultation");
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
        onDebugMessage("realtime", next ? "🎙️ Mic muted (input off)" : "🎙️ Mic unmuted (input on)");
    }, [isMuted, onDebugMessage]);

    const handleVoiceToggle = () => {
        if (isConnected) {
            disconnectFromRealtime();
        } else {
            connectToRealtime();
        }
    };

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
