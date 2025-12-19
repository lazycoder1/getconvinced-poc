import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteConfig, buildFullPrompt } from '@/lib/prompt-builder';
import { prisma } from '@/lib/database';
import { ParsedRoute } from '@/lib/navigation-parser';

// Cache TTL: 5 minutes for browser caching
const CACHE_MAX_AGE = 300;

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

        // Fetch website config and build prompt in PARALLEL (performance optimization)
        const [config, promptResult] = await Promise.all([
            getWebsiteConfig(websiteSlug),
            buildFullPrompt(websiteSlug, mode as any).catch((error) => {
                console.warn('Failed to build full prompt, using fallback:', error);
                return {
                    prompt: '# Default Agent Instructions\n\nYou are an AI assistant specialized in demoing software.',
                    routes: [] as ParsedRoute[],
                    baseUrl: '',
                    websiteName: '',
                    screenshotCount: 0,
                    mode: mode as any,
                };
            }),
        ]);

        if (!config) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Get website config for voice settings (single query, includes config relation)
        const websiteWithConfig = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true }
        }) as any;

        // Get voice config from database or use defaults
        const voiceConfig = {
            voice: websiteWithConfig?.config?.voice_type || 'alloy',
            model: websiteWithConfig?.config?.model || 'gpt-4o-realtime-preview-2025-06-03'
        };

        // Return the complete configuration
        const agentConfig = {
            website: config.website,
            system_prompt: promptResult.prompt,
            screenshots: config.screenshots.sort((a: any, b: any) => {
                // Default screenshot comes first, then by sort_order, then by created_at
                if (a.is_default && !b.is_default) return -1;
                if (!a.is_default && b.is_default) return 1;
                if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }),
            voice_config: voiceConfig,
            browser_config: promptResult.routes.length > 0 || promptResult.baseUrl ? {
                navigation_routes: promptResult.routes,
                base_url: promptResult.baseUrl,
                default_url: websiteWithConfig?.config?.default_url || promptResult.baseUrl,
                has_cookies: !!(websiteWithConfig?.config?.cookies_json),
                cookie_count: Array.isArray(websiteWithConfig?.config?.cookies_json)
                    ? websiteWithConfig.config.cookies_json.length
                    : 0,
            } : undefined,
            mode,
            timestamp: new Date().toISOString()
        };

        // Return with cache headers (5 minute browser cache, revalidate in background)
        return NextResponse.json(agentConfig, {
            headers: {
                'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=60`,
            },
        });

    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
