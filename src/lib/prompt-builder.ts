import { prisma } from './database';
import { s3Client } from './s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function buildCombinedPrompt(websiteSlug: string): Promise<string> {
    try {
        // 1. Load base prompt from S3
        const basePrompt = await loadPromptFromS3('shared/base-prompts/default-agent-instructions.md');

        // 2. Get the active system prompt from database
        const activePrompt = await prisma.systemPrompt.findFirst({
            where: {
                website: { slug: websiteSlug },
                is_active: true
            }
        });

        let websitePrompt = '# Default Instructions\nPlease provide instructions for this agent.';

        if (activePrompt) {
            // Load the actual prompt content from S3 using the stored key
            websitePrompt = await loadPromptFromS3(activePrompt.s3_key);
        }

        // 3. Load screenshot annotations from database
        const screenshots = await prisma.screenshot.findMany({
            where: {
                website: { slug: websiteSlug },
                is_active: true
            },
            orderBy: { sort_order: 'asc' }
        });

        // 4. Combine into final prompt
        const screenshotSection = screenshots
            .map(s => `Screenshot: ${s.filename}\nDescription: ${s.annotation || 'No description'}\n`)
            .join('\n');

        return `${basePrompt}\n\n---\n\nWEBSITE-SPECIFIC CONFIGURATION:\n${websitePrompt}\n\n---\n\nSCREENSHOTS:\n${screenshotSection}`;
    } catch (error) {
        console.error('Error building combined prompt:', error);
        throw new Error('Failed to build combined prompt');
    }
}

export async function loadPromptFromS3(key: string): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
        });

        const response = await s3Client.send(command);
        return response.Body?.transformToString() || '';
    } catch (error) {
        console.warn(`Failed to load prompt from S3: ${key}`, error);
        return `# Default Instructions\nPlease provide instructions for this agent.`;
    }
}

export async function getWebsiteConfig(websiteSlug: string) {
    try {
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            throw new Error(`Website not found: ${websiteSlug}`);
        }

        const screenshots = await prisma.screenshot.findMany({
            where: {
                website_id: website.id,
                is_active: true
            },
            orderBy: { sort_order: 'asc' }
        });

        // Generate signed URLs for screenshots
        const screenshotsWithUrls = await Promise.all(
            screenshots.map(async (screenshot) => ({
                ...screenshot,
                s3_url: await import('./s3').then(m => m.getSignedS3Url(screenshot.s3_key))
            }))
        );

        // Get the active system prompt
        const systemPrompt = await prisma.systemPrompt.findFirst({
            where: {
                website_id: website.id,
                is_active: true
            }
        });

        return {
            website,
            screenshots: screenshotsWithUrls,
            system_prompt: systemPrompt
        };
    } catch (error) {
        console.error('Error getting website config:', error);
        throw error;
    }
}
