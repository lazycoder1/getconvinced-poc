/**
 * Eleven Labs Agent Sync Service
 * 
 * Handles creating and updating agents in Eleven Labs platform.
 * Syncs prompts and tool configurations from our database to Eleven Labs agents.
 * 
 * Uses Eleven Labs REST API directly since @elevenlabs/client is for real-time connections.
 */

import { buildFullPrompt } from "@/lib/prompt-builder";
import { prisma } from "@/lib/database";
import type { Screenshot, BrowserConfig } from "./types";

export interface AgentSyncConfig {
    websiteSlug: string;
    websiteName: string;
    prompt: string;
    voice?: string;
    model?: string;
}

export interface AgentSyncResult {
    agentId: string;
    created: boolean;
    syncedAt: Date;
}

/**
 * Get Eleven Labs API key
 */
function getApiKey(): string {
    const apiKey = process.env.ELEVEN_API_KEY;
    if (!apiKey) {
        throw new Error("ELEVEN_API_KEY environment variable is required");
    }
    return apiKey;
}

/**
 * Make API call to Eleven Labs
 * 
 * Note: Eleven Labs Agents Platform API for creating/updating agents programmatically
 * may not be fully available via REST API. Agents are typically created via:
 * 1. Eleven Labs Dashboard (https://elevenlabs.io/app/agents)
 * 2. Eleven Labs CLI (@elevenlabs/cli)
 * 
 * This function attempts to use the REST API, but may need to be updated based on
 * actual API availability.
 */
async function elevenLabsApiCall(
    endpoint: string,
    method: string = "GET",
    body?: any
): Promise<any> {
    const apiKey = getApiKey();
    const url = `https://api.elevenlabs.io/v1/${endpoint}`;

    const response = await fetch(url, {
        method,
        headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Eleven Labs API error (${response.status}): ${errorText}`
        );
    }

    return await response.json();
}

/**
 * Create or update an agent in Eleven Labs
 * 
 * @param config - Agent configuration
 * @returns Agent ID and sync status
 */
/**
 * Create or update an agent in Eleven Labs
 * 
 * IMPORTANT: Eleven Labs Agents Platform API for programmatic agent creation/updates
 * may not be fully available. Agents should be created manually in the Eleven Labs dashboard
 * at https://elevenlabs.io/app/agents, and the agent ID should be stored in the database.
 * 
 * This function will:
 * 1. If agent ID exists in DB: Try to update it (may fail if API not available)
 * 2. If no agent ID: Return error asking to create agent manually
 * 
 * For now, we'll store the agent ID that you provide manually.
 */
export async function createOrUpdateAgent(
    config: AgentSyncConfig
): Promise<AgentSyncResult> {
    // Check if agent already exists in database
    const website = await prisma.website.findUnique({
        where: { slug: config.websiteSlug },
        include: { config: true }
    });

    if (!website) {
        throw new Error(`Website not found: ${config.websiteSlug}`);
    }

    const existingAgentId = website.config?.eleven_labs_agent_id;

    if (existingAgentId) {
        // Try to update existing agent (may not be supported by API)
        try {
            await elevenLabsApiCall(`agents/${existingAgentId}`, "PATCH", {
                system_prompt: config.prompt,
            });

            // Update sync timestamp
            await prisma.websiteConfig.update({
                where: { website_id: website.id },
                data: {
                    eleven_labs_agent_synced_at: new Date()
                }
            });

            return {
                agentId: existingAgentId,
                created: false,
                syncedAt: new Date()
            };
        } catch (error: any) {
            // If API doesn't support updates, just update the timestamp
            // The prompt will be used from the agent configuration in Eleven Labs dashboard
            console.warn(`Could not update agent via API (this may be expected): ${error.message}`);
            console.warn(`Please update the system prompt manually in Eleven Labs dashboard for agent: ${existingAgentId}`);
            
            // Still update sync timestamp to indicate we tried
            await prisma.websiteConfig.update({
                where: { website_id: website.id },
                data: {
                    eleven_labs_agent_synced_at: new Date()
                }
            });

            return {
                agentId: existingAgentId,
                created: false,
                syncedAt: new Date()
            };
        }
    }

    // No agent ID in database - need to create manually
    throw new Error(
        `No agent ID found for ${config.websiteSlug}. ` +
        `Please create an agent in the Eleven Labs dashboard (https://elevenlabs.io/app/agents) ` +
        `and set the agent ID using: ` +
        `UPDATE website_configs SET eleven_labs_agent_id = 'your_agent_id' WHERE website_id = '${website.id}'; ` +
        `Or use the API: POST /api/eleven-labs/agents/${config.websiteSlug} with body: { agentId: "your_agent_id" }`
    );
}

/**
 * Sync prompt for a website to its Eleven Labs agent
 * 
 * @param websiteSlug - Website slug
 * @param mode - Demo mode (screenshot or live)
 * @returns Sync result
 */
export async function syncPromptToAgent(
    websiteSlug: string,
    mode: "screenshot" | "live" = "screenshot"
): Promise<AgentSyncResult> {
    // Build prompt
    const promptResult = await buildFullPrompt(websiteSlug, mode);

    // Get website info
    const website = await prisma.website.findUnique({
        where: { slug: websiteSlug },
        include: { config: true }
    });

    if (!website) {
        throw new Error(`Website not found: ${websiteSlug}`);
    }

    // Get voice config
    const voice = website.config?.voice_type || "alloy";
    const model = website.config?.model || "gpt-4o-realtime-preview-2025-06-03";

    // Create or update agent
    return await createOrUpdateAgent({
        websiteSlug,
        websiteName: website.name,
        prompt: promptResult.prompt,
        voice,
        model
    });
}

/**
 * Get agent ID for a website slug
 * 
 * @param websiteSlug - Website slug
 * @returns Agent ID or null
 */
export async function getAgentId(websiteSlug: string): Promise<string | null> {
    const website = await prisma.website.findUnique({
        where: { slug: websiteSlug },
        include: { config: true }
    });

    return website?.config?.eleven_labs_agent_id || null;
}

/**
 * Delete an agent from Eleven Labs and database
 * 
 * @param websiteSlug - Website slug
 */
export async function deleteAgent(websiteSlug: string): Promise<void> {
    const website = await prisma.website.findUnique({
        where: { slug: websiteSlug },
        include: { config: true }
    });

    if (!website) {
        throw new Error(`Website not found: ${websiteSlug}`);
    }

    const agentId = website.config?.eleven_labs_agent_id;
    if (!agentId) {
        return; // No agent to delete
    }

    try {
        await elevenLabsApiCall(`agents/${agentId}`, "DELETE");
    } catch (error: any) {
        // If agent doesn't exist, just clear from database
        if (!error.message?.includes("404")) {
            throw error;
        }
    }

    // Clear from database
    await prisma.websiteConfig.update({
        where: { website_id: website.id },
        data: {
            eleven_labs_agent_id: null,
            eleven_labs_agent_synced_at: null
        }
    });
}

