"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, RefreshCw, AlertCircle } from "lucide-react";
import ScreenshotViewer from "@/components/ScreenshotViewer";

interface PlaywrightControllerProps {
    onStatusChange: (status: "disconnected" | "connecting" | "connected") => void;
    onDebugMessage: (type: "system" | "user" | "assistant" | "playwright", message: string) => void;
}

export default function PlaywrightController({ onStatusChange, onDebugMessage }: PlaywrightControllerProps) {
    const isScreenshotMode = process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "true";
    if (isScreenshotMode) {
        return <ScreenshotViewer onStatusChange={onStatusChange} onDebugMessage={onDebugMessage} />;
    }
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [browser, setBrowser] = useState<any>(null);
    const [page, setPage] = useState<any>(null);
    const [currentUrl, setCurrentUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isBrowserReady, setIsBrowserReady] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        connectToPlaywright();
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    const connectToPlaywright = async () => {
        try {
            onStatusChange("connecting");
            onDebugMessage("playwright", "🔌 Connecting to HubSpot MCP Browser...");

            // Initialize the demo environment directly
            await initializeBrowser();
            onStatusChange("connected");
            onDebugMessage("playwright", "✅ Connected to HubSpot MCP Browser");
        } catch (error) {
            onStatusChange("disconnected");
            onDebugMessage("playwright", `❌ Connection error: ${error}`);
            // Retry in 5 seconds
            setTimeout(connectToPlaywright, 5000);
        }
    };

    const initializeBrowser = async () => {
        try {
            setIsLoading(true);
            onDebugMessage("playwright", "🚀 Browser already running in container...");

            // Browser is already launched by Docker container
            onDebugMessage("playwright", "🌐 HubSpot demo environment ready");
            setCurrentUrl("https://app.hubspot.com - Live Browser Running");
            setIsLoading(false);
            onDebugMessage("playwright", "✅ Browser ready for demo");
            onDebugMessage("playwright", "👆 Click in the browser above to interact");
            setIsBrowserReady(true);
        } catch (error) {
            setIsLoading(false);
            onDebugMessage("playwright", `❌ Browser check failed: ${error}`);
        }
    };

    const navigateToUrl = async (url: string) => {
        try {
            setIsLoading(true);
            onDebugMessage("playwright", `🧭 Navigation request: ${url}`);
            onDebugMessage("playwright", "👆 Please navigate manually in the browser above");
            onDebugMessage("playwright", "🖱️ Click in the address bar and type the URL");

            setCurrentUrl(url); // Update current URL for UI feedback
            setIsLoading(false);
            onDebugMessage("playwright", `📍 URL noted: ${url}`);
        } catch (error) {
            setIsLoading(false);
            onDebugMessage("playwright", `❌ Navigation note failed: ${error}`);
        }
    };

    // Playwright action methods that can be called by the voice agent
    const playwrightActions = {
        click: async (selector: string) => {
            onDebugMessage("playwright", `🖱️ Clicking: ${selector}`);
            // Send click command to Playwright server
            // ws?.send(JSON.stringify({ action: 'click', selector }));
        },

        type: async (selector: string, text: string) => {
            onDebugMessage("playwright", `⌨️ Typing "${text}" into: ${selector}`);
            // Send type command to Playwright server
            // ws?.send(JSON.stringify({ action: 'type', selector, text }));
        },

        navigate: navigateToUrl,

        getElements: async () => {
            onDebugMessage("playwright", "🔍 Finding interactive elements...");
            // Send element discovery command
            // ws?.send(JSON.stringify({ action: 'getElements' }));
            return [];
        },
    };

    // Expose methods to parent component for voice agent
    useEffect(() => {
        (window as any).playwrightActions = playwrightActions;
    }, [ws]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Browser Controls */}
            <div className="flex items-center px-4 py-2 space-x-3 bg-gray-50 border-b border-gray-200">
                <button
                    onClick={() => navigateToUrl(currentUrl)}
                    disabled={isLoading}
                    className="p-2 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? "animate-spin" : ""}`} />
                </button>

                <div className="flex flex-1 items-center px-3 py-2 bg-white rounded-lg border border-gray-300">
                    <Globe className="mr-2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={currentUrl}
                        onChange={(e) => setCurrentUrl(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && navigateToUrl(currentUrl)}
                        className="flex-1 text-sm text-gray-700 outline-none"
                        placeholder="Enter URL..."
                    />
                </div>

                <button
                    onClick={() => navigateToUrl("https://app.hubspot.com")}
                    className="px-3 py-2 text-sm text-white bg-orange-500 rounded-lg transition-colors hover:bg-orange-600"
                >
                    HubSpot
                </button>
            </div>

            {/* Browser View */}
            <div className="relative flex-1 bg-gray-100">
                {isLoading ? (
                    <div className="flex absolute inset-0 justify-center items-center bg-white">
                        <div className="text-center">
                            <RefreshCw className="mx-auto mb-2 w-8 h-8 text-blue-600 animate-spin" />
                            <p className="text-sm text-gray-600">Loading...</p>
                        </div>
                    </div>
                ) : isBrowserReady ? (
                    <div className="flex flex-col w-full h-full">
                        <div className="flex justify-between items-center px-4 py-2 bg-blue-50 border-b border-blue-200">
                            <div className="flex items-center space-x-2">
                                <Globe className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">HubSpot Demo Browser</span>
                            </div>
                            <span className="text-xs text-blue-600">{currentUrl}</span>
                        </div>
                        <iframe
                            src="http://localhost:7900/vnc.html?autoconnect=true&resize=scale&quality=6"
                            className="flex-1 w-full border-0"
                            title="HubSpot Demo Browser"
                            allow="clipboard-read; clipboard-write"
                            onLoad={() => onDebugMessage("playwright", "🖥️ Browser view loaded")}
                            onError={() => onDebugMessage("playwright", "❌ Browser view failed to load")}
                        />
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500">
                            <Globe className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                            <p className="text-lg font-medium">Browser Ready</p>
                            <p className="text-sm">Use voice commands or enter a URL to start browsing</p>
                        </div>
                    </div>
                )}

                {/* Status Overlay */}
                {ws === null && (
                    <div className="flex absolute top-4 right-4 items-center px-3 py-2 space-x-2 bg-red-100 rounded-lg border border-red-300">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-700">Disconnected from Playwright</span>
                    </div>
                )}
            </div>
        </div>
    );
}
