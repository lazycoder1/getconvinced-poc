import { NextRequest, NextResponse } from 'next/server';
import { isRailwayConfigured, proxyAction } from '@/lib/browser/railway-proxy';

/**
 * POST /api/browser/action - Execute a browser action
 * 
 * Proxies to Railway browser control service for persistent CDP connections.
 * 
 * Body:
 * - tabId: string (required)
 * - browserbaseSessionId: string (optional)
 * - type: string (required) - Action type
 * - ... action-specific parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tabId, browserbaseSessionId, ...actionData } = body;

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required' },
        { status: 400 }
      );
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured. Set RAILWAY_BROWSER_SERVICE_URL.' },
        { status: 503 }
      );
    }

    console.log(`[action POST] ${actionData.type} for tabId: ${tabId}`);

    // Proxy to Railway
    const result = await proxyAction({
      tabId,
      browserbaseSessionId,
      ...actionData,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Action failed' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[action POST] Error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
