import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager, BrowserActionSchema, getBrowserLogger } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

/**
 * Try to reconnect to an existing Browserbase session
 * Used when action endpoint hits a different serverless instance
 * 
 * Priority:
 * 1. Use provided sessionId (most reliable)
 * 2. Fall back to searching for running sessions
 */
async function ensureSession(browserbaseSessionId?: string): Promise<boolean> {
  // Already have session in memory
  if (sessionManager.hasSession()) {
    return true;
  }

  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return false;

  // If we have a specific session ID, try to reconnect to it directly
  if (browserbaseSessionId) {
    console.log(`[action] Reconnecting to specific session: ${browserbaseSessionId}`);
    const { BrowserController } = await import('@/lib/browser/controller');
    const controller = new BrowserController({
      useBrowserbase: true,
      browserbaseConfig: { apiKey, projectId },
    });

    try {
      const reconnected = await controller.reconnectToBrowserbaseSession(browserbaseSessionId);
      if (reconnected) {
        // @ts-ignore - store in session manager
        sessionManager['session'] = {
          id: browserbaseSessionId,
          controller,
          createdAt: new Date(),
          browserbaseSessionId: browserbaseSessionId,
        };
        console.log(`[action] Successfully reconnected to ${browserbaseSessionId}`);
        return true;
      }
    } catch (error) {
      console.error(`[action] Failed to reconnect to ${browserbaseSessionId}:`, error);
    }
  }

  // Fallback: search for any running session in our project
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
        console.log(`[action] Reconnecting to found session: ${runningSession.id}`);
        const { BrowserController } = await import('@/lib/browser/controller');
        const controller = new BrowserController({
          useBrowserbase: true,
          browserbaseConfig: { apiKey, projectId },
        });

        const reconnected = await controller.reconnectToBrowserbaseSession(runningSession.id);
        if (reconnected) {
          // @ts-ignore - store in session manager
          sessionManager['session'] = {
            id: runningSession.id,
            controller,
            createdAt: new Date(),
            browserbaseSessionId: runningSession.id,
          };
          console.log(`[action] Successfully reconnected`);
          return true;
        }
      }
    }
  } catch (error) {
    console.error('[action] Failed to find/reconnect:', error);
  }
  return false;
}

/**
 * POST /api/browser/action - Execute a browser action
 * 
 * Supported actions:
 * - navigate: { type: 'navigate', url: string }
 * - click: { type: 'click', x: number, y: number }
 * - click_element: { type: 'click_element', selector: string }
 * - type: { type: 'type', text: string }
 * - type_element: { type: 'type_element', selector: string, text: string }
 * - key: { type: 'key', key: string }
 * - scroll: { type: 'scroll', direction: 'up'|'down'|'left'|'right', amount?: number }
 * - scroll_to: { type: 'scroll_to', selector: string }
 * - back: { type: 'back' }
 * - forward: { type: 'forward' }
 * - refresh: { type: 'refresh' }
 * - get_state: { type: 'get_state' }
 * - get_state_compact: { type: 'get_state_compact' }
 * - screenshot: { type: 'screenshot' }
 * - hover: { type: 'hover', x: number, y: number }
 * - hover_element: { type: 'hover_element', selector: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract session info before parsing action (tools pass this for reliable reconnection)
    const browserbaseSessionId = body.browserbaseSessionId as string | undefined;
    
    // Ensure we have a session (reconnect if needed for serverless)
    const hasSession = await ensureSession(browserbaseSessionId);
    if (!hasSession) {
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
    logger.logError('action', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

