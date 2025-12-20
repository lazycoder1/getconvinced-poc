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
 * POST /api/browser/session - Create a new browser session
 *
 * Body options:
 * - headless: boolean (default: false)
 * - cookies: array of cookies to load directly
 * - loadHubspotCookies: boolean - load cookies from hubspot-cookies.json (legacy)
 * - websiteSlug: string - load cookies from database for this website
 * - loadFromDb: boolean - whether to load cookies from database (requires websiteSlug)
 * - tabId: string - unique identifier for this browser tab (used for session isolation)
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
      tabId, // Unique tab ID for session isolation
    } = body;

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
 * Checks in-memory state first, then falls back to checking Browserbase API
 * (needed for serverless environments where memory doesn't persist)
 * 
 * Query params:
 * - tabId: string - Filter by tab ID to get only this tab's session (prevents collisions)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    // First check in-memory state
    const info = sessionManager.getSessionInfo();
    if (info) {
      return NextResponse.json(info);
    }

    // In serverless, memory doesn't persist - check Browserbase API for running sessions
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
          
          // Filter sessions in our project
          const projectSessions = Array.isArray(sessions)
            ? sessions.filter((s: any) => s.projectId === projectId && s.status === 'RUNNING')
            : [];
          
          // If tabId is provided, we need to fetch each session's details to check userMetadata
          // (LIST endpoint may not return userMetadata)
          if (tabId && projectSessions.length > 0) {
            for (const session of projectSessions) {
              try {
                // Fetch individual session to get userMetadata
                const detailResponse = await fetch(
                  `https://www.browserbase.com/v1/sessions/${session.id}`,
                  { headers: { 'x-bb-api-key': apiKey } }
                );
                if (detailResponse.ok) {
                  const sessionDetail = await detailResponse.json();
                  const metadata = sessionDetail.userMetadata || {};
                  if (metadata.tabId === tabId) {
                    return NextResponse.json({
                      id: sessionDetail.id,
                      createdAt: new Date(sessionDetail.createdAt),
                      browserbaseSessionId: sessionDetail.id,
                    });
                  }
                }
              } catch (detailError) {
                console.error(`Error fetching session ${session.id} details:`, detailError);
              }
            }
          } else if (projectSessions.length > 0) {
            // No tabId filter, return first matching session
            const runningSession = projectSessions[0];
            return NextResponse.json({
              id: runningSession.id,
              createdAt: new Date(runningSession.createdAt),
              browserbaseSessionId: runningSession.id,
            });
          }
        }
      } catch (bbError) {
        console.error('Error checking Browserbase for sessions:', bbError);
      }
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
 */
export async function DELETE() {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    logger.logAction('close_session', {});
    const start = Date.now();

    await sessionManager.closeSession();

    logger.logResponse('close_session', { success: true }, Date.now() - start);
    logger.clearSessionId();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('close_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

