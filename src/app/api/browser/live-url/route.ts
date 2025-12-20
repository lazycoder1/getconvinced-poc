import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();

/**
 * GET /api/browser/live-url - Get Browserbase live view URL
 * 
 * Returns the debugger fullscreen URL for an interactive browser session.
 * Works in serverless by falling back to Browserbase API.
 * 
 * Query params:
 * - tabId: string - Filter by tab ID to get only this tab's session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // First try in-memory state
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

    // In serverless, memory doesn't persist - check Browserbase API
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    
    if (apiKey && projectId) {
      try {
        // Find a running session
        const sessionsResponse = await fetch('https://www.browserbase.com/v1/sessions?status=RUNNING', {
          headers: { 'x-bb-api-key': apiKey },
        });
        
        if (sessionsResponse.ok) {
          const data = await sessionsResponse.json();
          const sessions = data.sessions || data || [];
          
          // Find a running session in our project that matches the tabId
          const runningSession = Array.isArray(sessions)
            ? sessions.find((s: any) => {
                if (s.projectId !== projectId || s.status !== 'RUNNING') {
                  return false;
                }
                if (tabId) {
                  const metadata = s.userMetadata || {};
                  return metadata.tabId === tabId;
                }
                return true;
              })
            : null;
          
          if (runningSession) {
            // Get the debug URL for this session
            const debugResponse = await fetch(
              `https://www.browserbase.com/v1/sessions/${runningSession.id}/debug`,
              { headers: { 'x-bb-api-key': apiKey } }
            );
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              if (debugData.debuggerFullscreenUrl) {
                return NextResponse.json({
                  liveUrl: debugData.debuggerFullscreenUrl,
                  usingBrowserbase: true,
                });
              }
            }
          }
        }
      } catch (bbError) {
        console.error('Error getting live URL from Browserbase:', bbError);
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

