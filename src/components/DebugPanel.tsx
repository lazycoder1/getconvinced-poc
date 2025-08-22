"use client";

import { useEffect, useRef } from "react";
import { X, Trash2, MessageSquare, User, Bot, Settings } from "lucide-react";

interface DebugMessage {
    timestamp: string;
    type: "system" | "user" | "assistant" | "playwright" | "realtime";
    message: string;
}

interface DebugPanelProps {
    messages: DebugMessage[];
    isOpen: boolean;
    onClear: () => void;
}

export default function DebugPanel({ messages, isOpen, onClear }: DebugPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const getMessageIcon = (type: string) => {
        switch (type) {
            case "user":
                return <User className="w-4 h-4" />;
            case "assistant":
                return <Bot className="w-4 h-4" />;
            case "playwright":
                return <Settings className="w-4 h-4" />;
            case "realtime":
                return <Bot className="w-4 h-4" />;
            default:
                return <MessageSquare className="w-4 h-4" />;
        }
    };

    const getMessageColor = (type: string) => {
        switch (type) {
            case "user":
                return "bg-blue-50 border-blue-200 text-blue-800";
            case "assistant":
                return "bg-green-50 border-green-200 text-green-800";
            case "playwright":
                return "bg-purple-50 border-purple-200 text-purple-800";
            case "realtime":
                return "bg-yellow-50 border-yellow-200 text-yellow-800";
            default:
                return "bg-gray-50 border-gray-200 text-gray-800";
        }
    };

    if (!isOpen) return null;

    return (
        <div className="h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">AI Debug Console</h3>
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{messages.length}</span>
                </div>

                <button
                    onClick={onClear}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                    title="Clear messages"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Debug messages will appear here</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div key={index} className={`border rounded-lg p-3 ${getMessageColor(message.type)}`}>
                            <div className="flex items-start space-x-2">
                                <div className="mt-0.5">{getMessageIcon(message.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium uppercase tracking-wide">{message.type}</span>
                                        <span className="text-xs opacity-75">{message.timestamp}</span>
                                    </div>
                                    <p className="text-sm break-words">{message.message}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Real-time debugging</span>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Live</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
