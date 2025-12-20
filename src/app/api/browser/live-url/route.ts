import { NextRequest, NextResponse } from 'next/server';
import { isRailwayConfigured, proxyGetLiveUrl } from '@/lib/browser/railway-proxy';

/**
 * GET /api/browser/live-url - Get Browserbase live view URL
 * 
 * Proxies to Railway browser control service.
 * 
 * Query:
 * - tabId: string (required)
 * 
 * Returns the debugger fullscreen URL for an interactive browser session.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required' },
        { status: 400 }
      );
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured', usingBrowserbase: false },
        { status: 503 }
      );
    }

    // Proxy to Railway
    const result = await proxyGetLiveUrl(tabId);

    if (!result.ok) {
      return NextResponse.json(
        { 
          error: result.error || 'No active session or live view not available',
          usingBrowserbase: false 
        },
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
