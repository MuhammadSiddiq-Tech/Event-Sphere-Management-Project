/**
 * @fileoverview ExhibitorProfile Route Definitions.
 * T-4.1 (authenticated CRUD), T-4.2 (public search).
 *
 * Public endpoints (no auth):
 *   GET  /api/v1/exhibitors           — paginated list (q, category, expo filters)
 *   GET  /api/v1/exhibitors/:userId   — public single exhibitor profile
 *
 * Exhibitor-authenticated:
 *   GET  /api/v1/exhibitors/me        — own full profile
 *   PUT  /api/v1/exhibitors/me        — upsert own profile
 *
 * Note: /me routes MUST be registered before /:userId to avoid "me" being
 * matched as a userId parameter.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  upsertProfileSchema,
  listExhibitorsSchema,
  exhibitorUserIdSchema,
} from './exhibitorProfile.schema.js';
import { exhibitorProfileController } from './exhibitorProfile.controller.js';

// ─── Exhibitor-authenticated endpoints ───────────────────────────────────────

// GET /api/v1/exhibitors/me — own full profile
router.get(
  '/api/v1/exhibitors/me',
  requireAuth,
  requireRole('exhibitor'),
  exhibitorProfileController.getMyProfile
);

// PUT /api/v1/exhibitors/me — upsert own profile
router.put(
  '/api/v1/exhibitors/me',
  requireAuth,
  requireRole('exhibitor'),
  validate({ body: upsertProfileSchema }),
  exhibitorProfileController.upsertMyProfile
);

// ─── Public endpoints ─────────────────────────────────────────────────────────

// GET /api/v1/exhibitors — public paginated list
router.get(
  '/api/v1/exhibitors',
  validate({ query: listExhibitorsSchema }),
  exhibitorProfileController.listPublic
);

// GET /api/v1/exhibitors/:userId — public single exhibitor profile
router.get(
  '/api/v1/exhibitors/:userId',
  validate({ params: exhibitorUserIdSchema }),
  exhibitorProfileController.getPublicProfile
);
