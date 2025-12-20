import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager } from '../browser/index.js';

interface ScreenshotBody {
  tabId: string;
  fullPage?: boolean;
  format?: 'base64' | 'binary';
}

interface ScreenshotQuery {
  tabId: string;
}

/**
 * Screenshot routes for the browser control service
 */
export async function screenshotRoutes(fastify: FastifyInstance) {
  const sessionManager = getSessionManager();

  /**
   * POST /screenshot - Capture a screenshot
   */
  fastify.post<{ Body: ScreenshotBody }>(
    '/',
    async (request: FastifyRequest<{ Body: ScreenshotBody }>, reply: FastifyReply) => {
      const { tabId, fullPage, format } = request.body;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      try {
        console.log(`[POST /screenshot] tabId: ${tabId}, fullPage: ${fullPage}`);

        if (!sessionManager.hasSession(tabId)) {
          return reply.status(404).send({ error: 'No active session' });
        }

        const controller = sessionManager.getController(tabId);
        if (!controller) {
          return reply.status(404).send({ error: 'Session controller not found' });
        }

        const buffer = await controller.screenshot();

        if (format === 'binary') {
          return reply
            .header('Content-Type', 'image/png')
            .header('Content-Length', buffer.length.toString())
            .send(buffer);
        }

        return reply.send({
          success: true,
          data: buffer.toString('base64'),
          contentType: 'image/png',
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[POST /screenshot] Error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /screenshot - Get screenshot as PNG image
   */
  fastify.get<{ Querystring: ScreenshotQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: ScreenshotQuery }>, reply: FastifyReply) => {
      const { tabId } = request.query;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      try {
        console.log(`[GET /screenshot] tabId: ${tabId}`);

        if (!sessionManager.hasSession(tabId)) {
          return reply.status(404).send({ error: 'No active session' });
        }

        const controller = sessionManager.getController(tabId);
        if (!controller) {
          return reply.status(404).send({ error: 'Session controller not found' });
        }

        const buffer = await controller.screenshot();

        return reply
          .header('Content-Type', 'image/png')
          .header('Content-Length', buffer.length.toString())
          .header('Cache-Control', 'no-cache')
          .send(buffer);

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[GET /screenshot] Error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );
}

