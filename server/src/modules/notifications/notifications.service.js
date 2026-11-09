/**
 * @fileoverview Notifications Service — business logic layer.
 * T-7.5. FR-SYS-03.
 *
 * Key invariants:
 *  - notify() creates a Notification doc and emits notification:new to the user's socket room.
 *  - list() is paginated, sorted newest-first, optionally filtered by isRead.
 *  - markRead() / markAllRead() are idempotent (no-op if already read).
 */

import { Notification } from '../../models/notification.model.js';
import { NotFoundError } from '../../core/errors.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { emitToUser } from '../../sockets/emitter.js';

export const notificationsService = {
  /**
   * Create a notification for a user and emit notification:new via Socket.IO.
   * @param {string|Object} userId - User ObjectId or string
   * @param {string} type - NOTIFICATION_TYPE value
   * @param {Object} [payload={}] - Event-specific data
   * @returns {Promise<Object>} Created notification
   */
  async notify(userId, type, payload = {}) {
    const userIdStr = userId.toString ? userId.toString() : String(userId);

    const notification = await Notification.create({
      user: userIdStr,
      type,
      payload,
    });

    // Emit real-time event so client can invalidate query cache
    emitToUser(userIdStr, 'notification:new', {
      notificationId: notification._id.toString(),
      type,
      payload,
    });

    return notification.toJSON();
  },

  /**
   * List notifications for the authenticated user.
   * Paginated, sorted newest-first. Optionally filter by isRead.
   * @param {string} userId
   * @param {Object} query - { page?, limit?, unread? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async list(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = { user: userId };
    if (query.unread === 'true' || query.unread === true) {
      filter.isRead = false;
    }

    const [docs, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    // Map _id → id in lean results
    const items = docs.map((d) => ({ ...d, id: d._id.toString(), _id: undefined }));

    return {
      items,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Get unread notification count for the authenticated user.
   * @param {string} userId
   * @returns {Promise<{ count: number }>}
   */
  async unreadCount(userId) {
    const count = await Notification.countDocuments({ user: userId, isRead: false });
    return { count };
  },

  /**
   * Mark a single notification as read (idempotent).
   * @param {string} userId
   * @param {string} notificationId
   * @returns {Promise<Object>} Updated notification
   */
  async markRead(userId, notificationId) {
    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) throw new NotFoundError('Notification');

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification.toJSON();
  },

  /**
   * Mark all notifications for the user as read (idempotent bulk op).
   * @param {string} userId
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async markAllRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { modifiedCount: result.modifiedCount ?? 0 };
  },
};
