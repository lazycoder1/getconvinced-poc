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
        return reply.status(500).send({ error: message });
      }
    }
  );
}

