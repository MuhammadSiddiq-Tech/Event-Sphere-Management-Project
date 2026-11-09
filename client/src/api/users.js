/**
 * @fileoverview Users API Client functions.
 * T-9.1. FR-SYS-05, NFR-PRIV-01..03.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Export all personal data as JSON (GDPR Data Portability).
 * GET /api/v1/users/me/export
 * @returns {Promise<Object>}
 */
export async function exportUserData() {
  const res = await apiClient.get('/users/me/export');
  return res.data.data;
}

/**
 * Update optional user consents (marketing, analytics).
 * PATCH /api/v1/users/me/consent
 * @param {{ marketing?: boolean, analytics?: boolean }} consentData
 * @returns {Promise<Object>}
 */
export async function updateUserConsent(consentData) {
  const res = await apiClient.patch('/users/me/consent', consentData);
  return res.data.data;
}

/**
 * Anonymize and delete user account.
 * DELETE /api/v1/users/me
 * @param {string} password
 * @returns {Promise<Object>}
 */
export async function deleteUserAccount(password) {
  const res = await apiClient.delete('/users/me', {
    data: { password },
  });
  return res.data.data;
}
