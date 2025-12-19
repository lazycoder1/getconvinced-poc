import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getGlobalSessionManager } from '@/lib/browser';

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

    const website = await prisma.website.findUnique({
      where: { slug },
      include: {
        config: true,
      },
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
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    const { filter_domain } = body;

    // Find website
    const website = await prisma.website.findUnique({
      where: { slug },
      include: { config: true },
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Get browser session
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active browser session. Start a browser session first.' },
        { status: 400 }
      );
    }

    const controller = sessionManager.getController();
    
    // Get cookies from browser
    let cookies = await controller.getCookies();

    // Filter by domain if specified (or use auth_domain from config)
    const domainFilter = filter_domain || website.config?.auth_domain;
    if (domainFilter) {
      const filterPattern = domainFilter.replace(/^\*\./, '');
      cookies = cookies.filter(c => 
        c.domain.endsWith(filterPattern) || c.domain === filterPattern
      );
    }

    if (cookies.length === 0) {
      return NextResponse.json(
        { 
          error: 'No cookies found. Make sure you are logged in to the website.',
          filter_domain: domainFilter,
        },
        { status: 400 }
      );
    }

    // Upsert config with cookies
    const config = await prisma.websiteConfig.upsert({
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

    const website = await prisma.website.findUnique({
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

    await prisma.websiteConfig.update({
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

