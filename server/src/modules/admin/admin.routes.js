/**
 * @fileoverview Admin User Management Routes.
 * T-8.7. FR-ADM-01.
 *
 * Routes:
 *  GET   /api/v1/admin/users              list users (admin)
 *  GET   /api/v1/admin/users/:id          get user detail (admin)
 *  PATCH /api/v1/admin/users/:id/deactivate  deactivate user (admin)
 *  PATCH /api/v1/admin/users/:id/reactivate  reactivate user (admin)
 */

import { router } from '../../core/router.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../config/constants.js';
import { adminController } from './admin.controller.js';

const BASE = '/api/v1/admin';

router.get(`${BASE}/users`, requireAuth, requireRole(ROLES.ADMIN), adminController.listUsers);
router.get(`${BASE}/users/:id`, requireAuth, requireRole(ROLES.ADMIN), adminController.getUser);
router.patch(`${BASE}/users/:id/deactivate`, requireAuth, requireRole(ROLES.ADMIN), adminController.deactivateUser);
router.patch(`${BASE}/users/:id/reactivate`, requireAuth, requireRole(ROLES.ADMIN), adminController.reactivateUser);
