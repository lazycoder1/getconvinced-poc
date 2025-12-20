import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager, BrowserActionSchema, getBrowserLogger } from '@/lib/browser';
import { prisma } from '@/lib/database';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

/**
 * Ensure we have an active session, reconnecting if needed
 */
async function ensureSession(browserbaseSessionId?: string, tabId?: string): Promise<boolean> {
  // 1. Already have session in memory
  if (sessionManager.hasSession()) {
    return true;
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return false;

  // 2. Try provided sessionId first (most reliable)
  if (browserbaseSessionId) {
    console.log(`[action] Reconnecting to provided sessionId: ${browserbaseSessionId}`);
    const success = await reconnect(browserbaseSessionId, apiKey, projectId);
    if (success) return true;
  }

  // 3. Try tabId lookup in PostgreSQL
  if (tabId) {
    console.log(`[action] Looking up tabId in PostgreSQL: ${tabId}`);
    try {
      const dbSession = await prisma.browserSession.findUnique({
        where: { tab_id: tabId },
      });
      if (dbSession && dbSession.status === 'running') {
        const success = await reconnect(dbSession.browserbase_session_id, apiKey, projectId);
        if (success) return true;
      }
    } catch (e) {
      console.error('[action] DB lookup failed:', e);
    }
  }

  // 4. Fallback: search Browserbase for any running session
  console.log(`[action] Searching Browserbase for running sessions`);
  try {
    const response = await fetch('https://www.browserbase.com/v1/sessions?status=RUNNING', {
      headers: { 'x-bb-api-key': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      const sessions = data.sessions || data || [];
      const runningSession = Array.isArray(sessions)
        ? sessions.find((s: any) => s.projectId === projectId && s.status === 'RUNNING')
        : null;

      if (runningSession) {
        console.log(`[action] Found running session: ${runningSession.id}`);
        const success = await reconnect(runningSession.id, apiKey, projectId);
        if (success) return true;
      }
    }
  } catch (error) {
    console.error('[action] Browserbase search failed:', error);
  }

  return false;
}

/**
 * Reconnect to a specific Browserbase session
 */
async function reconnect(sessionId: string, apiKey: string, projectId: string): Promise<boolean> {
  try {
    // Verify session is still running
    const checkResponse = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      headers: { 'x-bb-api-key': apiKey },
    });

    if (!checkResponse.ok) {
      console.log(`[action] Session ${sessionId} not found`);
      return false;
    }

    const sessionData = await checkResponse.json();
    if (sessionData.status !== 'RUNNING') {
      console.log(`[action] Session ${sessionId} not running (${sessionData.status})`);
      return false;
    }

    // Reconnect
    const { BrowserController } = await import('@/lib/browser/controller');
    const controller = new BrowserController({
      useBrowserbase: true,
      browserbaseConfig: { apiKey, projectId },
    });

    const reconnected = await controller.reconnectToBrowserbaseSession(sessionId);
    if (reconnected) {
      // @ts-ignore
      sessionManager['session'] = {
        id: sessionId,
        controller,
        createdAt: new Date(),
        browserbaseSessionId: sessionId,
      };
      console.log(`[action] ✓ Reconnected to ${sessionId}`);
      return true;
    }
  } catch (error) {
    console.error(`[action] Reconnect error:`, error);
  }
  return false;
}

/**
 * POST /api/browser/action - Execute a browser action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract session hints from body (tools pass these)
    const browserbaseSessionId = body.browserbaseSessionId as string | undefined;
    const tabId = body.tabId as string | undefined;
    
    // Ensure we have a session
    const hasSession = await ensureSession(browserbaseSessionId, tabId);
    if (!hasSession) {
      console.log(`[action] No session available`);
      return NextResponse.json(
        { error: 'No active session. Create one first via POST /api/browser/session' },
        { status: 404 }
      );
    }

    const parsed = BrowserActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid action: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const action = parsed.data;
    const controller = sessionManager.getController();

    logger.logAction(action.type, action);
    const start = Date.now();

    let result: unknown;

    switch (action.type) {
      case 'navigate': {
        const state = await controller.navigate(action.url);
        result = { success: true, state };
        break;
      }

      case 'click': {
        await controller.click(action.x, action.y);
        result = { success: true };
        break;
      }

      case 'click_element': {
        await controller.clickElement(action.selector);
        result = { success: true };
        break;
      }

      case 'type': {
        await controller.type(action.text);
        result = { success: true };
        break;
      }

      case 'type_element': {
        await controller.typeElement(action.selector, action.text);
        result = { success: true };
        break;
      }

      case 'key': {
        await controller.pressKey(action.key);
        result = { success: true };
        break;
      }

      case 'scroll': {
        await controller.scroll(action.direction, action.amount ?? undefined);
        result = { success: true };
        break;
      }

      case 'scroll_to': {
        await controller.scrollToElement(action.selector);
        result = { success: true };
        break;
      }

      case 'back': {
        const state = await controller.back();
        result = { success: true, state };
        break;
      }

      case 'forward': {
        const state = await controller.forward();
        result = { success: true, state };
        break;
      }

      case 'refresh': {
        const state = await controller.refresh();
        result = { success: true, state };
        break;
      }

      case 'get_state': {
        const state = await controller.getState();
        result = { success: true, state };
        break;
      }

      case 'get_state_compact': {
        const state = await controller.getStateCompact();
        result = { success: true, state };
        break;
      }

      case 'screenshot': {
        const buffer = await controller.screenshot();
        result = { success: true, data: buffer.toString('base64') };
        break;
      }

      case 'hover': {
        await controller.hover(action.x, action.y);
        result = { success: true };
        break;
      }

      case 'hover_element': {
        await controller.hoverElement(action.selector);
        result = { success: true };
        break;
      }

      default: {
        const _exhaustive: never = action;
        return NextResponse.json(
          { error: `Unknown action type: ${(_exhaustive as { type: string }).type}` },
          { status: 400 }
        );
      }
    }

    logger.logResponse(action.type, result, Date.now() - start);
    return NextResponse.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[action] Error:', error);
    logger.logError('action', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
