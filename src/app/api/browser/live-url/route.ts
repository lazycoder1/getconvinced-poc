import { NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();

/**
 * GET /api/browser/live-url - Get Browserbase live view URL
 * 
 * Returns the debugger fullscreen URL for an interactive browser session.
 * Client should cache this URL in sessionStorage after receiving it.
 */
export async function GET() {
  try {
    // Check in-memory session
    if (sessionManager.hasSession()) {
      const controller = sessionManager.getController();
      const liveUrl = await controller.getBrowserbaseLiveViewUrl();

      if (liveUrl) {
        return NextResponse.json({
          liveUrl,
          usingBrowserbase: true,
        });
      }
    }

    return NextResponse.json(
      { 
        error: 'No active session or live view not available',
        usingBrowserbase: false 
      },
      { status: 404 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
