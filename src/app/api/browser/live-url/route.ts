import { NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();

/**
 * GET /api/browser/live-url - Get Browserbase live view URL
 * 
 * Returns the debugger fullscreen URL for an interactive browser session
 */
export async function GET() {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    const controller = sessionManager.getController();
    const liveUrl = await controller.getBrowserbaseLiveViewUrl();

    if (!liveUrl) {
      return NextResponse.json(
        { 
          error: 'Live view not available. Browserbase session required.',
          usingBrowserbase: false 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      liveUrl,
      usingBrowserbase: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

