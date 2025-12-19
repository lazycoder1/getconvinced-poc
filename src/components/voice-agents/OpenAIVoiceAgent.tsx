"use client";

import React, { forwardRef } from "react";
import RealtimeVoiceAgent, { RealtimeVoiceAgentHandle } from "@/components/RealtimeVoiceAgent";
import type { VoiceAgentHandle, VoiceAgentProps } from "@/lib/voice-agent/types";

/**
 * OpenAI Voice Agent Adapter
 * 
 * Wraps the existing RealtimeVoiceAgent component to implement
 * the unified VoiceAgentProps interface. This allows the OpenAI
 * implementation to be used interchangeably with Eleven Labs.
 */
const OpenAIVoiceAgent = forwardRef<VoiceAgentHandle, VoiceAgentProps>(function OpenAIVoiceAgent(
    props: VoiceAgentProps,
    ref
) {
    // Map VoiceAgentHandle to RealtimeVoiceAgentHandle
    const mappedRef = React.useRef<RealtimeVoiceAgentHandle | null>(null);

    React.useImperativeHandle(ref, () => ({
        start: () => {
            mappedRef.current?.start();
        },
        stop: () => {
            mappedRef.current?.stop();
        },
        toggle: () => {
            mappedRef.current?.toggle();
        },
        sendText: (text: string) => {
            mappedRef.current?.sendText(text);
        },
    }), []);

    return (
        <RealtimeVoiceAgent
            ref={mappedRef}
            {...props}
        />
    );
});

export default OpenAIVoiceAgent;

