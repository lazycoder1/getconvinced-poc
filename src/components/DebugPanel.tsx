"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Download } from "lucide-react";

interface DebugMessage {
    timestamp: string;
    type: "system" | "user" | "assistant" | "playwright" | "realtime" | "action" | "response" | "error";
    message: string;
    data?: unknown;
    duration?: number;
}

interface DebugPanelProps {
    messages: DebugMessage[];
    isOpen: boolean;
    onClear: () => void;
}

// Type to border/bg color mapping (light theme)
function getTypeStyles(type: string): { border: string; bg: string; text: string } {
    switch (type) {
        case "action":
        case "playwright":
            return { border: "border-l-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700" };
        case "response":
        case "assistant":
            return { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" };
        case "error":
            return { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700" };
        case "user":
            return { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700" };
        default:
            return { border: "border-l-gray-400", bg: "bg-gray-50", text: "text-gray-600" };
    }
}

function getTypeLabel(type: string): string {
    switch (type) {
        case "action": return "action";
        case "response": return "response";
        case "error": return "error";
        case "user": return "user";
        case "assistant": return "assistant";
        case "playwright": return "browser";
        case "realtime": return "realtime";
        case "system": return "system";
        default: return type;
    }
}

export default function DebugPanel({ messages, isOpen, onClear }: DebugPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, autoScroll]);

    const exportLogs = () => {
        const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white border-l border-gray-200">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm">
                    Logs <span className="text-gray-500 font-normal">({messages.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onClear}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                    <button 
                        onClick={exportLogs}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                </div>
            </div>

            {/* Messages - Scrollable container showing ALL logs */}
            <div 
                className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2"
                onScroll={(e) => {
                    const el = e.currentTarget;
                    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                    setAutoScroll(isAtBottom);
                }}
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-3xl mb-2">📋</div>
                        <div className="text-sm">Logs will appear here</div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const styles = getTypeStyles(msg.type);
                        const typeLabel = getTypeLabel(msg.type);
                        
                        return (
                            <div
                                key={index}
                                className={`rounded-lg p-2.5 border-l-4 ${styles.border} ${styles.bg}`}
                            >
                                <div className="flex items-center gap-2 text-xs mb-1">
                                    <span className="text-gray-400 font-mono">{msg.timestamp}</span>
                                    <span className={`font-semibold ${styles.text}`}>
                                        [{typeLabel}]
                                    </span>
                                    {msg.duration && (
                                        <span className="text-gray-400">{msg.duration}ms</span>
                                    )}
                                </div>
                                <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap break-all m-0">
                                    {msg.message}
                                    {msg.data && (
                                        <>
                                            {"\n"}
                                            {typeof msg.data === "string" 
                                                ? msg.data 
                                                : JSON.stringify(msg.data, null, 2)
                                            }
                                        </>
                                    )}
                                </pre>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer with live indicator */}
            <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Total: {messages.length} entries</span>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${autoScroll ? "bg-emerald-400" : "bg-gray-300"}`} />
                        <span>{autoScroll ? "Live" : "Scrolled"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
