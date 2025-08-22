#!/usr/bin/env node

import { testDatabaseConnection } from "./src/lib/database.js";
import { s3Client } from "./src/lib/s3.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

async function testConnections() {
    console.log("🧪 Testing infrastructure connections...\n");

    // Test database
    console.log("📊 Testing database connection...");
    try {
        const dbConnected = await testDatabaseConnection();
        if (dbConnected) {
            console.log("✅ Database connection successful");
        } else {
            console.log("❌ Database connection failed");
        }
    } catch (error) {
        console.log("❌ Database connection error:", error.message);
    }

    // Test S3
    console.log("\n🪣 Testing S3 connection...");
    try {
        if (!process.env.AWS_S3_BUCKET) {
            console.log("⚠️  AWS_S3_BUCKET not set - skipping S3 test");
        } else {
            const command = new ListObjectsV2Command({
                Bucket: process.env.AWS_S3_BUCKET,
                MaxKeys: 1,
            });

            await s3Client.send(command);
            console.log("✅ S3 connection successful");
        }
    } catch (error) {
        console.log("❌ S3 connection error:", error.message);
    }

    // Test environment variables
    console.log("\n🔧 Checking environment variables...");
    const required = ["DATABASE_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"];
    const optional = ["AWS_REGION", "NEXT_PUBLIC_DASHBOARD_ENABLED"];

    for (const env of required) {
        if (process.env[env]) {
            console.log(`✅ ${env} is set`);
        } else {
            console.log(`❌ ${env} is NOT set`);
        }
    }

    for (const env of optional) {
        if (process.env[env]) {
            console.log(`✅ ${env} is set (${process.env[env]})`);
        } else {
            console.log(`⚠️  ${env} is not set`);
        }
    }

    console.log("\n🎯 Setup complete! Run the following commands:");
    console.log("1. npm run db:generate");
    console.log("2. npm run db:setup");
    console.log("3. npm run s3:upload-screenshots");
    console.log("4. npm run s3:upload-prompts");
    console.log("5. npm run dev");
}

// Run the test
if (require.main === module) {
    testConnections().catch(console.error);
}

module.exports = { testConnections };
