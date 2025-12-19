/**
 * Unified TypeScript interfaces for voice agent providers
 * 
 * These interfaces ensure both OpenAI and Eleven Labs implementations
 * have the same API surface, making them interchangeable.
 */

export interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
}

export interface BrowserConfig {
    navigation_routes: any[];
    base_url: string;
    default_url?: string;
}

export interface VoiceAgentHandle {
    start: () => void;
    stop: () => void;
    toggle: () => void;
    sendText: (text: string) => void | Promise<void>;
}

export interface VoiceAgentStatus {
    isInitialized: boolean;
    isInitializing: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isMuted: boolean;
    isAgentSpeaking?: boolean;
    isHumanSpeaking?: boolean;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export interface VoiceAgentProps {
    onDebugMessage: (source: string, message: string) => void;
    screenshots?: Screenshot[];
    browserConfig?: BrowserConfig;
    agentName?: string;
    websiteName?: string;
    websiteSlug?: string;
    useDynamicConfig?: boolean;
    hideHeader?: boolean;
    hideControlButton?: boolean;
    onStatusChange?: (status: VoiceAgentStatus) => void;
    onChatMessage?: (message: ChatMessage) => void;
}

/**
 * Voice agent provider type
 */
export type VoiceAgentProvider = "openai" | "elevenlabs";

/**
 * Voice agent provider configuration
 */
export interface VoiceAgentProviderConfig {
    provider: VoiceAgentProvider;
    agentId?: string; // For Eleven Labs
    apiKey?: string; // For OpenAI (server-side only)
}

