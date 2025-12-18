import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager, getBrowserLogger } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

/**
 * GET /api/browser/state - Get current page state
 * 
 * Query parameters:
 * - compact=true: Return AI-optimized compact state
 * - lite=true: Return minimal state (URL, title, element count)
 * - includeIframes=true: Include iframe content (full state only)
 * 
 * Default: Returns full page state
 */
export async function GET(request: NextRequest) {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const compact = searchParams.get('compact') === 'true';
    const lite = searchParams.get('lite') === 'true';
    const includeIframes = searchParams.get('includeIframes') === 'true';

    const controller = sessionManager.getController();
    const start = Date.now();

    let state;
    let stateType: string;

    if (compact) {
      state = await controller.getStateCompact();
      stateType = 'compact';
    } else if (lite) {
      state = await controller.getStateLite();
      stateType = 'lite';
    } else {
      state = await controller.getState({ includeIframes });
      stateType = 'full';
    }

    logger.logResponse('get_state', { type: stateType }, Date.now() - start);

    return NextResponse.json({
      success: true,
      stateType,
      state,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logError('get_state', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

