/**
 * @fileoverview Notifications Controller.
 * T-7.5. FR-SYS-03.
 *
 * Routes:
 *   GET  /api/v1/notifications            → list (paginated, ?unread=true)
 *   GET  /api/v1/notifications/unread-count → { count }
 *   PATCH /api/v1/notifications/:id/read  → mark single read
 *   PATCH /api/v1/notifications/read-all  → mark all read
 */

import { notificationsService } from './notifications.service.js';

export const notificationsController = {
  /**
   * List notifications for the authenticated user.
   */
  async list(ctx) {
    const result = await notificationsService.list(ctx.user._id.toString(), ctx.query);
    ctx.json(200, result.items, result.meta);
  },

  /**
   * Get unread notification count.
   */
  async unreadCount(ctx) {
    const result = await notificationsService.unreadCount(ctx.user._id.toString());
    ctx.json(200, result);
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(ctx) {
    const notification = await notificationsService.markRead(
      ctx.user._id.toString(),
      ctx.params.id
    );
    ctx.json(200, notification);
  },

  /**
   * Mark all notifications as read.
   */
  async markAllRead(ctx) {
    const result = await notificationsService.markAllRead(ctx.user._id.toString());
    ctx.json(200, result);
  },
};
