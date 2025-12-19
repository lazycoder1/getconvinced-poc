"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { VoiceAgentProvider, VoiceAgentProviderConfig } from "./types";

interface VoiceAgentProviderContextValue {
    provider: VoiceAgentProvider;
    config: VoiceAgentProviderConfig;
    setProvider: (provider: VoiceAgentProvider) => void;
}

const VoiceAgentProviderContext = createContext<VoiceAgentProviderContextValue | undefined>(undefined);

interface VoiceAgentProviderProps {
    children: ReactNode;
    defaultProvider?: VoiceAgentProvider;
}

/**
 * VoiceAgentProvider - Context provider for voice agent provider selection
 * 
 * Allows switching between OpenAI and Eleven Labs implementations
 * via environment variable or runtime configuration.
 */
export function VoiceAgentProvider({
    children,
    defaultProvider,
}: VoiceAgentProviderProps) {
    // Determine provider from environment or prop
    const getInitialProvider = (): VoiceAgentProvider => {
        if (defaultProvider) {
            return defaultProvider;
        }
        
        // Check environment variable
        const envProvider = process.env.NEXT_PUBLIC_VOICE_AGENT_PROVIDER;
        if (envProvider === "openai" || envProvider === "elevenlabs") {
            return envProvider;
        }
        
        // Default to elevenlabs
        return "elevenlabs";
    };

    const [provider, setProviderState] = useState<VoiceAgentProvider>(getInitialProvider);

    const setProvider = (newProvider: VoiceAgentProvider) => {
        setProviderState(newProvider);
    };

    const config: VoiceAgentProviderConfig = {
        provider,
        agentId: process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID,
    };

    const value: VoiceAgentProviderContextValue = {
        provider,
        config,
        setProvider,
    };

    return (
        <VoiceAgentProviderContext.Provider value={value}>
            {children}
        </VoiceAgentProviderContext.Provider>
    );
}

/**
 * useVoiceAgentProvider - Hook to access voice agent provider context
 */
export function useVoiceAgentProvider(): VoiceAgentProviderContextValue {
    const context = useContext(VoiceAgentProviderContext);
    if (context === undefined) {
        throw new Error("useVoiceAgentProvider must be used within a VoiceAgentProvider");
    }
    return context;
}

