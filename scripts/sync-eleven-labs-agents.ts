/**
 * Sync Eleven Labs Agents Script
 * 
 * This script syncs all websites to their corresponding Eleven Labs agents.
 * It creates agents if they don't exist, or updates them if they do.
 * 
 * Usage:
 *   pnpm tsx scripts/sync-eleven-labs-agents.ts
 *   pnpm tsx scripts/sync-eleven-labs-agents.ts --website hubspot
 */

import { prisma } from "../src/lib/database";
import { syncPromptToAgent } from "../src/lib/voice-agent/eleven-labs-agent-sync";

async function syncAllAgents(websiteSlug?: string) {
    try {
        // Get websites to sync
        const where = websiteSlug ? { slug: websiteSlug } : {};
        const websites = await prisma.website.findMany({
            where,
            include: { config: true }
        });

        if (websites.length === 0) {
            console.log(`No websites found${websiteSlug ? ` with slug: ${websiteSlug}` : ""}`);
            return;
        }

        console.log(`\n🔄 Syncing ${websites.length} website(s) to Eleven Labs agents...\n`);

        for (const website of websites) {
            try {
                console.log(`📦 Processing: ${website.name} (${website.slug})`);

                // Sync for screenshot mode (default)
                const result = await syncPromptToAgent(website.slug, "screenshot");

                if (result.created) {
                    console.log(`  ✅ Created new agent: ${result.agentId}`);
                } else {
                    console.log(`  ✅ Updated existing agent: ${result.agentId}`);
                }
                console.log(`  📅 Synced at: ${result.syncedAt.toISOString()}\n`);
            } catch (error: any) {
                console.error(`  ❌ Error syncing ${website.slug}:`, error.message);
                console.error(`     ${error.stack}\n`);
            }
        }

        console.log("✨ Sync complete!");
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const websiteIndex = args.indexOf("--website");
const websiteSlug = websiteIndex >= 0 && args[websiteIndex + 1] 
    ? args[websiteIndex + 1] 
    : undefined;

// Run sync
syncAllAgents(websiteSlug).catch(console.error);

