"use client";

import { useState, useEffect } from "react";
import { Settings, Monitor, MessageSquare } from "lucide-react";
import PlaywrightController from "@/components/PlaywrightController";
import DebugPanel from "@/components/DebugPanel";
import RealtimeVoiceAgent from "@/components/RealtimeVoiceAgent";

export default function HubSpotPlaywrightMCP() {
    const [isDebugOpen, setIsDebugOpen] = useState(false);
    const [debugMessages, setDebugMessages] = useState<
        Array<{
            timestamp: string;
            type: "system" | "user" | "assistant" | "playwright" | "realtime";
            message: string;
        }>
    >([]);
    const [playwrightStatus, setPlaywrightStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

    const addDebugMessage = (type: "system" | "user" | "assistant" | "playwright" | "realtime", message: string) => {
        setDebugMessages((prev) => [
            ...prev,
            {
                timestamp: new Date().toLocaleTimeString(),
                type,
                message,
            },
        ]);
    };

    useEffect(() => {
        addDebugMessage("system", "🎭 HubSpot Playwright MCP initialized");
    }, []);

    return (
        <div className="h-screen w-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <h1 className="text-lg font-semibold text-gray-900">HubSpot Pre-Sales Demo</h1>
                    <div
                        className={`w-2 h-2 rounded-full ${
                            playwrightStatus === "connected"
                                ? "bg-green-500"
                                : playwrightStatus === "connecting"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                        }`}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsDebugOpen(!isDebugOpen)}
                        className={`p-2 rounded-lg transition-colors ${
                            isDebugOpen ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0">
                {/* Browser Area */}
                <div className={`transition-all duration-300 ${isDebugOpen ? "flex-1" : "w-full"} min-h-0`}>
                    <PlaywrightController onStatusChange={setPlaywrightStatus} onDebugMessage={addDebugMessage} />
                </div>

                {/* Debug Panel (Collapsible) */}
                <div
                    className={`h-full transition-all duration-300 border-l border-gray-300 bg-white overflow-hidden ${
                        isDebugOpen ? "w-80" : "w-0"
                    } min-h-0`}
                >
                    <DebugPanel messages={debugMessages} isOpen={isDebugOpen} onClear={() => setDebugMessages([])} />
                </div>
            </div>

            {/* Voice Control Bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex items-center justify-center space-x-4">
                    <RealtimeVoiceAgent
                        playwrightStatus={playwrightStatus}
                        onDebugMessage={(source, message) => addDebugMessage(source as any, message)}
                    />
                </div>
            </div>
        </div>
    );
}
