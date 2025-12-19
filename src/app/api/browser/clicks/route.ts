import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();

/**
 * GET /api/browser/clicks - Get recent click events
 * 
 * Query params:
 * - since: timestamp (optional) - only return clicks after this timestamp
 */
export async function GET(request: NextRequest) {
  try {
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    const controller = sessionManager.getController();
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since');
    
    const sinceTimestamp = since ? parseInt(since, 10) : undefined;
    const clicks = controller.getClickEvents(sinceTimestamp);

    return NextResponse.json({ clicks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

