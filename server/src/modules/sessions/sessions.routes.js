/**
 * @fileoverview Sessions Route Definitions.
 * T-5.2 — CRUD endpoints.
 * T-5.3 — Cancel endpoint.
 * T-5.4 — Public schedule list (GET /api/v1/expos/:id/sessions — no auth).
 *
 * Route registration order (static before dynamic):
 *   POST   /api/v1/expos/:id/sessions         — admin create
 *   GET    /api/v1/expos/:id/sessions         — public list (T-5.4)
 *   GET    /api/v1/sessions/:id               — public get single
 *   POST   /api/v1/sessions/:id/cancel        — admin cancel  ← BEFORE PATCH /:id
 *   PATCH  /api/v1/sessions/:id              — admin update
 *   DELETE /api/v1/sessions/:id              — admin delete
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  expoIdParamSchema,
  sessionIdSchema,
  createSessionSchema,
  updateSessionSchema,
  cancelSessionSchema,
  listSessionsSchema,
} from './sessions.schema.js';
import { sessionsController } from './sessions.controller.js';

// ─── Admin: create session for an expo ───────────────────────────────────────
router.post(
  '/api/v1/expos/:id/sessions',
  requireAuth,
  requireRole('admin'),
  validate({ params: expoIdParamSchema, body: createSessionSchema }),
  sessionsController.create
);

// ─── Public: list sessions for an expo (T-5.4) ───────────────────────────────
router.get(
  '/api/v1/expos/:id/sessions',
  validate({ params: expoIdParamSchema, query: listSessionsSchema }),
  sessionsController.list
);

// ─── Public: get single session ───────────────────────────────────────────────
router.get(
  '/api/v1/sessions/:id',
  validate({ params: sessionIdSchema }),
  sessionsController.getById
);

// ─── Admin: cancel session — MUST be before PATCH /:id ───────────────────────
router.post(
  '/api/v1/sessions/:id/cancel',
  requireAuth,
  requireRole('admin'),
  validate({ params: sessionIdSchema, body: cancelSessionSchema }),
  sessionsController.cancel
);

// ─── Admin: update session ────────────────────────────────────────────────────
router.patch(
  '/api/v1/sessions/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: sessionIdSchema, body: updateSessionSchema }),
  sessionsController.update
);

// ─── Admin: delete session ────────────────────────────────────────────────────
router.delete(
  '/api/v1/sessions/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: sessionIdSchema }),
  sessionsController.delete
);
