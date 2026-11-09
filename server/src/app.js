/**
 * @fileoverview Application request handler factory.
 * Builds the full middleware pipeline and returns a node:http-compatible
 * requestListener function. No listen() call here — that's server.js.
 * Architecture §5.1, §5.3.
 */

import { randomUUID } from 'node:crypto';
import { buildCtx } from './core/context.js';
import { compose } from './core/pipeline.js';
import { secureHeaders, cors, sanitiseBody, normaliseQuery } from './core/security.js';
import { globalRateLimit } from './core/rate-limit.js';
import { compress } from './core/compress.js';
import { serveStatic } from './core/static.js';
import { router } from './core/router.js';
import { logger } from './config/logger.js';
import { isDbHealthy } from './config/db.js';
import { env } from './config/env.js';
import { renderSwaggerUi } from './docs/swaggerUi.js';
import openapiSpec from './docs/openapi.json' with { type: 'json' };

// ─── Import and register all route modules ───────────────────────────────────
import './modules/auth/auth.routes.js';
import './modules/users/users.routes.js';
import './modules/expos/expos.routes.js';
import './modules/expos/booths.routes.js';
import './modules/upload/upload.routes.js';
import './modules/exhibitors/exhibitorProfile.routes.js';
import './modules/applications/applications.routes.js';
import './modules/sessions/sessions.routes.js';
import './modules/attendee/attendee.routes.js';
import './modules/notifications/notifications.routes.js';
import './modules/conversations/conversations.routes.js';
import './modules/feedback/feedback.routes.js';
import './modules/analytics/analytics.routes.js';
import './modules/admin/admin.routes.js';

// ─── Health endpoint (always registered) ─────────────────────────────────────
router.get('/health', async (ctx) => {
  const dbOk = await isDbHealthy();
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    db: dbOk ? 'connected' : 'unavailable',
  };
  ctx.json(dbOk ? 200 : 503, payload);
});

// ─── Metrics endpoint (T-9.9, NFR-REL-01, NFR-OPS-01) ────────────────────────
// Exposes lightweight process and memory metrics for operational monitoring.
// Restricted to internal use; in production, protect with a sidecar or API gateway.
router.get('/metrics', async (ctx) => {
  const mem = process.memoryUsage();
  const dbOk = await isDbHealthy();

  const payload = {
    uptime_seconds: Math.floor(process.uptime()),
    db_connected: dbOk,
    memory: {
      rss_mb: (mem.rss / 1024 / 1024).toFixed(2),
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      external_mb: (mem.external / 1024 / 1024).toFixed(2),
    },
    nodejs_version: process.version,
    platform: process.platform,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };

  ctx.json(200, payload);
});

// ─── API docs & OpenAPI spec (dev only) ──────────────────────────────────────
if (env.NODE_ENV !== 'production') {
  router.get('/api/openapi.json', async (ctx) => {
    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    ctx.res.end(JSON.stringify(openapiSpec));
  });

  router.get('/api/docs', async (ctx) => {
    ctx.res.writeHead(200, { 'Content-Type': 'text/html' });
    ctx.res.end(renderSwaggerUi('/api/openapi.json'));
  });
}

// ─── Global middleware pipeline ───────────────────────────────────────────────
const globalPipeline = compose([
  secureHeaders,
  cors,
  globalRateLimit,
  normaliseQuery,
  compress,
  serveStatic,
]);

/**
 * The main request listener — compatible with http.createServer.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function requestHandler(req, res) {
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('X-Request-ID', requestId);

  const childLogger = logger.child({ requestId, method: req.method, url: req.url });
  const ctx = buildCtx(req, res, requestId, childLogger);

  childLogger.info('→ request received');

  try {
    // Run global middleware
    await globalPipeline(ctx);

    // If the response has already been sent (e.g., static file, CORS preflight) — stop
    if (res.headersSent) return;

    // Body sanitisation (applied after body is available — controllers parse body themselves)
    // sanitiseBody is applied per-route after body parsing via middleware

    // Match route and compose route-level handler chain
    const match = router.match(ctx);
    if (!match) return; // 404/405 already written

    // Parse JSON body for mutation requests if not parsed
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const { parseJson } = await import('./core/body.js');
        await parseJson(ctx);
      }
    }

    const routePipeline = compose([sanitiseBody, ...match.handlers]);
    await routePipeline(ctx);
  } catch (err) {
    if (!res.headersSent) {
      childLogger.error({ err }, 'Unhandled top-level error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }));
    }
  }
}
