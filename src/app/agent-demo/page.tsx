"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VoiceAgent from "@/components/VoiceAgent";
import { VoiceAgentProvider } from "@/lib/voice-agent/VoiceAgentProvider";
import type { VoiceAgentHandle } from "@/lib/voice-agent/types";
import { Button } from "@/components/ui/button";
import LiveBrowserViewer from "@/components/LiveBrowserViewer";
import SpeakingIndicator from "@/components/SpeakingIndicator";
import ChatPanel from "@/components/ChatPanel";
import { getDemoModeManager, type DemoMode } from "@/lib/demo-mode";
import { getScreenshotManager } from "@/lib/screenshot-manager";
import {
    Loader2,
    MessageSquare,
    Home,
    X,
    Mic,
    Image,
    Brain,
    Clock,
    Languages,
    Palette,
    Shield,
    Users,
    Headphones,
    PlayCircle,
    GraduationCap,
    Globe,
    FileText,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

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
    browser_config?: {
        navigation_routes: any[];
        base_url: string;
        default_url?: string;
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
    const websiteDisplayName = websiteSlug ? websiteSlug.charAt(0).toUpperCase() + websiteSlug.slice(1) : "";

    // Generate a unique tab ID once per page load for session isolation
    // This ensures each browser tab gets its own Browserbase session
    const [tabId] = useState(() => crypto.randomUUID());

    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState("Initializing...");
    const [error, setError] = useState<string | null>(null);
    const [debugMessages, setDebugMessages] = useState<Array<{ source: string; message: string; timestamp: Date }>>([]);
    const [activeScreenshot, setActiveScreenshot] = useState<Screenshot | null>(null);
    const [chatCollapsed, setChatCollapsed] = useState(true);
    const [logsCollapsed, setLogsCollapsed] = useState(true);
    const [tipsVisible, setTipsVisible] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: Date }>>([]);
    
    // Sidebar is visible if either chat or logs is expanded
    const sidebarCollapsed = chatCollapsed && logsCollapsed;
    const agentRef = React.useRef<VoiceAgentHandle | null>(null);
    const logsEndRef = React.useRef<HTMLDivElement | null>(null);
    const [agentStatus, setAgentStatus] = useState({
        isInitialized: false,
        isInitializing: false,
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isAgentSpeaking: false,
        isHumanSpeaking: false,
    });
    const [demoMode, setDemoMode] = useState<DemoMode>("screenshot");

    // Sync demo mode from manager
    useEffect(() => {
        const manager = getDemoModeManager();
        setDemoMode(manager.getMode());

        const unsubscribe = manager.subscribe((newMode) => {
            setDemoMode(newMode);
            handleDebugMessage("system", `🔄 Demo mode switched to: ${newMode}`);
        });

        return unsubscribe;
    }, []);

    // Subscribe to screenshot changes from ScreenshotManager
    useEffect(() => {
        const screenshotManager = getScreenshotManager();

        const unsubscribe = screenshotManager.subscribe((screenshot) => {
            if (screenshot) {
                setActiveScreenshot(screenshot as Screenshot);
                handleDebugMessage("system", `📷 Showing: ${screenshot.filename}`);
            }
        });

        return unsubscribe;
    }, []);

    // Initialize ScreenshotManager when screenshots are loaded
    useEffect(() => {
        if (agentConfig?.screenshots && agentConfig.screenshots.length > 0) {
            const screenshotManager = getScreenshotManager();
            screenshotManager.setAvailable(agentConfig.screenshots);

            // Set first screenshot as active if none is set
            if (!screenshotManager.getActive()) {
                screenshotManager.setActive(agentConfig.screenshots[0]);
            }
        }
    }, [agentConfig?.screenshots]);

    // Auto-scroll logs to bottom when new messages arrive
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [debugMessages]);

    useEffect(() => {
        let progressInterval: NodeJS.Timeout | null = null;

        const loadConfiguration = async () => {
            try {
                setLoading(true);
                setError(null);
                setLoadingProgress(0);
                setLoadingStage("Connecting to server...");

                // Simulate progress updates
                progressInterval = setInterval(() => {
                    setLoadingProgress((prev) => {
                        // Slow down as we approach 90% (wait for actual completion)
                        if (prev < 20) return prev + 2;
                        if (prev < 50) return prev + 1.5;
                        if (prev < 80) return prev + 0.8;
                        if (prev < 90) return prev + 0.3;
                        return prev; // Hold at 90% until actual completion
                    });
                }, 100);

                setLoadingStage("Fetching agent configuration...");
                setLoadingProgress(20);

                // Fetch agent configuration
                const agentConfigResponse = await fetch(`/api/agent/config/${websiteSlug}`);
                if (!agentConfigResponse.ok) {
                    throw new Error(`Failed to fetch agent config: ${agentConfigResponse.statusText}`);
                }

                setLoadingProgress(60);
                setLoadingStage("Loading screenshots and routes...");

                const agentConfigData = await agentConfigResponse.json();

                setLoadingProgress(80);
                setLoadingStage("Warming up browser session...");

                // Do not expose system prompts on the client
                delete agentConfigData.system_prompt;
                setAgentConfig(agentConfigData);

                // Pre-warm browser session in background (don't await - let it run async)
                // This starts the Browserbase session early so it's ready when agent needs it
                // Pass tabId for session isolation - ensures this tab gets its own session
                fetch("/api/browser/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        headless: false,
                        loadFromDb: true,
                        websiteSlug,
                        tabId, // Unique tab ID for session isolation
                    }),
                })
                    .then((res) => {
                        if (res.ok) {
                            console.log(`[pre-warm] Browser session started successfully (tabId: ${tabId})`);
                        } else {
                            console.warn("[pre-warm] Browser session failed to start:", res.status);
                        }
                    })
                    .catch((err) => {
                        console.warn("[pre-warm] Browser session error:", err);
                    });

                // Complete loading
                if (progressInterval) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                }
                setLoadingProgress(100);
                setLoadingStage("Ready!");

                // Small delay to show 100% before hiding loader
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err: any) {
                console.error("Error loading configuration:", err);

                if (progressInterval) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                }

                // Provide minimal fallback configuration - API completely failed
                const fallbackConfig = {
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
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
                setLoading(false);
                setLoadingProgress(100);
            }
        };

        loadConfiguration();

        // Cleanup on unmount
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [websiteSlug]);

    const handleDebugMessage = React.useCallback((source: string, message: string) => {
        setDebugMessages((prev) => [...prev, { source, message, timestamp: new Date() }]);
        // Screenshot and mode switching handled via ScreenshotManager and DemoModeManager events
    }, []);

    const handleStatusChange = React.useCallback((status: {
        isInitialized?: boolean;
        isInitializing?: boolean;
        isConnected?: boolean;
        isConnecting?: boolean;
        isMuted?: boolean;
        isAgentSpeaking?: boolean;
        isHumanSpeaking?: boolean;
    }) => {
        setAgentStatus({
            isInitialized: status.isInitialized ?? false,
            isInitializing: status.isInitializing ?? false,
            isConnected: status.isConnected ?? false,
            isConnecting: status.isConnecting ?? false,
            isMuted: status.isMuted ?? false,
            isAgentSpeaking: status.isAgentSpeaking ?? false,
            isHumanSpeaking: status.isHumanSpeaking ?? false,
        });
    }, []);

    const handleChatMessage = React.useCallback((message: { id: string; role: "user" | "assistant"; content: string; timestamp: Date }) => {
        setChatMessages((prev) => [...prev, message]);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="w-full max-w-md px-6">
                    <div className="text-center mb-8">
                        <Loader2 className="mx-auto mb-4 w-12 h-12 text-blue-600 animate-spin" />
                        <h2 className="mb-2 text-xl font-semibold text-gray-900">Loading Agent Demo</h2>
                        <p className="text-sm text-gray-600 mb-6">{loadingStage}</p>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">{Math.round(loadingProgress)}%</p>
                    </div>

                    {/* Loading Steps */}
                    <div className="space-y-2 text-left">
                        <div className={`flex items-center text-sm ${loadingProgress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-2 h-2 rounded-full mr-3 ${loadingProgress >= 20 ? 'bg-green-600' : 'bg-gray-300'}`} />
                            <span>Connecting to server</span>
                        </div>
                        <div className={`flex items-center text-sm ${loadingProgress >= 60 ? 'text-green-600' : loadingProgress >= 20 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-2 h-2 rounded-full mr-3 ${loadingProgress >= 60 ? 'bg-green-600' : loadingProgress >= 20 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`} />
                            <span>Fetching agent configuration</span>
                        </div>
                        <div className={`flex items-center text-sm ${loadingProgress >= 80 ? 'text-green-600' : loadingProgress >= 60 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-2 h-2 rounded-full mr-3 ${loadingProgress >= 80 ? 'bg-green-600' : loadingProgress >= 60 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`} />
                            <span>Loading screenshots and routes</span>
                        </div>
                        <div className={`flex items-center text-sm ${loadingProgress >= 100 ? 'text-green-600' : loadingProgress >= 80 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-2 h-2 rounded-full mr-3 ${loadingProgress >= 100 ? 'bg-green-600' : loadingProgress >= 80 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`} />
                            <span>Finalizing configuration</span>
                        </div>
                    </div>
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
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            {/* Top Header with Buttons */}
            <div className="flex-shrink-0 px-6 py-3 bg-white border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{websiteDisplayName} Voice Assistant</h1>
                        <p className="text-sm text-gray-600">AI-powered visual guidance</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href="/"
                            className="flex items-center px-3 py-2 text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                        >
                            <Home className="mr-2 w-4 h-4" />
                            Home
                        </a>
                    </div>
                </div>
                {/* Top Button Row */}
                <div className="flex gap-2 mt-3">
                    <Button
                        variant={demoMode === "screenshot" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            const manager = getDemoModeManager();
                            const newMode = demoMode === "screenshot" ? "live" : "screenshot";
                            manager.setMode(newMode);
                        }}
                        className="flex items-center gap-2"
                    >
                        {demoMode === "screenshot" ? <Image className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {demoMode === "screenshot" ? "Screenshot" : "Live Browser"}
                    </Button>
                    <Button
                        variant={!chatCollapsed ? "default" : "outline"}
                        size="sm"
                        onClick={() => setChatCollapsed(!chatCollapsed)}
                        className="flex items-center gap-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                    </Button>
                    <Button
                        variant={tipsVisible ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTipsVisible(!tipsVisible)}
                        className="flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Tips
                    </Button>
                    <Button
                        variant={!logsCollapsed ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogsCollapsed(!logsCollapsed)}
                        className="flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Logs
                    </Button>
                </div>
            </div>

            {/* Main Content Area - Left (Large) and Sidebar (Right) */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Main Content - Screenshots/Browser View (Left, Large) */}
                <div className="flex-1 min-w-0 overflow-hidden bg-white border-r border-gray-200">
                    <div className="relative h-full">
                        {/* Speaking Indicator Overlay - Top Right */}
                        {agentStatus.isConnected && (
                            <SpeakingIndicator
                                isAgentSpeaking={agentStatus.isAgentSpeaking || false}
                                isHumanSpeaking={agentStatus.isHumanSpeaking || false}
                                agentName={websiteDisplayName || "Alex"}
                            />
                        )}

                        {/* Live Browser - Always mounted, hidden when not in live mode */}
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                visibility: demoMode === "live" ? "visible" : "hidden",
                                pointerEvents: demoMode === "live" ? "auto" : "none",
                                zIndex: demoMode === "live" ? 1 : 0
                            }}
                        >
                            <LiveBrowserViewer
                                onStatusChange={(status) => {
                                    handleDebugMessage("browser", `Browser status: ${status}`);
                                }}
                                onDebugMessage={(type, message) => handleDebugMessage(type, message)}
                                websiteSlug={websiteSlug}
                                showSaveCookies={true}
                                tabId={tabId}
                            />
                        </div>

                        {/* Screenshot Mode - Visible when not in live mode */}
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                visibility: demoMode === "live" ? "hidden" : "visible",
                                pointerEvents: demoMode === "live" ? "none" : "auto",
                                zIndex: demoMode === "live" ? 0 : 1
                            }}
                        >
                            {activeScreenshot ? (
                                <div className="flex overflow-hidden justify-center items-center h-full bg-white">
                                    <img
                                        src={activeScreenshot.s3_url}
                                        alt={activeScreenshot.filename}
                                        className="object-contain w-full h-full"
                                    />
                                </div>
                            ) : (
                                <div className="flex justify-center items-center h-full bg-white">
                                    <div className="text-center text-gray-500">
                                        <div className="mb-4 text-4xl">📱</div>
                                        <h3 className="mb-2 text-lg font-semibold">No Screenshot Active</h3>
                                        <p>Start the voice agent to see visual guidance</p>
                                        <p className="mt-2 text-sm">
                                            Or <button 
                                                onClick={() => getDemoModeManager().setMode("live")}
                                                className="text-blue-600 hover:underline"
                                            >
                                                switch to live browser mode
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Chat and Logs (Right, Collapsible) */}
                <div
                    className={`bg-white border-l border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden ${
                        sidebarCollapsed ? "w-0" : "w-80"
                    }`}
                >
                    {!sidebarCollapsed && (
                        <div className="flex flex-col h-full">
                            {/* Chat Section */}
                            {!chatCollapsed && (
                                <div className="flex-shrink-0 border-b border-gray-200" style={{ flex: logsCollapsed ? "1" : "0 0 50%" }}>
                                    <ChatPanel
                                        messages={chatMessages}
                                        isCollapsed={false}
                                        onToggle={() => {
                                            setChatCollapsed(true);
                                            // sidebarCollapsed is now computed automatically
                                        }}
                                        canSend={agentStatus.isConnected}
                                        onSend={(text) => {
                                            // Push into chat immediately for snappy UX
                                            setChatMessages((prev) => [
                                                ...prev,
                                                { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() },
                                            ]);
                                            agentRef.current?.sendText(text);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Logs Section */}
                            {!logsCollapsed && (
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <h3 className="font-semibold text-gray-900 text-sm">Logs ({debugMessages.length})</h3>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setDebugMessages([])}
                                                className="text-xs px-2 py-1 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                            >
                                                Clear
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setLogsCollapsed(true)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                                        {debugMessages.length > 0 ? (
                                            debugMessages.map((msg, index) => {
                                                const isError = msg.source === "error" || msg.message.toLowerCase().includes("error") || msg.message.includes("❌");
                                                const isTool = msg.source === "tool" || msg.message.includes("TOOL") || msg.message.includes("🔧");
                                                const isUser = msg.message.includes("🧑 You:");
                                                const isAssistant = msg.message.includes("🗣️ Assistant:");
                                                
                                                const borderClass = isError ? "border-l-red-500" : 
                                                                   isTool ? "border-l-indigo-500" : 
                                                                   isUser ? "border-l-blue-500" :
                                                                   isAssistant ? "border-l-emerald-500" : 
                                                                   "border-l-gray-400";
                                                const bgClass = isError ? "bg-red-50" : 
                                                               isTool ? "bg-indigo-50" : 
                                                               isUser ? "bg-blue-50" :
                                                               isAssistant ? "bg-emerald-50" : 
                                                               "bg-gray-50";
                                                const labelClass = isError ? "text-red-600" : 
                                                                  isTool ? "text-indigo-600" : 
                                                                  isUser ? "text-blue-600" :
                                                                  isAssistant ? "text-emerald-600" : 
                                                                  "text-gray-500";
                                                
                                                return (
                                                    <div 
                                                        key={index} 
                                                        className={`rounded-lg p-2 border-l-4 ${borderClass} ${bgClass}`}
                                                    >
                                                        <div className="flex items-center gap-2 text-xs mb-1">
                                                            <span className="text-gray-400 font-mono">
                                                                {msg.timestamp.toLocaleTimeString()}
                                                            </span>
                                                            <span className={`font-semibold ${labelClass}`}>
                                                                {msg.source}
                                                            </span>
                                                        </div>
                                                        <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap break-all m-0">
                                                            {msg.message}
                                                        </pre>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex justify-center items-center h-full text-gray-400">
                                                <div className="text-center">
                                                    <MessageSquare className="mx-auto mb-2 w-8 h-8 opacity-30" />
                                                    <p className="text-sm">No logs yet</p>
                                                    <p className="text-xs text-gray-400">Start the voice agent to see activity</p>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={logsEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tips Section (Bottom, Hidden by Default) */}
            {tipsVisible && (
                <div className="flex-shrink-0 p-4 bg-yellow-50 border-t border-yellow-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="mb-2 font-semibold text-yellow-900">Tips</h3>
                            <div className="text-sm text-yellow-900 space-y-2">
                                <p><strong>Concept demo:</strong> This is an early prototype for evaluation only and not the final product. Performance, features, and behavior may change.</p>
                                <p><strong>Current limitation:</strong> For now, you can ask only about HubSpot Contacts.</p>
                                <p><strong>How to use:</strong> Click "Start Voice Agent" below, then speak your question. Example: "How do I find all contacts that unsubscribed?"</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTipsVisible(false)}
                            className="ml-4"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Start/Stop Button (Bottom Center) */}
            <div className="flex-shrink-0 flex justify-center items-center p-4 bg-white border-t border-gray-200">
                <button
                    onClick={() => agentRef.current?.toggle()}
                    disabled={agentStatus.isConnecting || !agentStatus.isInitialized}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                        agentStatus.isConnected
                            ? "text-white bg-red-500 hover:bg-red-600"
                            : agentStatus.isConnecting
                            ? "text-white bg-yellow-500 cursor-not-allowed"
                            : "text-white bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {agentStatus.isConnecting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Connecting...
                        </>
                    ) : agentStatus.isConnected ? (
                        <>
                            <X className="w-5 h-5" />
                            Stop Voice Agent
                        </>
                    ) : (
                        <>
                            <PlayCircle className="w-5 h-5" />
                            Start Voice Agent
                        </>
                    )}
                </button>
            </div>

            {/* Hidden mount of VoiceAgent (unified component) */}
            <div className="hidden" aria-hidden="true">
                <VoiceAgentProvider>
                    <VoiceAgent
                        ref={agentRef}
                        onDebugMessage={handleDebugMessage}
                        screenshots={agentConfig?.screenshots}
                        browserConfig={agentConfig?.browser_config}
                        agentName={`${websiteSlug} Assistant`}
                        websiteName={websiteDisplayName}
                        websiteSlug={websiteSlug}
                        useDynamicConfig={true}
                        hideHeader={true}
                        hideControlButton={true}
                        onStatusChange={handleStatusChange}
                        onChatMessage={handleChatMessage}
                    />
                </VoiceAgentProvider>
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
