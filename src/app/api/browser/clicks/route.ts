import { NextRequest, NextResponse } from 'next/server';
import { isRailwayConfigured, proxyGetClicks } from '@/lib/browser/railway-proxy';

/**
 * GET /api/browser/clicks - Get recent click events
 * 
 * Query params:
 * - tabId: string (required) - Tab ID for the session
 * - since: timestamp (optional) - only return clicks after this timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const since = searchParams.get('since');

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
    const result = await proxyGetClicks({
      tabId,
      since: since ? parseInt(since, 10) : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to get clicks' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

