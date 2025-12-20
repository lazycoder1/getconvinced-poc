import { getSessionManager } from '../browser/index.js';
export async function liveUrlRoutes(fastify) {
    const sessionManager = getSessionManager();
    /**
     * GET /live-url - Get Browserbase live view URL
     *
     * Query:
     * - tabId: string (required) - Tab ID for the session
     *
     * Returns the debugger fullscreen URL for an interactive browser session.
     */
    fastify.get('/', async (request, reply) => {
        const { tabId } = request.query;
        if (!tabId) {
            return reply.status(400).send({ error: 'tabId is required' });
        }
        const controller = sessionManager.getController(tabId);
        if (!controller || !controller.isLaunched()) {
            return reply.status(404).send({
                error: 'No active session or live view not available',
                usingBrowserbase: false,
            });
        }
        try {
            const liveUrl = await controller.getBrowserbaseLiveViewUrl();
            if (liveUrl) {
                return reply.send({
                    liveUrl,
                    usingBrowserbase: true,
                });
            }
            return reply.status(404).send({
                error: 'Live view not available (not using Browserbase)',
                usingBrowserbase: false,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(500).send({ error: message });
        }
    });
}
//# sourceMappingURL=live-url.js.map