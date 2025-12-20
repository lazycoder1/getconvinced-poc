import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';
import { getBrowserLogger } from '@/lib/browser';
import { prisma } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

// Path to HubSpot cookies file (fallback)
const HUBSPOT_COOKIES_PATH = join(process.cwd(), 'hubspot-cookies.json');

/**
 * Load HubSpot cookies from file (legacy fallback)
 */
function loadHubspotCookiesFromFile(): Record<string, unknown>[] | null {
  try {
    if (!existsSync(HUBSPOT_COOKIES_PATH)) {
      return null;
    }
    const data = readFileSync(HUBSPOT_COOKIES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Load cookies from database for a specific website
 */
async function loadCookiesFromDb(websiteSlug: string): Promise<Record<string, unknown>[] | null> {
  try {
    const website = await prisma.website.findUnique({
      where: { slug: websiteSlug },
      include: { config: true },
    });
    if (!website?.config?.cookies_json) return null;
    return website.config.cookies_json as Record<string, unknown>[];
  } catch {
    return null;
  }
}

/**
 * Reconnect to an existing Browserbase session
 */
async function reconnectToSession(sessionId: string): Promise<boolean> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return false;

  try {
    console.log(`[session] Reconnecting to Browserbase session: ${sessionId}`);

    const { BrowserController } = await import('@/lib/browser/controller');
    const controller = new BrowserController({
      useBrowserbase: true,
      browserbaseConfig: { apiKey, projectId },
    });

    const reconnected = await controller.reconnectToBrowserbaseSession(sessionId);
    if (reconnected) {
      // @ts-ignore - store in session manager
      sessionManager['session'] = {
        id: sessionId,
        controller,
        createdAt: new Date(),
        browserbaseSessionId: sessionId,
      };
      console.log(`[session] Successfully reconnected to: ${sessionId}`);
      return true;
    }
  } catch (error) {
    console.error(`[session] Failed to reconnect:`, error);
  }
  return false;
}

/**
 * POST /api/browser/session - Create a new browser session
 * 
 * Stores session mapping in PostgreSQL for cross-instance access.
 * Client should cache the response in sessionStorage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      headless = false,
      cookies,
      loadHubspotCookies = false,
      websiteSlug,
      loadFromDb = false,
      tabId,
    } = body;

    if (!tabId) {
      return NextResponse.json({ error: 'tabId is required' }, { status: 400 });
    }

    // Check if session already exists for this tabId in DB
    const existingDbSession = await prisma.browserSession.findUnique({
      where: { tab_id: tabId },
    });

    if (existingDbSession && existingDbSession.status === 'running') {
      // Try to reconnect to existing session
      const reconnected = await reconnectToSession(existingDbSession.browserbase_session_id);
      if (reconnected) {
        // Get live URL
        let liveUrl: string | null = null;
        if (sessionManager.hasSession()) {
          const controller = sessionManager.getController();
          liveUrl = await controller.getBrowserbaseLiveViewUrl();
        }

        return NextResponse.json({
          id: existingDbSession.id,
          createdAt: existingDbSession.created_at,
          browserbaseSessionId: existingDbSession.browserbase_session_id,
          liveUrl,
          cookiesLoaded: false,
          cookieCount: 0,
          cookieSource: 'existing',
        });
      }
    }

    // Load cookies
    let finalCookies = cookies;
    let cookieSource = 'direct';
    if (!finalCookies && loadFromDb && websiteSlug) {
      finalCookies = await loadCookiesFromDb(websiteSlug);
      cookieSource = 'database';
    }
    if (!finalCookies && loadHubspotCookies) {
      finalCookies = loadHubspotCookiesFromFile();
      cookieSource = 'file';
    }

    logger.logAction('create_session', { tabId, websiteSlug });
    const start = Date.now();

    // Create new session
    const session = await sessionManager.createSession({
      headless,
      cookies: finalCookies,
    }, tabId);

    // Get live URL
    let liveUrl: string | null = null;
    if (sessionManager.hasSession()) {
      const controller = sessionManager.getController();
      liveUrl = await controller.getBrowserbaseLiveViewUrl();

      // Navigate to default URL - get from body or from website config in DB
      let defaultUrl = body.defaultUrl;
      if (!defaultUrl && websiteSlug) {
        try {
          const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true },
          });
          defaultUrl = website?.config?.default_url || website?.config?.base_url;
        } catch {
          // Ignore, will use fallback
        }
      }

      if (defaultUrl) {
        try {
          console.log(`[session] Navigating to default URL: ${defaultUrl}`);
          await controller.navigate(defaultUrl);
        } catch (navError) {
          console.error('[session] Failed to navigate to default URL:', navError);
        }
      }
    }

    // Store in PostgreSQL for cross-instance access
    await prisma.browserSession.upsert({
      where: { tab_id: tabId },
      create: {
        tab_id: tabId,
        browserbase_session_id: session.browserbaseSessionId || session.id,
        status: 'running',
      },
      update: {
        browserbase_session_id: session.browserbaseSessionId || session.id,
        status: 'running',
      },
    });

    logger.logResponse('create_session', session, Date.now() - start);

    return NextResponse.json({
      ...session,
      liveUrl,
      cookiesLoaded: !!finalCookies,
      cookieCount: finalCookies?.length || 0,
      cookieSource: finalCookies ? cookieSource : 'none',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('create_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/browser/session - Get current session info
 * 
 * Flow:
 * 1. Check in-memory (same serverless instance) → fast
 * 2. Check PostgreSQL by tabId → reconnect to Browserbase session
 * 3. No tabId? Search for any running session (for tools)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check in-memory first (fast path)
    const info = sessionManager.getSessionInfo();
    if (info) {
      return NextResponse.json(info);
    }

    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const sessionId = searchParams.get('sessionId'); // Direct session ID from client cache

    // 2. If sessionId provided, try direct reconnection (most reliable)
    if (sessionId) {
      console.log(`[session GET] Reconnecting to cached sessionId: ${sessionId}`);
      const reconnected = await reconnectToSession(sessionId);
      if (reconnected) {
        return NextResponse.json({
          id: sessionId,
          createdAt: new Date(),
          browserbaseSessionId: sessionId,
        });
      }
      console.log(`[session GET] Failed to reconnect to sessionId: ${sessionId}`);
    }

    // 3. If tabId provided, check PostgreSQL
    if (tabId) {
      const dbSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });

      if (dbSession && dbSession.status === 'running') {
        // Reconnect to this specific session
        const reconnected = await reconnectToSession(dbSession.browserbase_session_id);
        if (reconnected) {
          return NextResponse.json({
            id: dbSession.id,
            createdAt: dbSession.created_at,
            browserbaseSessionId: dbSession.browserbase_session_id,
          });
        }
      }
    }

    // 4. Fallback: search for any running session in our project
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (apiKey && projectId) {
      try {
        const response = await fetch('https://www.browserbase.com/v1/sessions?status=RUNNING', {
          headers: { 'x-bb-api-key': apiKey },
        });

        if (response.ok) {
          const data = await response.json();
          const sessions = data.sessions || data || [];
          const runningSession = Array.isArray(sessions)
            ? sessions.find((s: any) => s.projectId === projectId && s.status === 'RUNNING')
            : null;

          if (runningSession) {
            const reconnected = await reconnectToSession(runningSession.id);
            if (reconnected) {
              return NextResponse.json({
                id: runningSession.id,
                createdAt: new Date(runningSession.createdAt),
                browserbaseSessionId: runningSession.id,
              });
            }
          }
        }
      } catch (bbError) {
        console.error('Error searching Browserbase:', bbError);
      }
    }

    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/browser/session - Close session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // Close in-memory session
    if (sessionManager.hasSession()) {
      await sessionManager.closeSession();
    }

    // Mark as closed in DB
    if (tabId) {
      await prisma.browserSession.updateMany({
        where: { tab_id: tabId },
        data: { status: 'closed' },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
