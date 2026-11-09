/**
 * @fileoverview Admin Management API client functions.
 * T-8.7. FR-ADM-01.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch paginated list of users for administration.
 * GET /api/v1/admin/users
 * @param {Object} params - { q?, role?, active?, page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchAdminUsers(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/admin/users', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Get single user by ID.
 * GET /api/v1/admin/users/:id
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchAdminUserById(id) {
  const res = await apiClient.get(`/admin/users/${id}`);
  return res.data.data;
}

/**
 * Deactivate a user account.
 * PATCH /api/v1/admin/users/:id/deactivate
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deactivateUser(id) {
  const res = await apiClient.patch(`/admin/users/${id}/deactivate`);
  return res.data.data;
}

/**
 * Reactivate a deactivated user account.
 * PATCH /api/v1/admin/users/:id/reactivate
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function reactivateUser(id) {
  const res = await apiClient.patch(`/admin/users/${id}/reactivate`);
  return res.data.data;
}
