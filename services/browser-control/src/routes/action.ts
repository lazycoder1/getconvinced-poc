import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager, BrowserActionSchema, getBrowserLogger } from '../browser/index.js';
import type { BrowserAction } from '../browser/types.js';

type ActionBody = BrowserAction & {
  tabId: string;
  browserbaseSessionId?: string;
};

export async function actionRoutes(fastify: FastifyInstance) {
  const sessionManager = getSessionManager();
  const logger = getBrowserLogger();

  /**
   * POST /action - Execute a browser action
   * 
   * Body:
   * - tabId: string (required) - Tab ID for the session
   * - browserbaseSessionId: string (optional) - Direct session ID hint
   * - type: string (required) - Action type
   * - ... action-specific parameters
   */
  fastify.post<{ Body: ActionBody }>(
    '/',
    async (request: FastifyRequest<{ Body: ActionBody }>, reply: FastifyReply) => {
      const { tabId, browserbaseSessionId, ...actionData } = request.body;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      // Get the controller for this tabId
      const controller = sessionManager.getController(tabId);
      if (!controller || !controller.isLaunched()) {
        console.log(`[POST /action] No session found for tabId: ${tabId}`);
        return reply.status(404).send({
          error: 'No active session. Create one first via POST /session',
        });
      }

      // Validate the action
      const parsed = BrowserActionSchema.safeParse(actionData);
      if (!parsed.success) {
        return reply.status(400).send({
          error: `Invalid action: ${parsed.error.message}`,
        });
      }

      const action = parsed.data;
      logger.logAction(action.type, action);
      const start = Date.now();

      try {
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
            return reply.status(400).send({
              error: `Unknown action type: ${(_exhaustive as { type: string }).type}`,
            });
          }
        }

        logger.logResponse(action.type, result, Date.now() - start);
        return reply.send(result);

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[POST /action] Error:', error);
        logger.logError(action.type, error);
        return reply.status(500).send({
          success: false,
          error: message,
        });
      }
    }
  );
}

