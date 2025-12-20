import { NextRequest, NextResponse } from 'next/server';
import { isRailwayConfigured, proxyScreenshot } from '@/lib/browser/railway-proxy';

/**
 * POST /api/browser/screenshot - Capture a screenshot
 * 
 * Proxies to Railway browser control service.
 * 
 * Request body:
 * - tabId: string (required)
 * - fullPage: boolean (optional)
 * - format: 'base64' | 'binary' (default: 'base64')
 * 
 * Response:
 * - For base64: { success: true, data: string, contentType: 'image/png' }
 * - For binary: PNG image directly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tabId, fullPage, format } = body;

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required' },
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

    console.log(`[screenshot POST] tabId: ${tabId}, fullPage: ${fullPage}`);

    // Proxy to Railway
    const result = await proxyScreenshot({
      tabId,
      fullPage,
      format: format || 'base64',
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to capture screenshot' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[screenshot POST] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser/screenshot - Get screenshot as image
 * 
 * Query params:
 * - tabId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get('tabId');

    if (!tabId) {
      return NextResponse.json(
        { error: 'tabId is required' },
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

    console.log(`[screenshot GET] tabId: ${tabId}`);

    // Proxy to Railway (get base64, convert to binary for response)
    const result = await proxyScreenshot({
      tabId,
      format: 'base64',
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to capture screenshot' },
        { status: result.status }
      );
    }

    // Convert base64 to binary response
    const data = result.data as { data?: string };
    if (data?.data) {
      const buffer = Buffer.from(data.data, 'base64');
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-cache',
        },
      });
    }

    return NextResponse.json(
      { error: 'No screenshot data returned' },
      { status: 500 }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[screenshot GET] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

