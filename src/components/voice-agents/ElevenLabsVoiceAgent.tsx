"use client";

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { createElevenLabsClientTools } from "@/lib/voice-agent/tools/eleven-labs-tools";
import { getDemoModeManager } from "@/lib/demo-mode";
import type { VoiceAgentHandle, VoiceAgentProps, VoiceAgentStatus, ChatMessage, Screenshot, BrowserConfig } from "@/lib/voice-agent/types";

/**
 * Eleven Labs Voice Agent Component
 *
 * Simplified implementation following the working todo-voice-app pattern.
 * The SDK handles audio capture and playback internally.
 */
const ElevenLabsVoiceAgent = forwardRef<VoiceAgentHandle, VoiceAgentProps>(function ElevenLabsVoiceAgent(
    {
        onDebugMessage,
        screenshots = [],
        browserConfig,
        agentName = "HubSpot Assistant",
        websiteName = "hubspot",
        websiteSlug = "hubspot",
        useDynamicConfig = false,
        hideHeader = false,
        hideControlButton = false,
        onStatusChange,
        onChatMessage,
    }: VoiceAgentProps,
    ref
) {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isHumanSpeaking, setIsHumanSpeaking] = useState(false);
    const humanSpeakingRef = useRef(false);

    // Ensure a stable per-tab browser id exists so Eleven clientTools can route to Railway.
    useEffect(() => {
        try {
            if (typeof window === "undefined") return;
            const existing = sessionStorage.getItem("browserTabId");
            if (existing) return;
            const generated =
                typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
                    ? (crypto as any).randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            sessionStorage.setItem("browserTabId", generated);
        } catch {
            // Ignore storage issues
        }
    }, []);

    // Get agent ID from environment variable directly
    const agentId = process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID;

    // Build client tools - simple inline object like the working implementation
    const clientTools = useDynamicConfig ? createElevenLabsClientTools(websiteSlug, websiteName, screenshots, browserConfig) : {};

    // Eleven Labs conversation hook - EXACTLY like the working implementation
    const conversation = useConversation({
        onDebug: (evt) => {
            try {
                // This is extremely useful for diagnosing why tools are not being called.
                onDebugMessage("tool", `🪲 sdk_debug ${JSON.stringify(evt)}`);
            } catch {}
        },
        onConnect: () => {
            console.log("🟢 Connected to ElevenLabs");
            setIsConnected(true);
            onDebugMessage("realtime", "✅ Connected to Eleven Labs - say 'Hello' to start");

            // Immediately push context: mode + URL/title (best-effort)
            (async () => {
                try {
                    const mode = getDemoModeManager().getMode();
                    let url = "";
                    let title = "";
                    try {
                        // Include tabId for Railway routing
                        const tabId = sessionStorage.getItem("browserTabId");
                        const stateUrl = tabId
                            ? `/api/browser/state?lite=true&tabId=${encodeURIComponent(tabId)}`
                            : "/api/browser/state?lite=true";
                        const res = await fetch(stateUrl);
                        if (res.ok) {
                            const data = await res.json();
                            url = data?.state?.url || "";
                            title = data?.state?.title || "";
                        }
                    } catch {}

                    const msg =
                        `Context update: mode=${mode}` +
                        (url ? ` url=${url}` : "") +
                        (title ? ` title=${title}` : "") +
                        `. If you need to confirm readiness, call browser_check_ready(). ` +
                        `In live mode, always call browser_get_state before clicking/typing.`;
                    if (typeof conversation.sendContextualUpdate === "function") {
                        conversation.sendContextualUpdate(msg);
                    }
                } catch {}
            })();
        },
        onDisconnect: () => {
            console.log("🔴 Disconnected from ElevenLabs");
            setIsConnected(false);
            onDebugMessage("realtime", "👋 Disconnected from voice agent");
        },
        onMessage: (message) => {
            console.log("📨 Message:", message);

            // Handle message object
            if (message && typeof message === "object") {
                const text = (message as any).message;
                const role = (message as any).role;

                if (role === "user" && text) {
                    setTranscript(text);
                    onDebugMessage("realtime", `🧑 You: ${text}`);
                    if (onChatMessage) {
                        onChatMessage({
                            id: crypto.randomUUID(),
                            role: "user",
                            content: text,
                            timestamp: new Date(),
                        });
                    }
                } else if (role === "agent" && text) {
                    onDebugMessage("realtime", `🗣️ Assistant: ${text}`);
                    if (onChatMessage) {
                        onChatMessage({
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: text,
                            timestamp: new Date(),
                        });
                    }
                }
            }
        },
        onError: (error) => {
            console.error("❌ Error:", error);
            setError(`🚨 Error: ${error}`);
            onDebugMessage("error", `🚨 ElevenLabs error: ${error}`);
        },
        onUnhandledClientToolCall: (toolCall) => {
            console.warn("⚠️ Unhandled tool call:", toolCall);
            onDebugMessage("realtime", `⚠️ Unhandled tool call: ${(toolCall as any).tool_name || "unknown"}`);
        },
        onAgentToolRequest: (evt) => {
            try {
                onDebugMessage(
                    "tool",
                    `➡️ tool_request ${(evt as any)?.agent_tool_request?.tool_name || "unknown"} ${
                        (evt as any)?.agent_tool_request?.tool_call_id || ""
                    }`
                );
            } catch {}
        },
        onAgentToolResponse: (evt) => {
            try {
                // Eleven Labs sometimes sends a slightly different shape depending on whether
                // this was a clientTool call vs an MCP tool call. Log the whole payload for clarity.
                const toolName =
                    (evt as any)?.agent_tool_response?.tool_name ||
                    (evt as any)?.agent_tool_response?.name ||
                    (evt as any)?.tool_name ||
                    (evt as any)?.name ||
                    "unknown";
                const toolCallId =
                    (evt as any)?.agent_tool_response?.tool_call_id ||
                    (evt as any)?.agent_tool_response?.tool_callId ||
                    (evt as any)?.tool_call_id ||
                    (evt as any)?.tool_callId ||
                    "";
                onDebugMessage("tool", `⬅️ tool_response ${toolName} ${toolCallId} ${JSON.stringify(evt)}`);
            } catch {}
        },
        onMCPToolCall: (evt) => {
            try {
                onDebugMessage("tool", `🧩 mcp_tool_call ${JSON.stringify(evt)}`);
                // Auto-approve tool calls if the agent/tooling is configured to require approval.
                const toolCallId =
                    (evt as any)?.tool_call_id ||
                    (evt as any)?.mcp_tool_call?.tool_call_id ||
                    (evt as any)?.mcp_tool_call?.id ||
                    (evt as any)?.id;
                if (toolCallId && typeof conversation.sendMCPToolApprovalResult === "function") {
                    conversation.sendMCPToolApprovalResult(toolCallId, true);
                    onDebugMessage("tool", `✅ auto-approved tool_call_id=${toolCallId}`);
                }
            } catch {}
        },
        onMCPConnectionStatus: (evt) => {
            try {
                onDebugMessage("tool", `🧩 mcp_connection_status ${JSON.stringify(evt)}`);
            } catch {}
        },
        clientTools,
    });

    // Detect human speaking from input volume (lights up the "Human" square)
    useEffect(() => {
        if (!isConnected) {
            if (humanSpeakingRef.current) {
                humanSpeakingRef.current = false;
                setIsHumanSpeaking(false);
            }
            return;
        }

        // Hysteresis to avoid flicker
        const THRESHOLD_ON = 0.08;
        const THRESHOLD_OFF = 0.04;

        const interval = setInterval(() => {
            try {
                const v = typeof conversation.getInputVolume === "function" ? conversation.getInputVolume() : 0;
                const speaking = humanSpeakingRef.current;

                if (!speaking && v >= THRESHOLD_ON) {
                    humanSpeakingRef.current = true;
                    setIsHumanSpeaking(true);
                } else if (speaking && v <= THRESHOLD_OFF) {
                    humanSpeakingRef.current = false;
                    setIsHumanSpeaking(false);
                }
            } catch {
                // If anything goes wrong, don't spam logs; just keep indicator off.
            }
        }, 80);

        return () => clearInterval(interval);
    }, [isConnected, conversation]);

    // Start conversation - EXACTLY like the working implementation
    const startConversation = useCallback(async () => {
        if (!agentId) {
            setError("🚨 NEXT_PUBLIC_ELEVEN_AGENT_ID not set in .env");
            onDebugMessage("realtime", "❌ Agent ID not configured");
            return;
        }

        try {
            onDebugMessage("realtime", "🎤 Requesting microphone permission...");
            await navigator.mediaDevices.getUserMedia({ audio: true });
            onDebugMessage("realtime", "✅ Microphone permission granted");

            onDebugMessage("realtime", `🔌 Connecting to agent: ${agentId.substring(0, 8)}...`);

            // Provide stable “product layout” metadata as dynamic variables (per-session),
            // so the Eleven system prompt can reference it (e.g., HubSpot: contacts, deals, etc).
            const navigationRoutes =
                browserConfig?.navigation_routes?.map((r: any) => ({
                    key: r?.key,
                    path: r?.path,
                    description: r?.description,
                })) ?? [];

            await conversation.startSession({
                agentId: agentId,
                connectionType: "webrtc",
                dynamicVariables: {
                    website_slug: websiteSlug,
                    website_name: websiteName,
                    base_url: browserConfig?.base_url || "",
                    // Keep this as JSON string to avoid schema ambiguity inside prompt templating
                    navigation_routes_json: JSON.stringify(navigationRoutes),
                },
            });
        } catch (error: any) {
            console.error("Failed to start conversation:", error);
            setError(`🚨 Failed to connect: ${error.message}`);
            onDebugMessage("realtime", `❌ Connection failed: ${error.message}`);
        }
    }, [agentId, conversation, onDebugMessage, browserConfig?.base_url, browserConfig?.navigation_routes, websiteName, websiteSlug]);

    // Stop conversation
    const stopConversation = useCallback(async () => {
        await conversation.endSession();
    }, [conversation]);

    // Toggle voice
    const handleVoiceToggle = useCallback(() => {
        if (isConnected) {
            stopConversation();
        } else {
            startConversation();
        }
    }, [isConnected, startConversation, stopConversation]);

    // Expose imperative controls to parent
    useImperativeHandle(
        ref,
        () => ({
            start: startConversation,
            stop: stopConversation,
            toggle: handleVoiceToggle,
            sendText: async (text: string) => {
                const trimmed = text.trim();
                if (!trimmed) return;
                try {
                    if (typeof conversation.sendUserMessage === "function") {
                        await conversation.sendUserMessage(trimmed);
                        return;
                    }
                    // Some SDK versions use an object payload
                    if (typeof (conversation as any).sendUserMessage === "function") {
                        await (conversation as any).sendUserMessage({ text: trimmed });
                        return;
                    }
                    onDebugMessage("realtime", "⚠️ sendUserMessage is not available on conversation");
                } catch (e: any) {
                    onDebugMessage("realtime", `❌ Failed to send message: ${e?.message || String(e)}`);
                }
            },
        }),
        [startConversation, stopConversation, handleVoiceToggle]
    );

    // Notify parent of status changes
    useEffect(() => {
        if (onStatusChange) {
            onStatusChange({
                isInitialized: !!agentId,
                isInitializing: false,
                isConnected,
                isConnecting: false,
                isMuted: false,
                isAgentSpeaking: conversation.isSpeaking,
                isHumanSpeaking,
            });
        }
    }, [onStatusChange, agentId, isConnected, conversation.isSpeaking, isHumanSpeaking]);

    // Sync mode changes
    useEffect(() => {
        const manager = getDemoModeManager();
        const unsubscribe = manager.subscribe((newMode) => {
            if (isConnected) {
                onDebugMessage("realtime", `🔄 Mode switched to: ${newMode}`);
                // Push mode update so agent stays grounded
                (async () => {
                    try {
                        let url = "";
                        let title = "";
                        if (newMode === "live") {
                            // Include tabId for Railway routing
                            const tabId = sessionStorage.getItem("browserTabId");
                            const stateUrl = tabId
                                ? `/api/browser/state?lite=true&tabId=${encodeURIComponent(tabId)}`
                                : "/api/browser/state?lite=true";
                            const res = await fetch(stateUrl);
                            if (res.ok) {
                                const data = await res.json();
                                url = data?.state?.url || "";
                                title = data?.state?.title || "";
                            }
                        }
                        const msg =
                            `Context update: mode=${newMode}` +
                            (url ? ` url=${url}` : "") +
                            (title ? ` title=${title}` : "") +
                            `. If live mode seems slow to load, call browser_check_ready({ timeoutMs: 8000 }).`;
                        if (typeof conversation.sendContextualUpdate === "function") {
                            conversation.sendContextualUpdate(msg);
                        }
                    } catch {}
                })();
            }
        });
        return unsubscribe;
    }, [isConnected, onDebugMessage, conversation]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header */}
            {!hideHeader && (
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Mic className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Eleven Labs Voice</h2>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Error */}
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
                            disabled={!agentId}
                            className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all ${
                                isConnected ? "text-white bg-red-500 hover:bg-red-600" : "text-white bg-blue-600 hover:bg-blue-700"
                            } ${!agentId ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isConnected ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            <span>{!agentId ? "Agent ID not configured" : isConnected ? "Stop Voice Agent" : "Start Voice Agent"}</span>
                        </button>
                    )}

                    {/* Status indicator */}
                    {isConnected && (
                        <span className="text-sm text-gray-600">{conversation.isSpeaking ? "🗣️ Speaking..." : "👂 Listening..."}</span>
                    )}

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
                                Say "hello" to begin.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ElevenLabsVoiceAgent;
