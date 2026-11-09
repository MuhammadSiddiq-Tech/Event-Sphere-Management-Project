/**
 * @fileoverview Notifications API client functions.
 * T-7.7. FR-SYS-03.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch the authenticated user's notifications (paginated).
 * GET /api/v1/notifications
 * @param {Object} params - { page?, limit?, unread? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchNotifications(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/notifications', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch the unread notification count for the authenticated user.
 * GET /api/v1/notifications/unread-count
 * @returns {Promise<{ count: number }>}
 */
export async function fetchUnreadNotificationCount() {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data.data ?? { count: 0 };
}

/**
 * Mark a single notification as read.
 * PATCH /api/v1/notifications/:id/read
 * @param {string} notificationId
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationRead(notificationId) {
  const res = await apiClient.patch(`/notifications/${notificationId}/read`);
  return res.data.data;
}

/**
 * Mark all notifications as read.
 * PATCH /api/v1/notifications/read-all
 * @returns {Promise<{ modifiedCount: number }>}
 */
export async function markAllNotificationsRead() {
  const res = await apiClient.patch('/notifications/read-all');
  return res.data.data;
}
