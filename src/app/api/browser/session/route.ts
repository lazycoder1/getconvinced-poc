import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';
import { getBrowserLogger } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

/**
 * POST /api/browser/session - Create a new browser session
 */
export async function POST(request: NextRequest) {
  try {
    if (sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'Session already exists. Close it first.' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { headless = false, cookies } = body;

    logger.logAction('create_session', { headless, hasCookies: !!cookies });
    const start = Date.now();

    const session = await sessionManager.createSession({
      headless,
      cookies,
    });

    logger.setSessionId(session.id);
    logger.logResponse('create_session', session, Date.now() - start);

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('create_session', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/browser/session - Get current session info
 */
export async function GET() {
  try {
    const info = sessionManager.getSessionInfo();
    if (!info) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }
    return NextResponse.json(info);
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

