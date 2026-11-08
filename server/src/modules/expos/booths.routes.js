/**
 * @fileoverview Booths Route definitions.
 * T-3.4, T-3.5. FR-EXPO-03.
 *
 * All booth endpoints are nested under /api/v1/expos/:id/booths.
 *
 *  Public (no auth):
 *    GET  /api/v1/expos/:id/booths              — list booths (published/ongoing expos only)
 *    GET  /api/v1/expos/:id/booths/:boothId     — single booth detail
 *
 *  Admin only:
 *    POST   /api/v1/expos/:id/booths              — add a booth (DRAFT expo only)
 *    PATCH  /api/v1/expos/:id/booths/:boothId     — update booth metadata (DRAFT expo only)
 *    DELETE /api/v1/expos/:id/booths/:boothId     — delete a booth (DRAFT expo only)
 *    PUT    /api/v1/expos/:id/booths              — bulk replace floor plan (DRAFT expo only)
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  createBoothSchema,
  updateBoothSchema,
  bulkReplaceBoothsSchema,
  listBoothsSchema,
  expoIdSchema,
  boothIdSchema,
  reserveBoothSchema,
} from './booths.schema.js';
import { boothsController } from './booths.controller.js';

// ─── Public read endpoints ────────────────────────────────────────────────────

// GET /api/v1/expos/:id/booths
router.get(
  '/api/v1/expos/:id/booths',
  validate(expoIdSchema),
  validate(listBoothsSchema),
  boothsController.list
);

// GET /api/v1/expos/:id/booths/:boothId
router.get(
  '/api/v1/expos/:id/booths/:boothId',
  validate(boothIdSchema),
  boothsController.getById
);

// ─── Admin-only write endpoints ───────────────────────────────────────────────

// POST /api/v1/expos/:id/booths — add a booth
router.post(
  '/api/v1/expos/:id/booths',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  validate(createBoothSchema),
  boothsController.create
);

// PATCH /api/v1/expos/:id/booths/:boothId — update metadata
router.patch(
  '/api/v1/expos/:id/booths/:boothId',
  requireAuth,
  requireRole('admin'),
  validate(boothIdSchema),
  validate(updateBoothSchema),
  boothsController.update
);

// DELETE /api/v1/expos/:id/booths/:boothId
router.delete(
  '/api/v1/expos/:id/booths/:boothId',
  requireAuth,
  requireRole('admin'),
  validate(boothIdSchema),
  boothsController.delete
);

// PUT /api/v1/expos/:id/booths — bulk replace floor plan
router.put(
  '/api/v1/expos/:id/booths',
  requireAuth,
  requireRole('admin'),
  validate(expoIdSchema),
  validate(bulkReplaceBoothsSchema),
  boothsController.bulkReplace
);

// ─── Exhibitor reservation endpoints (T-3.6, Rule BR-3, BR-4) ────────────────

// POST /api/v1/booths/:id/reserve
router.post(
  '/api/v1/booths/:id/reserve',
  requireAuth,
  requireRole('exhibitor'),
  validate(reserveBoothSchema),
  boothsController.reserve
);

// POST /api/v1/expos/:id/booths/:boothId/reserve
router.post(
  '/api/v1/expos/:id/booths/:boothId/reserve',
  requireAuth,
  requireRole('exhibitor'),
  validate(boothIdSchema),
  boothsController.reserve
);
