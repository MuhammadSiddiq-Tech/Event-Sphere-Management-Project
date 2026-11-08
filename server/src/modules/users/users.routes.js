/**
 * @fileoverview Users Route definitions.
 * PATCH /api/v1/users/me — update profile
 * PATCH /api/v1/users/me/password — change password
 * T-2.8. FR-AUTH-06.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { updateProfileSchema, changePasswordSchema } from './users.schema.js';
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
