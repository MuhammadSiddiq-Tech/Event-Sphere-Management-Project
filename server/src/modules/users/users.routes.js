/**
 * @fileoverview Users Route definitions.
 * PATCH  /api/v1/users/me          — update profile
 * PATCH  /api/v1/users/me/password — change password
 * GET    /api/v1/users/me/export   — export user data (GDPR)
 * PATCH  /api/v1/users/me/consent  — update optional consents
 * DELETE /api/v1/users/me          — anonymize & delete account
 * T-2.8, T-9.1. FR-AUTH-06, FR-SYS-05, NFR-PRIV-01..03.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateConsentSchema,
  deleteAccountSchema,
} from './users.schema.js';
import { usersController } from './users.controller.js';

// PATCH /api/v1/users/me — update name / phone / avatarUrl
router.patch(
  '/api/v1/users/me',
  requireAuth,
  validate(updateProfileSchema),
  usersController.updateMe
);

// PATCH /api/v1/users/me/password — change password (requires current password)
router.patch(
  '/api/v1/users/me/password',
  requireAuth,
  validate(changePasswordSchema),
  usersController.changePassword
);

// GET /api/v1/users/me/export — export personal data (GDPR)
router.get(
  '/api/v1/users/me/export',
  requireAuth,
  usersController.exportMe
);

// PATCH /api/v1/users/me/consent — update optional consents (marketing, analytics)
router.patch(
  '/api/v1/users/me/consent',
  requireAuth,
  validate(updateConsentSchema),
  usersController.updateConsent
);

// DELETE /api/v1/users/me — anonymize & delete account (requires password verification)
router.delete(
  '/api/v1/users/me',
  requireAuth,
  validate(deleteAccountSchema),
  usersController.deleteMe
);
