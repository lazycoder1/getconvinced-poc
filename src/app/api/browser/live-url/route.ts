import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';
import { prisma } from '@/lib/database';

const sessionManager = getGlobalSessionManager();

/**
 * Helper to fetch debug URL from Browserbase
 */
async function fetchDebugUrl(browserbaseSessionId: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.browserbase.com/v1/sessions/${browserbaseSessionId}/debug`,
      { headers: { 'x-bb-api-key': apiKey } }
    );
    if (response.ok) {
      const data = await response.json();
      return data.debuggerFullscreenUrl || null;
    }
  } catch (error) {
    console.error('Error fetching debug URL:', error);
  }
  return null;
}

/**
 * GET /api/browser/live-url - Get Browserbase live view URL
 * 
 * Returns the debugger fullscreen URL for an interactive browser session.
 * Uses database for serverless-compatible session tracking.
 * 
 * Query params:
 * - tabId: string - Filter by tab ID to get this tab's session (optional)
 *                   If provided, checks database; otherwise checks in-memory (for tools)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // First try in-memory state (always, for tools on same instance)
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

    // If tabId provided, check database (serverless-compatible)
    if (tabId) {
      const dbSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });

      if (dbSession && dbSession.status === 'running') {
        // If we have a cached debug URL, use it
        if (dbSession.debug_url) {
          return NextResponse.json({
            liveUrl: dbSession.debug_url,
            usingBrowserbase: true,
          });
        }

        // Otherwise, fetch from Browserbase and cache it
        const apiKey = process.env.BROWSERBASE_API_KEY;
        if (apiKey) {
          const debugUrl = await fetchDebugUrl(dbSession.browserbase_session_id, apiKey);
          if (debugUrl) {
            // Cache the debug URL in database
            await prisma.browserSession.update({
              where: { tab_id: tabId },
              data: { debug_url: debugUrl },
            });

            return NextResponse.json({
              liveUrl: debugUrl,
              usingBrowserbase: true,
            });
          }
        }
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
