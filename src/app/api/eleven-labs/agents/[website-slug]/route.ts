import { NextRequest, NextResponse } from "next/server";
import { 
    syncPromptToAgent, 
    getAgentId, 
    deleteAgent,
    createOrUpdateAgent 
} from "@/lib/voice-agent/eleven-labs-agent-sync";
import { buildFullPrompt } from "@/lib/prompt-builder";
import { prisma } from "@/lib/database";

/**
 * GET /api/eleven-labs/agents/[website-slug]
 * 
 * Get the Eleven Labs agent ID for a website slug.
 * Returns the agent ID from the database, or null if not configured.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];

        if (!websiteSlug) {
            return NextResponse.json(
                { error: "Website slug is required" },
                { status: 400 }
            );
        }

        const agentId = await getAgentId(websiteSlug);

        // Get website for additional info
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true }
        });

        // Primary: database-stored agent ID
        // Fallback: environment variable (single agent mode)
        const finalAgentId = agentId || process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID || null;

        return NextResponse.json({
            websiteSlug,
            agentId: finalAgentId,
            source: agentId ? "database" : (process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID ? "environment" : "none"),
            syncedAt: website?.config?.eleven_labs_agent_synced_at || null,
        });
    } catch (error) {
        console.error("Error fetching agent ID:", error);
        return NextResponse.json(
            { error: "Failed to fetch agent ID" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/eleven-labs/agents/[website-slug]
 * 
 * Store an agent ID for a website slug, or sync prompt if agent exists.
 * 
 * Body options:
 * - { agentId: "..." } - Store a manually created agent ID
 * - { mode: "screenshot" } - Sync prompt to existing agent
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];
        const body = await request.json().catch(() => ({}));

        if (!websiteSlug) {
            return NextResponse.json(
                { error: "Website slug is required" },
                { status: 400 }
            );
        }

        // If agentId is provided, store it
        if (body.agentId) {
            const website = await prisma.website.findUnique({
                where: { slug: websiteSlug },
                include: { config: true }
            });

            if (!website) {
                return NextResponse.json(
                    { error: "Website not found" },
                    { status: 404 }
                );
            }

            await prisma.websiteConfig.upsert({
                where: { website_id: website.id },
                update: {
                    eleven_labs_agent_id: body.agentId,
                    eleven_labs_agent_synced_at: new Date()
                },
                create: {
                    website_id: website.id,
                    base_url: "",
                    eleven_labs_agent_id: body.agentId,
                    eleven_labs_agent_synced_at: new Date()
                }
            });

            return NextResponse.json({
                success: true,
                agentId: body.agentId,
                message: `Stored agent ID: ${body.agentId}`
            });
        }

        // Otherwise, try to sync prompt
        const mode = body.mode || "screenshot";
        const result = await syncPromptToAgent(websiteSlug, mode);

        return NextResponse.json({
            success: true,
            agentId: result.agentId,
            created: result.created,
            syncedAt: result.syncedAt,
            message: result.created 
                ? `Created new agent: ${result.agentId}`
                : `Updated existing agent: ${result.agentId}`
        });
    } catch (error: any) {
        console.error("Error syncing agent:", error);
        return NextResponse.json(
            { 
                error: "Failed to sync agent",
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/eleven-labs/agents/[website-slug]
 * 
 * Update an existing agent's prompt.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];
        const body = await request.json().catch(() => ({}));
        const mode = body.mode || "screenshot";

        if (!websiteSlug) {
            return NextResponse.json(
                { error: "Website slug is required" },
                { status: 400 }
            );
        }

        const result = await syncPromptToAgent(websiteSlug, mode);

        return NextResponse.json({
            success: true,
            agentId: result.agentId,
            syncedAt: result.syncedAt,
            message: `Updated agent prompt: ${result.agentId}`
        });
    } catch (error: any) {
        console.error("Error updating agent:", error);
        return NextResponse.json(
            { 
                error: "Failed to update agent",
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/eleven-labs/agents/[website-slug]
 * 
 * Delete an agent from Eleven Labs and clear from database.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];

        if (!websiteSlug) {
            return NextResponse.json(
                { error: "Website slug is required" },
                { status: 400 }
            );
        }

        await deleteAgent(websiteSlug);

        return NextResponse.json({
            success: true,
            message: `Deleted agent for ${websiteSlug}`
        });
    } catch (error: any) {
        console.error("Error deleting agent:", error);
        return NextResponse.json(
            { 
                error: "Failed to delete agent",
                details: error.message 
            },
            { status: 500 }
        );
    }
}
