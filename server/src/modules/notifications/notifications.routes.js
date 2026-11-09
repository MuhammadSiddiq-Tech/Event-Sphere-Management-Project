/**
 * @fileoverview Notification REST Routes.
 * T-7.5. FR-SYS-03.
 *
 * All routes require authentication (any role).
 *
 * GET    /api/v1/notifications              list (paginated, ?unread=true)
 * GET    /api/v1/notifications/unread-count unread count
 * PATCH  /api/v1/notifications/read-all    mark all read
 * PATCH  /api/v1/notifications/:id/read    mark one read
 */

import { router } from '../../core/router.js';
import { requireAuth } from '../../middleware/auth.js';
import { notificationsController } from './notifications.controller.js';

const BASE = '/api/v1/notifications';

router.get(BASE, requireAuth, notificationsController.list);
router.get(`${BASE}/unread-count`, requireAuth, notificationsController.unreadCount);
router.patch(`${BASE}/read-all`, requireAuth, notificationsController.markAllRead);
router.patch(`${BASE}/:id/read`, requireAuth, notificationsController.markRead);
