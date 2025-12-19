/**
 * Store Eleven Labs Agent ID Script
 * 
 * Since Eleven Labs agents are typically created via dashboard,
 * this script helps store the agent ID in the database.
 * 
 * Usage:
 *   pnpm tsx scripts/store-eleven-labs-agent-id.ts --website hubspot --agent-id your_agent_id
 */

import { prisma } from "../src/lib/database";

async function storeAgentId(websiteSlug: string, agentId: string) {
    try {
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true }
        });

        if (!website) {
            console.error(`❌ Website not found: ${websiteSlug}`);
            process.exit(1);
        }

        await prisma.websiteConfig.upsert({
            where: { website_id: website.id },
            update: {
                eleven_labs_agent_id: agentId,
                eleven_labs_agent_synced_at: new Date()
            },
            create: {
                website_id: website.id,
                base_url: website.config?.base_url || "",
                eleven_labs_agent_id: agentId,
                eleven_labs_agent_synced_at: new Date()
            }
        });

        console.log(`✅ Stored agent ID for ${website.name} (${websiteSlug}): ${agentId}`);
    } catch (error) {
        console.error("Error storing agent ID:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const websiteIndex = args.indexOf("--website");
const agentIdIndex = args.indexOf("--agent-id");

if (websiteIndex < 0 || agentIdIndex < 0 || !args[websiteIndex + 1] || !args[agentIdIndex + 1]) {
    console.error("Usage: pnpm tsx scripts/store-eleven-labs-agent-id.ts --website <slug> --agent-id <agent_id>");
    console.error("Example: pnpm tsx scripts/store-eleven-labs-agent-id.ts --website hubspot --agent-id abc123");
    process.exit(1);
}

const websiteSlug = args[websiteIndex + 1];
const agentId = args[agentIdIndex + 1];

storeAgentId(websiteSlug, agentId).catch(console.error);

