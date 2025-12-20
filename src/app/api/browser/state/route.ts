import { NextRequest, NextResponse } from 'next/server';
import { isRailwayConfigured, proxyGetState } from '@/lib/browser/railway-proxy';

/**
 * GET /api/browser/state - Get current page state
 * 
 * Proxies to Railway browser control service.
 * 
 * Query parameters:
 * - tabId: string (required)
 * - compact: "true" - Return AI-optimized compact state
 * - lite: "true" - Return minimal state (URL, title, element count)
 * - includeIframes: "true" - Include iframe content (full state only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const compact = searchParams.get('compact') === 'true';
    const lite = searchParams.get('lite') === 'true';
    const includeIframes = searchParams.get('includeIframes') === 'true';

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required' },
        { status: 400 }
      );
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured' },
        { status: 503 }
      );
    }

    // Proxy to Railway
    const result = await proxyGetState({
      tabId,
      compact,
      lite,
      includeIframes,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to get state' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
