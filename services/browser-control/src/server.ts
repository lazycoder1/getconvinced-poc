import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getSessionManager } from './browser/index.js';
import { sessionRoutes } from './routes/session.js';
import { actionRoutes } from './routes/action.js';
import { stateRoutes } from './routes/state.js';
import { liveUrlRoutes } from './routes/live-url.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true, // Allow all origins for now (restrict in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Health check endpoint
fastify.get('/health', async () => {
  const sessionManager = getSessionManager();
  const sessions = sessionManager.listSessions();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.length,
    sessions: sessions.map(s => ({
      tabId: s.id,
      browserbaseSessionId: s.browserbaseSessionId,
      createdAt: s.createdAt,
    })),
  };
});

// Register routes
await fastify.register(sessionRoutes, { prefix: '/session' });
await fastify.register(actionRoutes, { prefix: '/action' });
await fastify.register(stateRoutes, { prefix: '/state' });
await fastify.register(liveUrlRoutes, { prefix: '/live-url' });

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  const sessionManager = getSessionManager();
  await sessionManager.closeAll();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   Browser Control Service                                       ║
║   Running on http://${HOST}:${PORT}                               ║
║                                                                 ║
║   Endpoints:                                                    ║
║   - GET  /health      - Service health check                    ║
║   - POST /session     - Create/get browser session              ║
║   - GET  /session     - Get session info                        ║
║   - DELETE /session   - Close session                           ║
║   - POST /action      - Execute browser action                  ║
║   - GET  /state       - Get page state                          ║
║   - GET  /live-url    - Get Browserbase live view URL           ║
╚════════════════════════════════════════════════════════════════╝
  `);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

