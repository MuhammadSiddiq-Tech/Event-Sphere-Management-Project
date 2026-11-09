/**
 * @fileoverview Feedback REST Routes.
 * T-7.11. FR-SYS-02, FR-ADM-01.
 *
 * Routes:
 *  POST   /api/v1/feedback      submit feedback (authenticated, any role)
 *  GET    /api/v1/feedback      list feedback (admin only, paginated)
 *  GET    /api/v1/feedback/:id  get feedback detail (admin only)
 *  PATCH  /api/v1/feedback/:id  update triage status / notes (admin only)
 */

import { router } from '../../core/router.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import { feedbackController } from './feedback.controller.js';
import { submitFeedbackSchema, updateFeedbackStatusSchema } from './feedback.schema.js';

const BASE = '/api/v1/feedback';

// Any authenticated user can submit feedback
router.post(
  BASE,
  requireAuth,
  validate({ body: submitFeedbackSchema }),
  feedbackController.submit
);

// Admin-only triage endpoints
router.get(
  BASE,
  requireAuth,
  requireRole(ROLES.ADMIN),
  feedbackController.list
);

router.get(
  `${BASE}/:id`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  feedbackController.getById
);

router.patch(
  `${BASE}/:id`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate({ body: updateFeedbackStatusSchema }),
  feedbackController.updateStatus
);
