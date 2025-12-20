import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager } from '../browser/index.js';
import type { Cookie } from '../browser/types.js';

interface CreateSessionBody {
  tabId: string;
  cookies?: Cookie[];
  defaultUrl?: string;
  headless?: boolean;
}

interface GetSessionQuery {
  tabId?: string;
}

interface DeleteSessionQuery {
  tabId: string;
}

export async function sessionRoutes(fastify: FastifyInstance) {
  const sessionManager = getSessionManager();

  /**
   * POST /session - Create or get a browser session
   * 
   * Body:
   * - tabId: string (required) - Unique identifier for this browser tab
   * - cookies: Cookie[] (optional) - Cookies to inject
   * - defaultUrl: string (optional) - URL to navigate to after session creation
   * - headless: boolean (optional) - Run browser in headless mode
   */
  fastify.post<{ Body: CreateSessionBody }>(
    '/',
    async (request: FastifyRequest<{ Body: CreateSessionBody }>, reply: FastifyReply) => {
      const { tabId, cookies, defaultUrl, headless = false } = request.body;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      try {
        console.log(`[POST /session] Creating session for tabId: ${tabId}`);
        
        const session = await sessionManager.createSession(
          tabId,
          { headless },
          cookies,
          defaultUrl
        );

        // Get live URL if available
        let liveUrl: string | null = null;
        const controller = sessionManager.getController(tabId);
        if (controller) {
          liveUrl = await controller.getBrowserbaseLiveViewUrl();
        }

        console.log(`[POST /session] ✓ Session created: ${session.browserbaseSessionId || tabId}`);

        return reply.status(201).send({
          ...session,
          liveUrl,
          cookiesLoaded: cookies && cookies.length > 0,
          cookieCount: cookies?.length || 0,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[POST /session] Error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /session - Get session info
   * 
   * Query:
   * - tabId: string (required) - Tab ID to look up
   */
  fastify.get<{ Querystring: GetSessionQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: GetSessionQuery }>, reply: FastifyReply) => {
      const { tabId } = request.query;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      try {
        console.log(`[GET /session] Looking up tabId: ${tabId}`);

        const sessionInfo = sessionManager.getSessionInfo(tabId);
        
        if (!sessionInfo) {
          console.log(`[GET /session] No session found for tabId: ${tabId}`);
          return reply.status(404).send({ error: 'No active session' });
        }

        console.log(`[GET /session] ✓ Found session: ${sessionInfo.browserbaseSessionId || tabId}`);
        return reply.send(sessionInfo);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[GET /session] Error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * DELETE /session - Close a session
   * 
   * Query:
   * - tabId: string (required) - Tab ID to close
   */
  fastify.delete<{ Querystring: DeleteSessionQuery }>(
    '/',
    async (request: FastifyRequest<{ Querystring: DeleteSessionQuery }>, reply: FastifyReply) => {
      const { tabId } = request.query;

      if (!tabId) {
        return reply.status(400).send({ error: 'tabId is required' });
      }

      try {
        console.log(`[DELETE /session] Closing session for tabId: ${tabId}`);
        
        await sessionManager.closeSession(tabId);
        
        console.log(`[DELETE /session] ✓ Session closed: ${tabId}`);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[DELETE /session] Error:', error);
        return reply.status(500).send({ error: message });
      }
    }
  );

  /**
   * GET /session/list - List all active sessions
   */
  fastify.get('/list', async (_request, reply: FastifyReply) => {
    try {
      const sessions = sessionManager.listSessions();
      return reply.send({ sessions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GET /session/list] Error:', error);
      return reply.status(500).send({ error: message });
    }
  });
}

