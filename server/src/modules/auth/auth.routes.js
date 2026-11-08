/**
 * @fileoverview Authentication Route definitions.
 * Architecture §7.2.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimit } from '../../core/rate-limit.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { authController } from './auth.controller.js';

// POST /api/v1/auth/register
router.post(
  '/api/v1/auth/register',
  authRateLimit,
  validate(registerSchema),
  authController.register
);

// POST /api/v1/auth/login
router.post(
  '/api/v1/auth/login',
  authRateLimit,
  validate(loginSchema),
  authController.login
);

// POST /api/v1/auth/refresh
router.post(
  '/api/v1/auth/refresh',
  authController.refresh
);

// POST /api/v1/auth/logout
router.post(
  '/api/v1/auth/logout',
  authController.logout
);

// GET /api/v1/auth/me
router.get(
  '/api/v1/auth/me',
  requireAuth,
  authController.me
);

// POST /api/v1/auth/forgot-password  (always 200 — no enumeration)
router.post(
  '/api/v1/auth/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/api/v1/auth/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword
);
