"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, User, Bot, Send } from "lucide-react";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    isCollapsed: boolean;
    onToggle: () => void;
    onSend?: (text: string) => void | Promise<void>;
    canSend?: boolean;
}

/**
 * ChatPanel - Displays conversation history between user and assistant
 * 
 * Shows messages from history_added events with proper styling
 * for user vs assistant messages
 */
export default function ChatPanel({ messages, isCollapsed, onToggle, onSend, canSend = false }: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [draft, setDraft] = useState("");

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (isCollapsed) {
        return null;
    }

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || !onSend || !canSend) return;
        await onSend(text);
        setDraft("");
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Chat</h3>
                    {messages.length > 0 && (
                        <span className="text-xs text-gray-500">({messages.length})</span>
                    )}
                </div>
                <button
                    onClick={onToggle}
                    className="text-xs px-2 py-1 rounded text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    Hide
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start the voice agent to begin chatting</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${
                                message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            {message.role === "assistant" && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-blue-600" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    message.role === "user"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-900"
                                }`}
                            >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <p
                                    className={`text-xs mt-1 ${
                                        message.role === "user" ? "text-blue-100" : "text-gray-500"
                                    }`}
                                >
                                    {message.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                            {message.role === "user" && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <User className="w-4 h-4 text-green-600" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-gray-200 p-3">
                <div className="flex gap-2">
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={canSend ? "Type a message…" : "Start the voice agent to send messages"}
                        disabled={!canSend || !onSend}
                        rows={2}
                        className="flex-1 resize-none rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!canSend || !onSend || draft.trim().length === 0}
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Enter to send • Shift+Enter for newline</p>
            </div>
        </div>
    );
}

