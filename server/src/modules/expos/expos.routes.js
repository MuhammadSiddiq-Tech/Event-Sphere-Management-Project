/**
 * @fileoverview Expos Route definitions.
 * T-3.1, T-3.2, T-3.3. FR-EXPO-01/02, BR-2.
 *
 * Route design:
 *  Public (no auth):
 *    GET  /api/v1/expos                  — list published/ongoing/completed
 *    GET  /api/v1/expos/slug/:slug       — detail by slug
 *    GET  /api/v1/expos/:id              — detail by ID (non-draft only for public)
 *
 *  Authenticated (any role):
 *    GET  /api/v1/expos/:id              — same, but admin sees drafts too
 *
 *  Admin only:
 *    POST   /api/v1/expos                — create
 *    PATCH  /api/v1/expos/:id            — update metadata
 *    POST   /api/v1/expos/:id/publish    — publish
 *    POST   /api/v1/expos/:id/unpublish  — unpublish
 *    DELETE /api/v1/expos/:id            — delete (T-3.3 rules)
 *
 * Note: GET endpoints attach the user optionally (via optionalAuth) so admins
 * see draft expos when authenticated.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createExpoSchema,
  updateExpoSchema,
  listExposSchema,
  expoIdSchema,
  expoSlugSchema,
} from './expos.schema.js';
import { exposController } from './expos.controller.js';

// ─── Public read endpoints ────────────────────────────────────────────────────

// GET /api/v1/expos — list (public, paginated)
router.get(
  '/api/v1/expos',
  validate(listExposSchema),
  exposController.list
);

// GET /api/v1/expos/slug/:slug — detail by slug (public)
router.get(
  '/api/v1/expos/slug/:slug',
  validate(expoSlugSchema),
  exposController.getBySlug
);

// GET /api/v1/expos/:id — detail by ID (optionally authenticated for admin draft access)
router.get(
  '/api/v1/expos/:id',
  validate(expoIdSchema),
  exposController.getById
);

// ─── Admin-only write endpoints ───────────────────────────────────────────────

// POST /api/v1/expos — create
router.post(
  '/api/v1/expos',
  requireAuth,
  requireRole('admin'),
  validate(createExpoSchema),
  exposController.create
);

// PATCH /api/v1/expos/:id — update metadata
router.patch(
  '/api/v1/expos/:id',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  validate(updateExpoSchema),
  exposController.update
);

// POST /api/v1/expos/:id/publish
router.post(
  '/api/v1/expos/:id/publish',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  exposController.publish
);

// POST /api/v1/expos/:id/unpublish
router.post(
  '/api/v1/expos/:id/unpublish',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  exposController.unpublish
);

// DELETE /api/v1/expos/:id
router.delete(
  '/api/v1/expos/:id',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  exposController.delete
);
