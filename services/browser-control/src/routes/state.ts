import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager, getBrowserLogger } from '../browser/index.js';

interface StateQuery {
  tabId: string;
  compact?: string;
  lite?: string;
  includeIframes?: string;
}

export async function stateRoutes(fastify: FastifyInstance) {
  const sessionManager = getSessionManager();
  const logger = getBrowserLogger();

  /**
   * GET /state - Get current page state
   * 
   * Query parameters:
   * - tabId: string (required) - Tab ID for the session
   * - compact: "true" - Return AI-optimized compact state
   * - lite: "true" - Return minimal state (URL, title, element count)
   * - includeIframes: "true" - Include iframe content (full state only)
   * 
   * Default: Returns full page state
   */
  fastify.get<{ Querystring: StateQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: StateQuery }>, reply: FastifyReply) => {
      const { tabId, compact, lite, includeIframes } = request.query;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      const controller = sessionManager.getController(tabId);
      if (!controller || !controller.isLaunched()) {
        return reply.status(404).send({ error: 'No active session' });
      }

      const start = Date.now();

      try {
        let state;
        let stateType: string;

        if (compact === 'true') {
          state = await controller.getStateCompact();
          stateType = 'compact';

          // If compact extraction is empty (common on HubSpot SPA), wait for row selectors then retry once.
          const buttonsLen = Array.isArray((state as any)?.buttons) ? (state as any).buttons.length : 0;
          const linksLen = Array.isArray((state as any)?.links) ? (state as any).links.length : 0;
          const inputsLen = Array.isArray((state as any)?.inputs) ? (state as any).inputs.length : 0;
          const tablesLen = Array.isArray((state as any)?.tables) ? (state as any).tables.length : 0;
          const looksEmptyForData = (tablesLen === 0) && (buttonsLen + linksLen + inputsLen === 0);

          if (looksEmptyForData) {
            const page = controller.getRawPage();
            const selectors = [
              'tr[data-test-id^="row-"]',
              '[data-test-id^="row-"]',
              'a[data-link]',
              '[data-table-external-id]',
            ];
            for (const sel of selectors) {
              try {
                await page.waitForSelector(sel, { timeout: 10_000 });
                break;
              } catch {
                // try next selector
              }
            }
            state = await controller.getStateCompact();
          }
        } else if (lite === 'true') {
          state = await controller.getStateLite();
          stateType = 'lite';
        } else {
          state = await controller.getState({ includeIframes: includeIframes === 'true' });
          stateType = 'full';
        }

        logger.logResponse('get_state', { type: stateType }, Date.now() - start);

        return reply.send({
          success: true,
          stateType,
          state,
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.logError('get_state', error);

        // If page/browser is closed, clean up the stale session
        if (message.includes('Target page, context or browser has been closed') ||
            message.includes('Target closed') ||
            message.includes('Session closed') ||
            message.includes('Protocol error')) {
          try {
            await sessionManager.closeSession(tabId);
          } catch { }
          return reply.status(410).send({
            error: 'Session expired - browser was closed. Please start a new session.',
            sessionExpired: true
          });
        }

        return reply.status(500).send({ error: message });
      }
    }
  );
}

