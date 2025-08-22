#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function uploadScreenshotsToS3() {
    try {
        console.log("📤 Starting screenshot upload to S3...");

        // Get all screenshots from database
        const screenshots = await prisma.screenshot.findMany({
            include: { website: true },
        });

        console.log(`Found ${screenshots.length} screenshots to upload`);

        for (const screenshot of screenshots) {
            const localPath = path.join(process.cwd(), "public", "screenshots", screenshot.filename);

            if (!fs.existsSync(localPath)) {
                console.log(`⚠️  File not found: ${localPath}`);
                continue;
            }

            const fileBuffer = fs.readFileSync(localPath);
            const contentType = getContentType(screenshot.filename);

            console.log(`Uploading: ${screenshot.filename}...`);

            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: screenshot.s3_key,
                Body: fileBuffer,
                ContentType: contentType,
            });

            await s3Client.send(command);

            // Update screenshot record with file size
            await prisma.screenshot.update({
                where: { id: screenshot.id },
                data: {
                    file_size_bytes: fileBuffer.length,
                    s3_bucket: process.env.AWS_S3_BUCKET,
                },
            });

            console.log(`✅ Uploaded: ${screenshot.filename}`);
        }

        console.log("🎉 All screenshots uploaded successfully!");
    } catch (error) {
        console.error("❌ Upload failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".webp":
            return "image/webp";
        default:
            return "application/octet-stream";
    }
}

// Run the upload
if (require.main === module) {
    uploadScreenshotsToS3();
}

module.exports = { uploadScreenshotsToS3 };
