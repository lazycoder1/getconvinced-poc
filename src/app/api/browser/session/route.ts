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
 * Returns the controller if successful, null otherwise
 */
async function reconnectToSession(sessionId: string): Promise<boolean> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.log('[session] Missing Browserbase credentials');
    return false;
  }

  try {
    console.log(`[session] Attempting reconnect to: ${sessionId}`);

    // First verify the session is still running in Browserbase
    const checkResponse = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      headers: { 'x-bb-api-key': apiKey },
    });

    if (!checkResponse.ok) {
      console.log(`[session] Session ${sessionId} no longer exists in Browserbase`);
      return false;
    }

    const sessionData = await checkResponse.json();
    if (sessionData.status !== 'RUNNING') {
      console.log(`[session] Session ${sessionId} is not running (status: ${sessionData.status})`);
      return false;
    }

    // Session is valid, reconnect
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
      console.log(`[session] ✓ Reconnected to: ${sessionId}`);
      return true;
    }

    console.log(`[session] ✗ Reconnect failed for: ${sessionId}`);
    return false;
  } catch (error) {
    console.error(`[session] Reconnect error:`, error);
    return false;
  }
}

/**
 * POST /api/browser/session - Create a new browser session
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

    console.log(`[session POST] Creating session for tabId: ${tabId}`);

    // Check if we already have this session in memory
    if (sessionManager.hasSession()) {
      const info = sessionManager.getSessionInfo();
      if (info) {
        console.log(`[session POST] Using existing in-memory session`);
        const controller = sessionManager.getController();
        const liveUrl = await controller.getBrowserbaseLiveViewUrl();
        return NextResponse.json({
          ...info,
          liveUrl,
          cookiesLoaded: false,
          cookieCount: 0,
          cookieSource: 'existing',
        });
      }
    }

    // Check PostgreSQL for existing session
    const existingDbSession = await prisma.browserSession.findUnique({
      where: { tab_id: tabId },
    });

    if (existingDbSession && existingDbSession.status === 'running') {
      console.log(`[session POST] Found DB session, attempting reconnect: ${existingDbSession.browserbase_session_id}`);
      const reconnected = await reconnectToSession(existingDbSession.browserbase_session_id);
      if (reconnected) {
        const controller = sessionManager.getController();
        const liveUrl = await controller.getBrowserbaseLiveViewUrl();
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
      // Reconnect failed, mark as closed and create new
      console.log(`[session POST] Reconnect failed, will create new session`);
      await prisma.browserSession.update({
        where: { tab_id: tabId },
        data: { status: 'closed' },
      });
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
    console.log(`[session POST] Creating new Browserbase session...`);
    const session = await sessionManager.createSession({
      headless,
      cookies: finalCookies,
    }, tabId);

    // Get live URL and navigate to default
    let liveUrl: string | null = null;
    if (sessionManager.hasSession()) {
      const controller = sessionManager.getController();
      liveUrl = await controller.getBrowserbaseLiveViewUrl();

      // Navigate to default URL
      let defaultUrl = body.defaultUrl;
      if (!defaultUrl && websiteSlug) {
        try {
          const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
            include: { config: true },
          });
          defaultUrl = website?.config?.default_url || website?.config?.base_url;
        } catch {
          // Ignore
        }
      }

      if (defaultUrl) {
        try {
          console.log(`[session POST] Navigating to: ${defaultUrl}`);
          await controller.navigate(defaultUrl);
        } catch (navError) {
          console.error('[session POST] Navigation failed:', navError);
        }
      }
    }

    const browserbaseSessionId = session.browserbaseSessionId || session.id;

    // Store in PostgreSQL
    await prisma.browserSession.upsert({
      where: { tab_id: tabId },
      create: {
        tab_id: tabId,
        browserbase_session_id: browserbaseSessionId,
        status: 'running',
      },
      update: {
        browserbase_session_id: browserbaseSessionId,
        status: 'running',
        updated_at: new Date(),
      },
    });

    console.log(`[session POST] ✓ Created session: ${browserbaseSessionId}`);
    logger.logResponse('create_session', session, Date.now() - start);

    return NextResponse.json({
      ...session,
      browserbaseSessionId,
      liveUrl,
      cookiesLoaded: !!finalCookies,
      cookieCount: finalCookies?.length || 0,
      cookieSource: finalCookies ? cookieSource : 'none',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session POST] Error:', error);
    logger.logError('create_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/browser/session - Get current session info
 * 
 * Priority:
 * 1. In-memory (same instance) - instant
 * 2. Direct sessionId (from client cache) - reconnect
 * 3. tabId lookup in PostgreSQL - reconnect
 * 4. Search Browserbase for any running session (fallback for tools)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const sessionId = searchParams.get('sessionId');

    console.log(`[session GET] tabId=${tabId}, sessionId=${sessionId?.slice(0, 8)}...`);

    // 1. Check in-memory first
    if (sessionManager.hasSession()) {
      const info = sessionManager.getSessionInfo();
      if (info) {
        console.log(`[session GET] ✓ Found in memory`);
        return NextResponse.json(info);
      }
    }

    // 2. Direct sessionId provided - reconnect directly
    if (sessionId) {
      console.log(`[session GET] Trying direct sessionId reconnect`);
      const reconnected = await reconnectToSession(sessionId);
      if (reconnected) {
        return NextResponse.json({
          id: sessionId,
          createdAt: new Date(),
          browserbaseSessionId: sessionId,
        });
      }
    }

    // 3. tabId provided - lookup in PostgreSQL
    if (tabId) {
      console.log(`[session GET] Looking up tabId in PostgreSQL`);
      const dbSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });

      if (dbSession && dbSession.status === 'running') {
        console.log(`[session GET] Found in DB: ${dbSession.browserbase_session_id}`);
        const reconnected = await reconnectToSession(dbSession.browserbase_session_id);
        if (reconnected) {
          return NextResponse.json({
            id: dbSession.id,
            createdAt: dbSession.created_at,
            browserbaseSessionId: dbSession.browserbase_session_id,
          });
        }
        // Session is stale, mark as closed
        await prisma.browserSession.update({
          where: { tab_id: tabId },
          data: { status: 'closed' },
        });
      }
    }

    // 4. Fallback: search Browserbase for any running session
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;

    if (apiKey && projectId) {
      console.log(`[session GET] Searching Browserbase for running sessions`);
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
            console.log(`[session GET] Found running session in Browserbase: ${runningSession.id}`);
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
        console.error('[session GET] Browserbase search error:', bbError);
      }
    }

    console.log(`[session GET] ✗ No active session found`);
    return NextResponse.json({ error: 'No active session' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session GET] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/browser/session - Close session and cleanup
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    console.log(`[session DELETE] tabId=${tabId}`);

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

    // Cleanup old sessions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.browserSession.deleteMany({
      where: {
        OR: [
          { status: 'closed' },
          { created_at: { lt: oneHourAgo } },
        ],
      },
    });

    console.log(`[session DELETE] ✓ Cleaned up`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session DELETE] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
