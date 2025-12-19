import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteConfig, buildFullPrompt, DemoMode } from '@/lib/prompt-builder';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        
        // Get mode from query params (default: screenshot)
        const searchParams = request.nextUrl.searchParams;
        const mode = (searchParams.get('mode') || 'screenshot') as DemoMode;

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
                { status: 400 }
            );
        }

        // Validate mode
        if (mode !== 'screenshot' && mode !== 'live') {
            return NextResponse.json(
                { error: 'Invalid mode. Must be "screenshot" or "live"' },
                { status: 400 }
            );
        }

        // Get website configuration using the server-side function
        let config;
        try {
            config = await getWebsiteConfig(websiteSlug);
        } catch (error) {
            console.error('Error getting website config:', error);
            return NextResponse.json(
                { error: 'Website configuration not found' },
                { status: 404 }
            );
        }

        // Build the final combined prompt with mode-specific instructions
        let finalPrompt = "No prompt available";
        let promptMeta = {
            mode,
            routeCount: 0,
            screenshotCount: 0,
        };

        try {
            const result = await buildFullPrompt(websiteSlug, mode);
            finalPrompt = result.prompt;
            promptMeta = {
                mode: result.mode,
                routeCount: result.routes.length,
                screenshotCount: result.screenshotCount,
            };
        } catch (error) {
            console.warn('Failed to build full prompt, using fallback:', error);
            finalPrompt = `# ${config.website.name} Agent Instructions

You are an AI assistant specialized in ${config.website.name}. Help users navigate and understand the platform's features.

## Mode: ${mode.toUpperCase()}

## Available Screenshots
${config.screenshots.length > 0 ? config.screenshots.map(s => `- ${s.filename}: ${s.annotation || 'No description'}`).join('\n') : 'No screenshots available'}

## Website Description
${config.website.description || 'No description provided'}`;
        }

        return NextResponse.json({
            website: config.website,
            screenshots: config.screenshots,
            system_prompt: config.system_prompt,
            final_prompt: finalPrompt,
            prompt_meta: promptMeta,
        });
    } catch (error) {
        console.error('Error fetching verification data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch verification data' },
            { status: 500 }
        );
    }
}
