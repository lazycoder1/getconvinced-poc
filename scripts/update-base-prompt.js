#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");

async function main() {
    try {
        const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_REGION || "us-east-1";

        if (!bucket) {
            console.error("❌ Missing AWS_S3_BUCKET or AWS_S3_BUCKET_NAME in environment");
            process.exit(1);
        }

        const args = process.argv.slice(2);
        let content = "";
        let source = "";

        if (args[0] === "--file" && args[1]) {
            content = fs.readFileSync(args[1], "utf8");
            source = args[1];
        } else if (args[0] === "--text" && args[1]) {
            content = args.slice(1).join(" ");
            source = "inline text";
        } else if (!process.stdin.isTTY) {
            // Read from stdin when piped
            content = fs.readFileSync(0, "utf8");
            source = "stdin";
        } else {
            console.error(
                'Usage: node scripts/update-base-prompt.js --file path.md | --text "..." | echo "..." | node scripts/update-base-prompt.js'
            );
            process.exit(1);
        }

        const client = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const key = "shared/base-prompts/default-agent-instructions.md";

        await client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: content,
                ContentType: "text/markdown",
            })
        );

        console.log(`✅ Base prompt updated (${content.length} bytes) → s3://${bucket}/${key} (source: ${source})`);
    } catch (err) {
        console.error("❌ Failed to update base prompt:", err);
        process.exit(1);
    }
}

main();
