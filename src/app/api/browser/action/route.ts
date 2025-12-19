import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSessionManager, BrowserActionSchema, getBrowserLogger } from '@/lib/browser';

const sessionManager = getGlobalSessionManager();
const logger = getBrowserLogger();

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
    if (!sessionManager.hasSession()) {
      return NextResponse.json(
        { error: 'No active session. Create one first via POST /api/browser/session' },
        { status: 404 }
      );
    }

    const body = await request.json();
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

