#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function setupDashboard() {
    try {
        console.log("🚀 Setting up dashboard database...");

        // Test database connection
        await prisma.$connect();
        console.log("✅ Database connected successfully");

        // Create HubSpot website
        const hubspot = await prisma.website.upsert({
            where: { slug: "hubspot" },
            update: {},
            create: {
                name: "HubSpot",
                slug: "hubspot",
                description: "HubSpot CRM system for sales and marketing automation",
            },
        });

        console.log("✅ HubSpot website created:", hubspot.name);

        // Get existing screenshots from public/screenshots
        const screenshotsDir = path.join(process.cwd(), "public", "screenshots");
        const screenshotFiles = fs
            .readdirSync(screenshotsDir)
            .filter((file) => file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg"));

        console.log(`📸 Found ${screenshotFiles.length} existing screenshots`);

        // Create screenshot records (without uploading to S3 for now)
        for (let i = 0; i < screenshotFiles.length; i++) {
            const filename = screenshotFiles[i];
            const s3Key = `agent-configs/hubspot/screenshots/${filename}`;

            await prisma.screenshot.upsert({
                where: {
                    website_id_filename: {
                        website_id: hubspot.id,
                        filename: filename,
                    },
                },
                update: {},
                create: {
                    website_id: hubspot.id,
                    filename: filename,
                    s3_key: s3Key,
                    s3_bucket: process.env.AWS_S3_BUCKET || "placeholder-bucket",
                    description: filename.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, ""),
                    sort_order: i,
                },
            });
        }

        console.log("✅ Screenshots added to database");

        // Create a sample system prompt
        const samplePrompt = await prisma.systemPrompt.upsert({
            where: {
                website_id_name: {
                    website_id: hubspot.id,
                    name: "Default HubSpot Prompt",
                },
            },
            update: {},
            create: {
                website_id: hubspot.id,
                name: "Default HubSpot Prompt",
                description: "Default system prompt for HubSpot agent",
                s3_key: "agent-configs/hubspot/prompts/default.md",
                s3_bucket: process.env.AWS_S3_BUCKET || "placeholder-bucket",
                is_active: true,
            },
        });

        console.log("✅ System prompt created");

        console.log("\n🎉 Dashboard setup complete!");
        console.log("\nNext steps:");
        console.log("1. Set your DATABASE_URL in .env.local");
        console.log("2. Set your AWS credentials in .env.local");
        console.log("3. Run: npx prisma generate");
        console.log("4. Upload screenshots to S3: node scripts/upload-screenshots.js");
        console.log("5. Upload system prompts to S3: node scripts/upload-prompts.js");
    } catch (error) {
        console.error("❌ Setup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Handle compound unique constraint for screenshots
if (process.argv.includes("--fix-constraints")) {
    // This would need to be run after manual schema adjustment
    console.log("Fixing database constraints...");
    // Add logic to handle existing duplicate data
} else {
    setupDashboard();
}
