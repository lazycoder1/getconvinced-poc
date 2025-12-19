import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager, getBrowserLogger } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

/**
 * POST /api/browser/screenshot - Capture a screenshot
 * 
 * Request body (optional):
 * - format: 'base64' | 'binary' (default: 'base64')
 * 
 * Response:
 * - For base64: { success: true, data: string, contentType: 'image/png' }
 * - For binary: PNG image directly
 */
export async function POST(request: NextRequest) {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const format = body.format || 'base64';

    const controller = sessionManager.getController();
    
    logger.logAction('screenshot', { format });
    const start = Date.now();

    const buffer = await controller.screenshot();

    logger.logResponse('screenshot', { size: buffer.length }, Date.now() - start);

    if (format === 'binary') {
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: buffer.toString('base64'),
      contentType: 'image/png',
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('screenshot', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser/screenshot - Get screenshot as image
 * 
 * Returns PNG image directly
 */
export async function GET() {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    const controller = sessionManager.getController();
    
    logger.logAction('screenshot', { format: 'binary' });
    const start = Date.now();

    const buffer = await controller.screenshot();

    logger.logResponse('screenshot', { size: buffer.length }, Date.now() - start);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('screenshot', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

