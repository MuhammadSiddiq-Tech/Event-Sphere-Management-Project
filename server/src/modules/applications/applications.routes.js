/**
 * @fileoverview Applications Route Definitions.
 * T-4.4 (exhibitor submit/list/withdraw), T-4.5 (admin list/filter), T-4.6 (review).
 *
 * Exhibitor endpoints (requireRole('exhibitor')):
 *   POST   /api/v1/expos/:id/applications         — submit application
 *   GET    /api/v1/applications/mine               — list my applications
 *   GET    /api/v1/expos/:id/applications/mine     — my application for a specific expo
 *   DELETE /api/v1/applications/:id               — withdraw application
 *
 * Admin endpoints (requireRole('admin')):
 *   GET  /api/v1/expos/:id/applications           — list all applications for expo
 *   GET  /api/v1/applications                     — list all applications (all expos)
 *   POST /api/v1/applications/:id/approve         — approve application
 *   POST /api/v1/applications/:id/reject          — reject application
 *
 * Note: Static sub-paths (/mine, /approve, /reject) must be registered BEFORE
 * the dynamic /:id route so the router doesn't match them as an ID.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  submitApplicationSchema,
  listApplicationsSchema,
  listAllApplicationsSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  applicationIdSchema,
  expoIdParamSchema,
} from './applications.schema.js';
import { applicationsController } from './applications.controller.js';

// ─── Exhibitor: submit application to an expo ─────────────────────────────────
router.post(
  '/api/v1/expos/:id/applications',
  requireAuth,
  requireRole('exhibitor'),
  validate({ body: submitApplicationSchema }),
  applicationsController.submit
);

// ─── Exhibitor: list MY applications (all expos) ─────────────────────────────
// MUST be registered before /api/v1/applications/:id
router.get(
  '/api/v1/applications/mine',
  requireAuth,
  requireRole('exhibitor'),
  applicationsController.listMine
);

// ─── Admin: list ALL applications (all expos) ─────────────────────────────────
router.get(
  '/api/v1/applications',
  requireAuth,
  requireRole('admin'),
  validate({ query: listAllApplicationsSchema }),
  applicationsController.listAll
);

// ─── Exhibitor: my application for a specific expo ───────────────────────────
router.get(
  '/api/v1/expos/:id/applications/mine',
  requireAuth,
  requireRole('exhibitor'),
  applicationsController.getMyApplicationForExpo
);

// ─── Admin: list all applications for a specific expo ────────────────────────
router.get(
  '/api/v1/expos/:id/applications',
  requireAuth,
  requireRole('admin'),
  validate({ query: listApplicationsSchema }),
  applicationsController.listForExpo
);

// ─── Admin: approve application ───────────────────────────────────────────────
router.post(
  '/api/v1/applications/:id/approve',
  requireAuth,
  requireRole('admin'),
  validate({ body: approveApplicationSchema }),
  applicationsController.approve
);

// ─── Admin: reject application ────────────────────────────────────────────────
router.post(
  '/api/v1/applications/:id/reject',
  requireAuth,
  requireRole('admin'),
  validate({ body: rejectApplicationSchema }),
  applicationsController.reject
);

// ─── Exhibitor: withdraw application ─────────────────────────────────────────
router.delete(
  '/api/v1/applications/:id',
  requireAuth,
  requireRole('exhibitor'),
  validate({ params: applicationIdSchema }),
  applicationsController.withdraw
);
