/**
 * Generate Prompt for Eleven Labs Agent
 * 
 * This script generates a prompt that you can copy into your Eleven Labs agent configuration.
 * It builds the full prompt from your database (including base prompts, mode prompts, etc.)
 * 
 * Usage:
 *   pnpm tsx scripts/generate-eleven-labs-prompt.ts --website hubspot
 *   pnpm tsx scripts/generate-eleven-labs-prompt.ts --website hubspot --mode live
 */

import { buildFullPrompt } from "../src/lib/prompt-builder";
import { prisma } from "../src/lib/database";

async function generatePrompt(websiteSlug: string, mode: "screenshot" | "live" = "screenshot") {
    try {
        console.log(`\n📝 Generating prompt for: ${websiteSlug} (mode: ${mode})\n`);

        const result = await buildFullPrompt(websiteSlug, mode);

        console.log("=".repeat(80));
        console.log("COPY THIS PROMPT INTO YOUR ELEVEN LABS AGENT:");
        console.log("=".repeat(80));
        console.log("\n");
        console.log(result.prompt);
        console.log("\n");
        console.log("=".repeat(80));
        console.log("\n");

        // Also save to file for easy copying
        const fs = await import("fs/promises");
        const filename = `eleven-labs-prompt-${websiteSlug}-${mode}.txt`;
        await fs.writeFile(filename, result.prompt, "utf-8");
        console.log(`✅ Prompt also saved to: ${filename}\n`);

        console.log("Next steps:");
        console.log("1. Go to https://elevenlabs.io/app/agents");
        console.log("2. Create or edit your agent");
        console.log("3. Paste the prompt above into the 'System Prompt' field");
        console.log("4. Save the agent");
        console.log("5. Copy the Agent ID and add it to .env as NEXT_PUBLIC_ELEVEN_AGENT_ID\n");
    } catch (error: any) {
        console.error("Error generating prompt:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const websiteIndex = args.indexOf("--website");
const modeIndex = args.indexOf("--mode");

if (websiteIndex < 0 || !args[websiteIndex + 1]) {
    console.error("Usage: pnpm tsx scripts/generate-eleven-labs-prompt.ts --website <slug> [--mode screenshot|live]");
    console.error("Example: pnpm tsx scripts/generate-eleven-labs-prompt.ts --website hubspot");
    process.exit(1);
}

const websiteSlug = args[websiteIndex + 1];
const mode = modeIndex >= 0 && args[modeIndex + 1] 
    ? (args[modeIndex + 1] as "screenshot" | "live")
    : "screenshot";

generatePrompt(websiteSlug, mode).catch(console.error);

