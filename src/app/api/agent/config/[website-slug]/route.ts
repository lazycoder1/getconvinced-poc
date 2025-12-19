import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteConfig, buildFullPrompt } from '@/lib/prompt-builder';
import { prisma } from '@/lib/database';
import { ParsedRoute } from '@/lib/navigation-parser';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('mode') || 'screenshot'; // 'screenshot' or 'live'

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
                { status: 400 }
            );
        }

        // Get website configuration
        const config = await getWebsiteConfig(websiteSlug);

        if (!config) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Get website config for voice settings and navigation routes
        const websiteWithConfig = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: {
                config: true
            }
        }) as any; // Cast to any to avoid Prisma include typing issues

        // Build the combined prompt with mode-aware unified builder
        let combinedPrompt = '';
        let navigationRoutes: ParsedRoute[] = [];
        let baseUrl = '';

        try {
            // Use the new unified prompt builder
            const result = await buildFullPrompt(websiteSlug, mode as any);
            combinedPrompt = result.prompt;
            navigationRoutes = result.routes;
            baseUrl = result.baseUrl;
        } catch (error) {
            console.warn('Failed to build full prompt, using basic fallback:', error);
            combinedPrompt = '# Default Agent Instructions\n\nYou are an AI assistant specialized in demoing software.';
        }

        // Get voice config from database or use defaults
        const voiceConfig = {
            voice: websiteWithConfig?.config?.voice_type || 'alloy',
            model: websiteWithConfig?.config?.model || 'gpt-4o-realtime-preview-2025-06-03'
        };

        // Return the complete configuration
        const agentConfig = {
            website: config.website,
            system_prompt: combinedPrompt,
            screenshots: config.screenshots.sort((a: any, b: any) => {
                // Default screenshot comes first, then by sort_order, then by created_at
                if (a.is_default && !b.is_default) return -1;
                if (!a.is_default && b.is_default) return 1;
                if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }),
            voice_config: voiceConfig,
            // Always provide browser config if routes are available, so agent has the tools
            browser_config: navigationRoutes.length > 0 || baseUrl ? {
                navigation_routes: navigationRoutes,
                base_url: baseUrl,
                default_url: websiteWithConfig?.config?.default_url || baseUrl,
                has_cookies: !!(websiteWithConfig?.config?.cookies_json),
                cookie_count: Array.isArray(websiteWithConfig?.config?.cookies_json)
                    ? websiteWithConfig.config.cookies_json.length
                    : 0,
            } : undefined,
            mode,
            timestamp: new Date().toISOString()
        };

        return NextResponse.json(agentConfig);

    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
