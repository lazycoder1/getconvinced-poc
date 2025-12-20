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
          
          // Filter sessions in our project
          const projectSessions = Array.isArray(sessions)
            ? sessions.filter((s: any) => s.projectId === projectId && s.status === 'RUNNING')
            : [];
          
          let matchingSessionId: string | null = null;
          
          // If tabId is provided, fetch each session's details to check userMetadata
          if (tabId && projectSessions.length > 0) {
            for (const session of projectSessions) {
              try {
                const detailResponse = await fetch(
                  `https://www.browserbase.com/v1/sessions/${session.id}`,
                  { headers: { 'x-bb-api-key': apiKey } }
                );
                if (detailResponse.ok) {
                  const sessionDetail = await detailResponse.json();
                  const metadata = sessionDetail.userMetadata || {};
                  if (metadata.tabId === tabId) {
                    matchingSessionId = session.id;
                    break;
                  }
                }
              } catch (detailError) {
                console.error(`Error fetching session ${session.id} details:`, detailError);
              }
            }
          } else if (projectSessions.length > 0) {
            // No tabId filter, use first matching session
            matchingSessionId = projectSessions[0].id;
          }
          
          if (matchingSessionId) {
            // Get the debug URL for this session
            const debugResponse = await fetch(
              `https://www.browserbase.com/v1/sessions/${matchingSessionId}/debug`,
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

