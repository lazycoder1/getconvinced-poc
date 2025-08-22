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

async function uploadPromptsToS3() {
    try {
        console.log("📝 Starting system prompt upload to S3...");

        // Get all system prompts from database
        const prompts = await prisma.systemPrompt.findMany({
            include: { website: true },
        });

        console.log(`Found ${prompts.length} system prompts to upload`);

        for (const prompt of prompts) {
            // For now, create a default prompt content
            const promptContent = await generatePromptContent(prompt.website.slug);

            console.log(`Uploading prompt for ${prompt.website.name}...`);

            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: prompt.s3_key,
                Body: promptContent,
                ContentType: "text/markdown",
            });

            await s3Client.send(command);

            // Update prompt record with file size
            await prisma.systemPrompt.update({
                where: { id: prompt.id },
                data: {
                    file_size_bytes: Buffer.byteLength(promptContent),
                    s3_bucket: process.env.AWS_S3_BUCKET,
                },
            });

            console.log(`✅ Uploaded prompt: ${prompt.name}`);
        }

        // Upload base prompts
        await uploadBasePrompts();

        console.log("🎉 All prompts uploaded successfully!");
    } catch (error) {
        console.error("❌ Upload failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

async function generatePromptContent(websiteSlug) {
    if (websiteSlug === "hubspot") {
        return `# HubSpot Agent Instructions

You are an AI assistant specialized in HubSpot CRM. You help users navigate and understand HubSpot's features and capabilities.

## Your Role
- Guide users through HubSpot's interface and features
- Explain how to perform common tasks in HubSpot
- Provide best practices for using HubSpot effectively
- Help users understand HubSpot's terminology and concepts

## Available Screenshots
You have access to various screenshots of the HubSpot interface that will be provided to you. Use these screenshots to guide users to specific features and show them what to look for.

## Interaction Style
- Be helpful and patient
- Explain things clearly and step by step
- Use the screenshots to provide visual guidance
- Ask clarifying questions when needed
- Provide multiple solutions when appropriate

Remember to reference the screenshots provided to help users visually navigate HubSpot's interface.`;
    }

    return `# Agent Instructions for ${websiteSlug}

You are an AI assistant specialized in helping users with ${websiteSlug}.

## Your Role
- Guide users through the interface and features
- Explain how to perform common tasks
- Provide best practices
- Help users understand terminology and concepts

## Available Screenshots
You have access to various screenshots that will be provided to you. Use these screenshots to guide users to specific features.

## Interaction Style
- Be helpful and patient
- Explain things clearly and step by step
- Use the screenshots to provide visual guidance
- Ask clarifying questions when needed`;
}

async function uploadBasePrompts() {
    const basePrompts = {
        "shared/base-prompts/default-agent-instructions.md": `# Default Agent Instructions

You are an AI assistant that helps users navigate and understand software applications. You have access to screenshots and specific instructions for each application you support.

## General Guidelines
- Always reference the screenshots provided to you when explaining features
- Be patient and explain concepts clearly
- Provide step-by-step guidance
- Ask for clarification when needed
- Use the application's terminology appropriately

## Screenshot Usage
- Screenshots are provided to help you understand the current interface
- Reference specific elements in screenshots when guiding users
- Use visual cues from screenshots to explain where to click or what to look for

## Communication Style
- Professional but friendly
- Clear and concise
- Visual when possible
- Action-oriented guidance`,
    };

    for (const [key, content] of Object.entries(basePrompts)) {
        console.log(`Uploading base prompt: ${key}`);

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: content,
            ContentType: "text/markdown",
        });

        await s3Client.send(command);
        console.log(`✅ Uploaded base prompt: ${key}`);
    }
}

// Run the upload
if (require.main === module) {
    uploadPromptsToS3();
}

module.exports = { uploadPromptsToS3 };
