import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSessionManager } from '../browser/index.js';

interface GetCookiesQuery {
    tabId: string;
    filterDomain?: string;
}

export async function cookiesRoutes(fastify: FastifyInstance) {
    const sessionManager = getSessionManager();

    /**
     * GET /cookies - Get cookies from browser session
     * 
     * Query:
     * - tabId: string (required) - Tab ID for the session
     * - filterDomain: string (optional) - Domain to filter cookies by
     */
    fastify.get<{ Querystring: GetCookiesQuery }>(
        '/',
        async (request: FastifyRequest<{ Querystring: GetCookiesQuery }>, reply: FastifyReply) => {
            const { tabId, filterDomain } = request.query;

            if (!tabId) {
                return reply.status(400).send({ error: 'tabId is required' });
            }

            const controller = sessionManager.getController(tabId);
            if (!controller || !controller.isLaunched()) {
                return reply.status(404).send({
                    error: 'No active browser session. Start a browser session first.',
                });
            }

            try {
                let cookies = await controller.getCookies();
                const totalCookies = cookies.length;

                // Filter by domain if specified
                if (filterDomain) {
                    const filterPattern = filterDomain.replace(/^\*\./, '');
                    cookies = cookies.filter(c =>
                        c.domain.endsWith(filterPattern) || c.domain === filterPattern
                    );
                }

                return reply.send({
                    success: true,
                    cookies,
                    cookie_count: cookies.length,
                    filter_domain: filterDomain || null,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return reply.status(500).send({ error: message });
            }
        }
    );
}
