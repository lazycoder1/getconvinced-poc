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
 * - tabId: string - unique identifier for this browser tab (used for Browserbase userMetadata)
 * 
 * Session state is managed in-memory on the server and cached in sessionStorage on the client.
 * No separate database table needed.
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

    // Pass tabId to createSession for Browserbase session isolation (stored in userMetadata)
    const session = await sessionManager.createSession({
      headless,
      cookies: finalCookies,
    }, tabId);

    // Get live URL immediately so client can cache everything from one request
    let liveUrl: string | null = null;
    if (sessionManager.hasSession()) {
      const controller = sessionManager.getController();
      liveUrl = await controller.getBrowserbaseLiveViewUrl();
    }

    logger.setSessionId(session.id);
    logger.logResponse('create_session', session, Date.now() - start);

    // Return session info WITH liveUrl - client caches in sessionStorage
    return NextResponse.json({
      ...session,
      liveUrl, // Include live URL so client doesn't need separate GET
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
 * Checks in-memory session state first.
 * If no in-memory session, tries to find and reconnect to a running Browserbase session.
 * This enables tools to work across different serverless instances.
 */
export async function GET() {
  try {
    // Check in-memory session first
    const info = sessionManager.getSessionInfo();
    if (info) {
      return NextResponse.json(info);
    }

    // No in-memory session - try to find and reconnect to a running Browserbase session
    // This is critical for tools that hit a different serverless instance
    const apiKey = process.env.BROWSERBASE_API_KEY;
    const projectId = process.env.BROWSERBASE_PROJECT_ID;
    
    if (apiKey && projectId) {
      try {
        // Find running sessions in our project
        const response = await fetch('https://www.browserbase.com/v1/sessions?status=RUNNING', {
          headers: { 'x-bb-api-key': apiKey },
        });
        
        if (response.ok) {
          const data = await response.json();
          const sessions = data.sessions || data || [];
          
          // Find first running session in our project
          const runningSession = Array.isArray(sessions)
            ? sessions.find((s: any) => s.projectId === projectId && s.status === 'RUNNING')
            : null;
          
          if (runningSession) {
            console.log(`[session] Found running Browserbase session: ${runningSession.id}, reconnecting...`);
            
            // Create a new session manager entry and reconnect
            const { BrowserController } = await import('@/lib/browser/controller');
            const controller = new BrowserController({
              useBrowserbase: true,
              browserbaseConfig: {
                apiKey,
                projectId,
              },
            });
            
            const reconnected = await controller.reconnectToBrowserbaseSession(runningSession.id);
            if (reconnected) {
              // Store in session manager for future requests on this instance
              // @ts-ignore - accessing private property for reconnection
              sessionManager['session'] = {
                id: runningSession.id,
                controller,
                createdAt: new Date(runningSession.createdAt),
                browserbaseSessionId: runningSession.id,
              };
              
              console.log(`[session] Successfully reconnected to session: ${runningSession.id}`);
              
              return NextResponse.json({
                id: runningSession.id,
                createdAt: new Date(runningSession.createdAt),
                browserbaseSessionId: runningSession.id,
              });
            }
          }
        }
      } catch (bbError) {
        console.error('Error checking/reconnecting to Browserbase:', bbError);
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
    // Close in-memory session
    if (sessionManager.hasSession()) {
      logger.logAction('close_session', {});
      const start = Date.now();
      await sessionManager.closeSession();
      logger.logResponse('close_session', { success: true }, Date.now() - start);
      logger.clearSessionId();
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('close_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
