"use client";

import React from "react";
import { Mic, Volume2 } from "lucide-react";

interface SpeakingIndicatorProps {
    isAgentSpeaking: boolean;
    isHumanSpeaking: boolean;
    agentName?: string;
}

/**
 * SpeakingIndicator - Video conferencing-style overlay showing who is speaking
 * 
 * Displays two participant cards side-by-side (Alex/Human) with visual
 * indicators when they're speaking (pulsing animation, border highlight)
 */
export default function SpeakingIndicator({
    isAgentSpeaking,
    isHumanSpeaking,
    agentName = "Alex",
}: SpeakingIndicatorProps) {
    return (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            {/* Agent Card */}
            <div
                className={`relative flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border-2 transition-all duration-300 ${
                    isAgentSpeaking
                        ? "border-blue-500 shadow-blue-200"
                        : "border-gray-200"
                }`}
            >
                {/* Pulsing indicator when speaking */}
                {isAgentSpeaking && (
                    <div className="absolute -inset-1 rounded-lg bg-blue-400 opacity-75 animate-pulse" />
                )}
                <div className="relative flex items-center gap-2">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isAgentSpeaking
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-600"
                        }`}
                    >
                        <Volume2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{agentName}</span>
                </div>
            </div>

            {/* Human Card */}
            <div
                className={`relative flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border-2 transition-all duration-300 ${
                    isHumanSpeaking
                        ? "border-green-500 shadow-green-200"
                        : "border-gray-200"
                }`}
            >
                {/* Pulsing indicator when speaking */}
                {isHumanSpeaking && (
                    <div className="absolute -inset-1 rounded-lg bg-green-400 opacity-75 animate-pulse" />
                )}
                <div className="relative flex items-center gap-2">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isHumanSpeaking
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 text-gray-600"
                        }`}
                    >
                        <Mic className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Human</span>
                </div>
            </div>
        </div>
    );
}

