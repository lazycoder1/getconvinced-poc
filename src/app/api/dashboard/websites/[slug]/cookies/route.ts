import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { isRailwayConfigured, proxyGetCookies } from '@/lib/browser/railway-proxy';

// Type workaround for stale Prisma types
type WebsiteWithConfig = {
  id: string;
  config?: {
    cookies_json?: unknown;
    cookies_updated?: Date | null;
    auth_domain?: string | null;
  } | null;
};

/**
 * GET /api/dashboard/websites/[slug]/cookies
 * Get cookie status (count, last updated) - NOT the actual cookie values
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const website = await (prisma.website.findUnique as (args: unknown) => Promise<WebsiteWithConfig | null>)({
      where: { slug },
      include: { config: true },
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    if (!website.config) {
      return NextResponse.json({
        website_id: website.id,
        has_cookies: false,
        cookie_count: 0,
        cookies_updated: null,
        auth_domain: null,
      });
    }

    const cookiesJson = website.config.cookies_json as unknown[];
    const cookieCount = Array.isArray(cookiesJson) ? cookiesJson.length : 0;

    return NextResponse.json({
      website_id: website.id,
      has_cookies: cookieCount > 0,
      cookie_count: cookieCount,
      cookies_updated: website.config.cookies_updated,
      auth_domain: website.config.auth_domain,
    });
  } catch (error) {
    console.error('Error fetching cookie status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cookie status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/websites/[slug]/cookies
 * Save cookies from current browser session to database
 * 
 * Query params:
 * - tabId: string (required) - Tab ID for the browser session
 * 
 * Body:
 * - filter_domain: string (optional) - Domain to filter cookies by
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');
    const body = await request.json().catch(() => ({}));
    const { filter_domain } = body;

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required as a query parameter' },
        { status: 400 }
      );
    }

    // Check if Railway is configured
    if (!isRailwayConfigured()) {
      return NextResponse.json(
        { error: 'Railway browser service not configured' },
        { status: 503 }
      );
    }

    // Find website
    const website = await (prisma.website.findUnique as (args: unknown) => Promise<WebsiteWithConfig | null>)({
      where: { slug },
      include: { config: true },
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get cookies from Railway browser session
    const domainFilter = filter_domain || website.config?.auth_domain;

    const cookieResult = await proxyGetCookies({
      tabId,
      filterDomain: domainFilter,
    });

    if (!cookieResult.ok) {
      return NextResponse.json(
        { error: cookieResult.error || 'No active browser session. Start a browser session first.' },
        { status: cookieResult.status }
      );
    }

    const cookies = cookieResult.data?.cookies || [];

    if (cookies.length === 0) {
      return NextResponse.json(
        {
          error: 'No cookies found. Make sure you are logged in to the website.',
          filter_domain: domainFilter,
        },
        { status: 400 }
      );
    }

    // Upsert config with cookies (use type assertion for stale Prisma types)
    const upsertFn = (prisma as unknown as { websiteConfig: { upsert: (args: unknown) => Promise<{ cookies_updated?: Date | null; auth_domain?: string | null }> } }).websiteConfig.upsert;
    const config = await upsertFn({
      where: { website_id: website.id },
      update: {
        cookies_json: cookies as unknown as object,
        cookies_updated: new Date(),
        ...(domainFilter && { auth_domain: domainFilter }),
      },
      create: {
        website_id: website.id,
        base_url: '',
        cookies_json: cookies as unknown as object,
        cookies_updated: new Date(),
        auth_domain: domainFilter || null,
      },
    });

    return NextResponse.json({
      success: true,
      cookie_count: cookies.length,
      cookies_updated: config.cookies_updated,
      auth_domain: config.auth_domain,
      message: `Successfully saved ${cookies.length} cookies`,
    });
  } catch (error) {
    console.error('Error saving cookies:', error);
    return NextResponse.json(
      { error: 'Failed to save cookies' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/websites/[slug]/cookies
 * Clear stored cookies
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const website = await (prisma.website.findUnique as (args: unknown) => Promise<WebsiteWithConfig | null>)({
      where: { slug },
      include: { config: true },
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    if (!website.config) {
      return NextResponse.json({
        success: true,
        message: 'No cookies to clear',
      });
    }

    const updateFn = (prisma as unknown as { websiteConfig: { update: (args: unknown) => Promise<void> } }).websiteConfig.update;
    await updateFn({
      where: { website_id: website.id },
      data: {
        cookies_json: undefined,
        cookies_updated: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cookies cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}

