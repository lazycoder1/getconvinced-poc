"use client";

import React, { forwardRef } from "react";
import { useVoiceAgentProvider } from "@/lib/voice-agent/VoiceAgentProvider";
import OpenAIVoiceAgent from "@/components/voice-agents/OpenAIVoiceAgent";
import ElevenLabsVoiceAgent from "@/components/voice-agents/ElevenLabsVoiceAgent";
import type { VoiceAgentHandle, VoiceAgentProps } from "@/lib/voice-agent/types";

/**
 * Unified Voice Agent Component
 * 
 * This component acts as a drop-in replacement for RealtimeVoiceAgent.
 * It automatically selects the appropriate provider (OpenAI or Eleven Labs)
 * based on the VoiceAgentProvider context.
 * 
 * Usage:
 * ```tsx
 * <VoiceAgentProvider>
 *   <VoiceAgent {...props} />
 * </VoiceAgentProvider>
 * ```
 */
const VoiceAgent = forwardRef<VoiceAgentHandle, VoiceAgentProps>(function VoiceAgent(
    props: VoiceAgentProps,
    ref
) {
    const { provider } = useVoiceAgentProvider();

    // Render appropriate implementation based on provider
    if (provider === "elevenlabs") {
        return <ElevenLabsVoiceAgent ref={ref} {...props} />;
    } else {
        return <OpenAIVoiceAgent ref={ref} {...props} />;
    }
});

export default VoiceAgent;

