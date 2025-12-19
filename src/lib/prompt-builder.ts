import { prisma } from './database';
import { s3Client, DEFAULT_S3_BUCKET, getSignedS3Url } from './s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { ParsedRoute, generateRouteDescriptions } from './navigation-parser';
import { promises as fs } from 'fs';
import path from 'path';

export type DemoMode = 'screenshot' | 'live';

/**
 * Load a prompt file from the local public/prompts directory
 */
async function loadLocalPrompt(filename: string): Promise<string> {
    try {
        const promptPath = path.join(process.cwd(), 'public', 'prompts', filename);
        return await fs.readFile(promptPath, 'utf-8');
    } catch (error) {
        console.warn(`Failed to load local prompt: ${filename}`, error);
        return '';
    }
}

/**
 * Generate screenshot catalog section for screenshot mode
 */
function generateScreenshotCatalog(screenshots: Array<{ filename: string; annotation?: string | null }>): string {
    if (!screenshots || screenshots.length === 0) {
        return '';
    }

    const catalogEntries = screenshots
        .map(s => `- **${s.filename}**: ${s.annotation || 'No description'}`)
        .join('\n');

    return `
## Available Screenshots

Use \`screenshot_set_view(name)\` to display these views:

${catalogEntries}

**Usage:**
- Call \`screenshot_list_views()\` to see all options
- Call \`screenshot_set_view('filename')\` to display a specific view
`;
}

/**
 * Generate navigation routes section for prompt injection
 */
function generateNavigationSection(
    websiteName: string,
    routes: ParsedRoute[],
    websiteSlug: string
): string {
    if (!routes || routes.length === 0) {
        return '';
    }

    const toolName = `navigate_${websiteSlug.replace(/-/g, '_')}`;
    const routeDescriptions = generateRouteDescriptions(routes);

    return `
## ${websiteName} Navigation Routes

You have a special navigation tool called \`${toolName}\` for fast navigation.
Use this tool instead of clicking through menus whenever possible.

Available routes:
${routeDescriptions}

**Navigation Tips:**
- Always use \`${toolName}\` for predefined pages - it's faster than clicking
- Use \`browser_navigate\` for URLs not in the predefined routes
- After navigation, use \`browser_get_state\` to understand the page
`;
}

/**
 * Build the full combined prompt with mode-specific instructions
 * This is the PRIMARY function for getting the complete agent prompt
 */
export async function buildFullPrompt(websiteSlug: string, mode: DemoMode = 'screenshot'): Promise<{
    prompt: string;
    mode: DemoMode;
    routes: ParsedRoute[];
    baseUrl: string;
    websiteName: string;
    screenshotCount: number;
}> {
    try {
        // 1. Load base prompt (website-agnostic methodology)
        const basePrompt = await loadLocalPrompt('base-prompt.md');

        // 2. Load mode-specific instructions
        const livePrompt = await loadLocalPrompt('live_mode.md');
        const screenshotPrompt = await loadLocalPrompt('screenshot_mode.md');

        // 3. Get the website with config
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true }
        });

        if (!website) {
            throw new Error(`Website not found: ${websiteSlug}`);
        }

        // 4. Get the active website-specific prompt from S3
        const activePrompt = await prisma.systemPrompt.findFirst({
            where: {
                website: { slug: websiteSlug },
                is_active: true
            }
        });

        let websitePrompt = '';
        if (activePrompt) {
            websitePrompt = await loadPromptFromS3(activePrompt.s3_key, activePrompt.s3_bucket || DEFAULT_S3_BUCKET);
        }

        // 5. Load screenshots from database
        const screenshots = await prisma.screenshot.findMany({
            where: {
                website: { slug: websiteSlug },
                is_active: true
            },
            orderBy: { sort_order: 'asc' }
        });

        // 6. Get routes and base URL
        const routes = (website.config?.nav_routes_json as unknown as ParsedRoute[]) || [];
        const baseUrl = website.config?.base_url || '';

        // 7. Generate navigation section
        const navigationSection = routes.length > 0
            ? generateNavigationSection(website.name, routes, websiteSlug)
            : '';

        // 8. Generate screenshot catalog
        const screenshotCatalog = screenshots.length > 0
            ? generateScreenshotCatalog(screenshots)
            : '';

        // 9. Build the final combined prompt
        const sections: string[] = [];

        // Mode Status
        sections.push(`# Current Active Mode: ${mode.toUpperCase()}\n\nYou MUST follow the instructions for the ${mode.toUpperCase()} mode below.`);

        // Base methodology prompt
        if (basePrompt) {
            sections.push(basePrompt);
        }

        // Mode-specific instructions (Include BOTH so agent knows how to switch)
        if (livePrompt) {
            sections.push(`---\n\n## MODE: LIVE BROWSER\n\n${livePrompt}`);
        }

        if (screenshotPrompt) {
            sections.push(`---\n\n## MODE: SCREENSHOTS\n\n${screenshotPrompt}`);
        }

        // Website-specific configuration
        if (websitePrompt) {
            sections.push(`---\n\n## WEBSITE-SPECIFIC INSTRUCTIONS: ${website.name}\n\n${websitePrompt}`);
        }

        // Navigation routes
        if (navigationSection) {
            sections.push(`---\n\n${navigationSection}`);
        }

        // Screenshot catalog
        if (screenshotCatalog) {
            sections.push(`---\n\n${screenshotCatalog}`);
        }

        let finalPrompt = sections.join('\n\n');

        // Replace all template placeholders
        finalPrompt = finalPrompt
            .replace(/\{\{WEBSITE_NAME\}\}/g, website.name)
            .replace(/\{\{WEBSITE_SLUG\}\}/g, websiteSlug)
            .replace(/\{\{BASE_URL\}\}/g, baseUrl)
            .replace(/\{\{PORTAL_ID\}\}/g, website.config?.portal_id || '')
            .replace(/\{\{DEMO_MODE\}\}/g, mode);

        return {
            prompt: finalPrompt,
            mode,
            routes,
            baseUrl,
            websiteName: website.name,
            screenshotCount: screenshots.length,
        };
    } catch (error) {
        console.error('Error building full prompt:', error);
        throw new Error('Failed to build full prompt');
    }
}

/**
 * Build combined prompt for screenshot mode (legacy compatibility)
 */
export async function buildCombinedPrompt(websiteSlug: string): Promise<string> {
    const result = await buildFullPrompt(websiteSlug, 'screenshot');
    return result.prompt;
}

/**
 * Build a prompt with dynamic route injection (for live browser mode)
 * Now uses the unified buildFullPrompt function
 */
export async function buildLiveBrowserPrompt(websiteSlug: string): Promise<{
    prompt: string;
    routes: ParsedRoute[];
    baseUrl: string;
    websiteName: string;
}> {
    const result = await buildFullPrompt(websiteSlug, 'live');
    return {
        prompt: result.prompt,
        routes: result.routes,
        baseUrl: result.baseUrl,
        websiteName: result.websiteName,
    };
}

export async function loadPromptFromS3(key: string, bucket?: string): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: bucket || DEFAULT_S3_BUCKET!,
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
                s3_url: await getSignedS3Url(screenshot.s3_key, 3600, screenshot.s3_bucket || DEFAULT_S3_BUCKET)
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
