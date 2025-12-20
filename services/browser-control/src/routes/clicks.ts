import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager } from '../browser/index.js';

interface ClicksQuery {
  tabId: string;
  since?: string;
}

export async function clicksRoutes(fastify: FastifyInstance) {
  const sessionManager = getSessionManager();

  /**
   * GET /clicks - Get recent click events
   * 
   * Query:
   * - tabId: string (required) - Tab ID for the session
   * - since: number (optional) - Only return clicks after this timestamp
   */
  fastify.get<{ Querystring: ClicksQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: ClicksQuery }>, reply: FastifyReply) => {
      const { tabId, since } = request.query;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      const controller = sessionManager.getController(tabId);
      if (!controller || !controller.isLaunched()) {
        return reply.status(404).send({ error: 'No active session' });
      }

      try {
        const sinceTimestamp = since ? parseInt(since, 10) : undefined;
        const clicks = controller.getClickEvents(sinceTimestamp);

        return reply.send({ clicks });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
      }
    }
  );
}

