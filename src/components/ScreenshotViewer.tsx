"use client";

import { useEffect, useState } from "react";
import { Image, Globe, Play } from "lucide-react";
import { SCREENSHOT_VIEWS, ScreenshotView } from "@/lib/screenshot-views";

interface ScreenshotViewerProps {
    onStatusChange: (status: "disconnected" | "connecting" | "connected") => void;
    onDebugMessage: (type: "system" | "user" | "assistant" | "playwright", message: string) => void;
}

type ActiveView = (ScreenshotView & { url: string }) | null;

export default function ScreenshotViewer({ onStatusChange, onDebugMessage }: ScreenshotViewerProps) {
    const [started, setStarted] = useState(false);
    const [activeView, setActiveView] = useState<ActiveView>(null);

    useEffect(() => {
        onStatusChange("connected");
        onDebugMessage("playwright", "🖼️ Screenshot mode enabled. Use tools to switch views.");
        const handler = (evt: Event) => {
            const e = evt as CustomEvent<ActiveView>;
            if (e.detail) {
                setActiveView(e.detail);
                onDebugMessage("playwright", `📸 Showing view: ${e.detail.title} (${e.detail.name})`);
            }
        };
        window.addEventListener("screenshot:set_view", handler as EventListener);
        (window as any).screenshotSetView = (detail: ActiveView) => {
            if (detail) {
                setActiveView(detail);
                onDebugMessage("playwright", `📸 Showing view: ${detail.title} (${detail.name})`);
            }
        };
        return () => {
            window.removeEventListener("screenshot:set_view", handler as EventListener);
            delete (window as any).screenshotSetView;
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center space-x-2">
                    <Image className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">HubSpot Demo Screens</span>
                </div>
                {activeView ? (
                    <span className="text-xs text-blue-600">{activeView.title}</span>
                ) : (
                    <span className="text-xs text-blue-600">No view selected</span>
                )}
            </div>

            {/* Body */}
            <div className="relative flex-1 bg-gray-100">
                {!started ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-center">
                            <Globe className="mx-auto mb-4 w-16 h-16 text-gray-300" />
                            <p className="mb-1 text-lg font-medium text-gray-900">Welcome to the HubSpot Demo</p>
                            <p className="mb-4 text-sm text-gray-600">Say "Hi" to begin, then click the button below.</p>
                            <button
                                onClick={() => setStarted(true)}
                                className="inline-flex items-center px-4 py-2 space-x-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                <Play className="w-4 h-4" />
                                <span>Start Demo</span>
                            </button>
                        </div>
                    </div>
                ) : activeView ? (
                    <div className="flex justify-center items-center w-full h-full bg-black">
                        <img src={activeView.url} alt={activeView.title} className="max-h-[70%] max-w-[70%] object-contain" />
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-center">
                            <p className="mb-2 text-lg font-medium text-gray-900">Waiting for a view…</p>
                            <p className="mb-4 text-sm text-gray-600">
                                Ask the assistant to show a specific section, e.g., "Show me deals".
                            </p>
                            <div className="inline-grid grid-cols-2 gap-2">
                                {SCREENSHOT_VIEWS.slice(0, 4).map((v) => (
                                    <button
                                        key={v.name}
                                        onClick={() => setActiveView({ ...v, url: `/screenshots/${v.filename}` })}
                                        className="px-3 py-2 text-xs bg-white rounded border hover:bg-gray-50"
                                    >
                                        {v.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
