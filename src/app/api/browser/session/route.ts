import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  isRailwayConfigured,
  proxyCreateSession,
  proxyGetSession,
  proxyDeleteSession,
} from '@/lib/browser/railway-proxy';

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

// Type for website with config relation (workaround for stale Prisma types)
type WebsiteWithConfig = { config?: { cookies_json?: unknown; default_url?: string; base_url?: string } | null };

/**
 * Load cookies from database for a specific website
 */
async function loadCookiesFromDb(websiteSlug: string): Promise<Record<string, unknown>[] | null> {
  try {
    const website = await (prisma.website.findUnique as (args: unknown) => Promise<WebsiteWithConfig | null>)({
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
 * POST /api/browser/session - Create a new browser session
 * 
 * Proxies to Railway browser control service for persistent CDP connections.
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
      defaultUrl: providedDefaultUrl,
    } = body;

    if (!tabId) {
      return NextResponse.json({ error: 'tabId is required' }, { status: 400 });
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured. Set RAILWAY_BROWSER_SERVICE_URL.' },
        { status: 503 }
      );
    }

    console.log(`[session POST] Creating session for tabId: ${tabId}`);

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

    // Get default URL if not provided
    let defaultUrl = providedDefaultUrl;
    if (!defaultUrl && websiteSlug) {
      try {
        const website = await (prisma.website.findUnique as (args: unknown) => Promise<WebsiteWithConfig | null>)({
          where: { slug: websiteSlug },
          include: { config: true },
        });
        defaultUrl = website?.config?.default_url || website?.config?.base_url;
      } catch {
        // Ignore
      }
    }

    // Proxy to Railway
    const result = await proxyCreateSession({
      tabId,
      cookies: finalCookies || undefined,
      defaultUrl,
      headless,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create session' },
        { status: result.status }
      );
    }

    console.log(`[session POST] ✓ Session created via Railway`);

    const responseData = result.data as Record<string, unknown> || {};
    return NextResponse.json({
      ...responseData,
      cookiesLoaded: !!finalCookies,
      cookieCount: finalCookies?.length || 0,
      cookieSource: finalCookies ? cookieSource : 'none',
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session POST] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/browser/session - Get current session info
 * 
 * Proxies to Railway browser control service.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    if (!tabId) {
      return NextResponse.json({ error: 'tabId is required' }, { status: 400 });
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured' },
        { status: 503 }
      );
    }

    console.log(`[session GET] Looking up tabId: ${tabId}`);

    // Proxy to Railway
    const result = await proxyGetSession(tabId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'No active session' },
        { status: result.status }
      );
    }

    console.log(`[session GET] ✓ Found session via Railway`);
    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session GET] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/browser/session - Close session
 * 
 * Proxies to Railway browser control service.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    if (!tabId) {
      return NextResponse.json({ error: 'tabId is required' }, { status: 400 });
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured' },
        { status: 503 }
      );
    }

    console.log(`[session DELETE] tabId=${tabId}`);

    // Proxy to Railway
    const result = await proxyDeleteSession(tabId);

    if (!result.ok && result.status !== 404) {
      return NextResponse.json(
        { error: result.error || 'Failed to close session' },
        { status: result.status }
      );
    }

    console.log(`[session DELETE] ✓ Cleaned up`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[session DELETE] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
