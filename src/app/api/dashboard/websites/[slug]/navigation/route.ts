import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { parseNavigationYaml, getExampleYaml, type ParsedRoute } from '@/lib/navigation-parser';

/**
 * GET /api/dashboard/websites/[slug]/navigation
 * Get parsed navigation routes and raw YAML
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
        website_name: website.name,
        has_config: false,
        yaml_raw: null,
        routes: [],
        example_yaml: getExampleYaml(),
      });
    }

    // Parse stored routes if available
    const routes = (website.config.nav_routes_json as unknown as ParsedRoute[]) || [];

    return NextResponse.json({
      website_id: website.id,
      website_name: website.name,
      has_config: true,
      yaml_raw: website.config.nav_yaml_raw,
      routes,
      base_url: website.config.base_url,
      portal_id: website.config.portal_id,
      example_yaml: getExampleYaml(),
    });
  } catch (error) {
    console.error('Error fetching navigation config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch navigation configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/websites/[slug]/navigation
 * Validate and save navigation YAML
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const { yaml_content, validate_only = false } = body;

    if (!yaml_content || typeof yaml_content !== 'string') {
      return NextResponse.json(
        { error: 'yaml_content is required and must be a string' },
        { status: 400 }
      );
    }

    // Parse the YAML
    const parseResult = parseNavigationYaml(yaml_content);

    // If validation only, return result without saving
    if (validate_only) {
      return NextResponse.json({
        success: parseResult.success,
        routes: parseResult.routes,
        base_url: parseResult.baseUrl,
        portal_id: parseResult.portalId,
        errors: parseResult.errors,
        route_count: parseResult.routes.length,
      });
    }

    // If parsing failed, return errors
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parseResult.errors,
          routes: parseResult.routes,
        },
        { status: 400 }
      );
    }

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

    // Upsert config with navigation data
    const config = await prisma.websiteConfig.upsert({
      where: { website_id: website.id },
      update: {
        nav_yaml_raw: yaml_content,
        nav_routes_json: parseResult.routes as unknown as object,
        // Also update base_url and portal_id if provided in YAML
        ...(parseResult.baseUrl && { base_url: parseResult.baseUrl }),
        ...(parseResult.portalId && { portal_id: parseResult.portalId }),
      },
      create: {
        website_id: website.id,
        base_url: parseResult.baseUrl || '',
        portal_id: parseResult.portalId || null,
        nav_yaml_raw: yaml_content,
        nav_routes_json: parseResult.routes as unknown as object,
      },
    });

    return NextResponse.json({
      success: true,
      routes: parseResult.routes,
      route_count: parseResult.routes.length,
      base_url: config.base_url,
      portal_id: config.portal_id,
    });
  } catch (error) {
    console.error('Error saving navigation config:', error);
    return NextResponse.json(
      { error: 'Failed to save navigation configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/websites/[slug]/navigation
 * Clear navigation configuration
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
        message: 'No navigation config to clear',
      });
    }

    await prisma.websiteConfig.update({
      where: { website_id: website.id },
      data: {
        nav_yaml_raw: null,
        nav_routes_json: undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Navigation configuration cleared',
    });
  } catch (error) {
    console.error('Error clearing navigation config:', error);
    return NextResponse.json(
      { error: 'Failed to clear navigation configuration' },
      { status: 500 }
    );
  }
}

