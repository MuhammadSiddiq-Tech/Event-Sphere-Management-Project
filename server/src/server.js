/**
 * @fileoverview HTTP + Socket.IO server bootstrap.
 * Creates http.Server, attaches Socket.IO, connects to Mongo, starts listening.
 * Handles SIGTERM gracefully. Architecture §5.1. NFR-REL-01.
 */

import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { requestHandler } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startAllJobs, stopAllJobs } from './jobs/index.js';

// ─── Create HTTP server ───────────────────────────────────────────────────────
const httpServer = createServer(requestHandler);

// ─── Attach Socket.IO ─────────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
  // Socket.IO handles its own /socket.io/* path before the router sees it
});

// Socket auth + room setup will be registered in Phase 7 (sockets/index.js)
// import './sockets/index.js';

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  await connectDb();
  startAllJobs();

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 EventSphere API listening on http://localhost:${env.PORT}`);
    logger.info(`   Socket.IO attached to same port`);
    if (env.NODE_ENV !== 'production') {
      logger.info(`   API docs: http://localhost:${env.PORT}/api/docs`);
    }
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Shutting down…');
  stopAllJobs();

  httpServer.close(async () => {
    await disconnectDb();
    logger.info('Server closed cleanly');
    process.exit(0);
  });

  // Force exit after 10 s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
