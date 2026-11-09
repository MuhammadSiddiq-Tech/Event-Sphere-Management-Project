/**
 * @fileoverview Feedback API client functions.
 * T-7.12. FR-SYS-02, FR-ADM-01.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Submit user feedback.
 * POST /api/v1/feedback
 * @param {Object} data - { category, message, rating?, expo? }
 * @returns {Promise<Object>} Created feedback
 */
export async function submitFeedback(data) {
  const res = await apiClient.post('/feedback', data);
  return res.data.data;
}

/**
 * Fetch feedback list (Admin triage).
 * GET /api/v1/feedback
 * @param {Object} params - { page?, limit?, status?, category?, expo? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchFeedbackList(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/feedback', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch a single feedback item by ID (Admin).
 * GET /api/v1/feedback/:id
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchFeedbackById(id) {
  const res = await apiClient.get(`/feedback/${id}`);
  return res.data.data;
}

/**
 * Update feedback status & notes (Admin triage).
 * PATCH /api/v1/feedback/:id
 * @param {string} id
 * @param {Object} data - { status?, adminNotes? }
 * @returns {Promise<Object>}
 */
export async function updateFeedbackStatus(id, data) {
  const res = await apiClient.patch(`/feedback/${id}`, data);
  return res.data.data;
}
