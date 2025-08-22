import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteConfig } from '@/lib/prompt-builder';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
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

        // Build the final combined prompt with error handling
        let finalPrompt = "No prompt available";
        try {
            const { buildCombinedPrompt } = await import('@/lib/prompt-builder');
            finalPrompt = await buildCombinedPrompt(websiteSlug);
        } catch (error) {
            console.warn('Failed to build combined prompt, using fallback:', error);
            finalPrompt = `# ${config.website.name} Agent Instructions

You are an AI assistant specialized in ${config.website.name}. Help users navigate and understand the platform's features.

## Available Screenshots
${config.screenshots.length > 0 ? config.screenshots.map(s => `- ${s.filename}: ${s.annotation || 'No description'}`).join('\n') : 'No screenshots available'}

## Website Description
${config.website.description || 'No description provided'}`;
        }

        // Get agent config for comparison (with fallback)
        let agentConfig = null;
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const agentConfigResponse = await fetch(`${baseUrl}/api/agent/config/${websiteSlug}`, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (agentConfigResponse.ok) {
                agentConfig = await agentConfigResponse.json();
            }
        } catch (error) {
            console.warn('Failed to fetch agent config, using built prompt:', error);
            // Use the built prompt as fallback
        }

        return NextResponse.json({
            website: config.website,
            screenshots: config.screenshots,
            system_prompt: config.system_prompt,
            final_prompt: agentConfig?.system_prompt || finalPrompt
        });
    } catch (error) {
        console.error('Error fetching verification data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch verification data' },
            { status: 500 }
        );
    }
}
