import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

/**
 * GET /api/dashboard/websites/[slug]/config
 * Get website configuration (base URLs, voice settings, etc.)
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

    // Return config or default values
    const config = website.config || {
      base_url: '',
      default_url: null,
      portal_id: null,
      auth_domain: null,
      nav_yaml_raw: null,
      voice_type: 'alloy',
      model: 'gpt-4o-realtime-preview',
      default_mode: 'screenshot',
      cookies_updated: null,
      has_cookies: false,
    };

    return NextResponse.json({
      website_id: website.id,
      website_name: website.name,
      website_slug: website.slug,
      base_url: config.base_url,
      default_url: config.default_url,
      portal_id: config.portal_id,
      auth_domain: config.auth_domain,
      nav_yaml_raw: config.nav_yaml_raw,
      voice_type: config.voice_type,
      model: config.model,
      default_mode: config.default_mode,
      cookies_updated: config.cookies_updated,
      has_cookies: !!(config as { cookies_json?: unknown }).cookies_json,
    });
  } catch (error) {
    console.error('Error fetching website config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/websites/[slug]/config
 * Update website configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const website = await prisma.website.findUnique({
      where: { slug },
    });

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.base_url || typeof body.base_url !== 'string') {
      return NextResponse.json(
        { error: 'base_url is required and must be a string' },
        { status: 400 }
      );
    }

    // Upsert config
    const config = await prisma.websiteConfig.upsert({
      where: { website_id: website.id },
      update: {
        base_url: body.base_url,
        default_url: body.default_url || null,
        portal_id: body.portal_id || null,
        auth_domain: body.auth_domain || null,
        voice_type: body.voice_type || 'alloy',
        model: body.model || 'gpt-4o-realtime-preview',
        default_mode: body.default_mode || 'screenshot',
      },
      create: {
        website_id: website.id,
        base_url: body.base_url,
        default_url: body.default_url || null,
        portal_id: body.portal_id || null,
        auth_domain: body.auth_domain || null,
        voice_type: body.voice_type || 'alloy',
        model: body.model || 'gpt-4o-realtime-preview',
        default_mode: body.default_mode || 'screenshot',
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        website_id: config.website_id,
        base_url: config.base_url,
        default_url: config.default_url,
        portal_id: config.portal_id,
        auth_domain: config.auth_domain,
        voice_type: config.voice_type,
        model: config.model,
        default_mode: config.default_mode,
      },
    });
  } catch (error) {
    console.error('Error updating website config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

