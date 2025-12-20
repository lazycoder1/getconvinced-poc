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
      console.log('HubSpot cookies file not found at:', HUBSPOT_COOKIES_PATH);
      return null;
    }
    const data = readFileSync(HUBSPOT_COOKIES_PATH, 'utf-8');
    const cookies = JSON.parse(data);
    console.log(`Loaded ${cookies.length} HubSpot cookies from file`);
    return cookies;
  } catch (error) {
    console.error('Failed to load HubSpot cookies:', error);
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

    if (!website?.config?.cookies_json) {
      console.log(`No cookies found in DB for website: ${websiteSlug}`);
      return null;
    }

    const cookies = website.config.cookies_json as Record<string, unknown>[];
    console.log(`Loaded ${cookies.length} cookies from DB for website: ${websiteSlug}`);
    return cookies;
  } catch (error) {
    console.error(`Failed to load cookies from DB for ${websiteSlug}:`, error);
    return null;
  }
}

/**
 * Helper to fetch and cache the debug URL from Browserbase
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
 * POST /api/browser/session - Create a new browser session
 *
 * Body options:
 * - headless: boolean (default: false)
 * - cookies: array of cookies to load directly
 * - loadHubspotCookies: boolean - load cookies from hubspot-cookies.json (legacy)
 * - websiteSlug: string - load cookies from database for this website
 * - loadFromDb: boolean - whether to load cookies from database (requires websiteSlug)
 * - tabId: string - unique identifier for this browser tab (used for session isolation)
 *                   If not provided, uses in-memory session only (for server-side tools)
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
      tabId, // Unique tab ID for session isolation (optional for tools)
    } = body;

    // If tabId provided, check DB for existing session first
    if (tabId) {
      const existingSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });

      if (existingSession && existingSession.status === 'running') {
        // Return existing session
        return NextResponse.json({
          id: existingSession.id,
          createdAt: existingSession.created_at,
          browserbaseSessionId: existingSession.browserbase_session_id,
          cookiesLoaded: true,
          cookieCount: 0,
          cookieSource: 'existing',
        }, { status: 200 });
      }
    }

    // Determine which cookies to use (priority: direct cookies > DB > file)
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

    logger.logAction('create_session', {
      headless,
      hasCookies: !!finalCookies,
      cookieCount: finalCookies?.length || 0,
      cookieSource: finalCookies ? cookieSource : 'none',
      websiteSlug: websiteSlug || null,
      tabId: tabId || null,
    });
    const start = Date.now();

    // Pass tabId to createSession for Browserbase session isolation
    const session = await sessionManager.createSession({
      headless,
      cookies: finalCookies,
    }, tabId);

    // If tabId provided, store session in database for serverless persistence
    if (tabId) {
      const apiKey = process.env.BROWSERBASE_API_KEY;
      let debugUrl: string | null = null;
      if (apiKey && session.browserbaseSessionId) {
        debugUrl = await fetchDebugUrl(session.browserbaseSessionId, apiKey);
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry
      await prisma.browserSession.upsert({
        where: { tab_id: tabId },
        create: {
          tab_id: tabId,
          browserbase_session_id: session.browserbaseSessionId || session.id,
          debug_url: debugUrl,
          status: 'running',
          expires_at: expiresAt,
        },
        update: {
          browserbase_session_id: session.browserbaseSessionId || session.id,
          debug_url: debugUrl,
          status: 'running',
          expires_at: expiresAt,
        },
      });
    }

    logger.setSessionId(session.id);
    logger.logResponse('create_session', session, Date.now() - start);

    return NextResponse.json({
      ...session,
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
 * Query params:
 * - tabId: string - Filter by tab ID to get this tab's session (optional)
 *                   If provided, checks database; otherwise checks in-memory (for tools)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // If tabId provided, check database (serverless-compatible)
    if (tabId) {
      const dbSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });

      if (dbSession && dbSession.status === 'running') {
        return NextResponse.json({
          id: dbSession.id,
          createdAt: dbSession.created_at,
          browserbaseSessionId: dbSession.browserbase_session_id,
        });
      }
    }

    // Fallback: check in-memory session (for tools on same serverless instance)
    const info = sessionManager.getSessionInfo();
    if (info) {
      return NextResponse.json(info);
    }

    return NextResponse.json(
      { error: 'No active session' },
      { status: 404 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/browser/session - Close the current session
 * 
 * Query params:
 * - tabId: string - The tab ID of the session to close
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // Try to close in-memory session
    if (sessionManager.hasSession()) {
      logger.logAction('close_session', { tabId });
      const start = Date.now();
      await sessionManager.closeSession();
      logger.logResponse('close_session', { success: true }, Date.now() - start);
      logger.clearSessionId();
    }

    // Mark as closed in database
    if (tabId) {
      await prisma.browserSession.updateMany({
        where: { tab_id: tabId },
        data: { status: 'closed' },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('close_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

