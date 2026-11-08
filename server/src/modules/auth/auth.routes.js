/**
 * @fileoverview Authentication Route definitions.
 * Architecture §7.2.
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { authRateLimit } from '../../core/rate-limit.js';
import { registerSchema, loginSchema } from './auth.schema.js';
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
