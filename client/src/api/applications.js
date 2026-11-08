/**
 * @fileoverview Applications API client functions.
 * Handles application submission, tracking, withdrawal, and admin review.
 * T-4.4, T-4.5, T-4.6, T-4.8, T-4.9, T-4.11.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Submit an application to participate in an expo.
 * POST /api/v1/expos/:id/applications
 * @param {string} expoId
 * @param {Object} data - { boothPreferences?, documents?, note? }
 * @returns {Promise<Object>} Created application
 */
export async function submitExpoApplication(expoId, data) {
  const res = await apiClient.post(`/expos/${expoId}/applications`, data);
  return res.data.data;
}

/**
 * Fetch all applications submitted by current authenticated exhibitor.
 * GET /api/v1/applications/mine
 * @param {Object} params - { page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchMyApplications(params = {}) {
  const res = await apiClient.get('/applications/mine', { params });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch exhibitor's application for a specific expo.
 * GET /api/v1/expos/:id/applications/mine
 * @param {string} expoId
 * @returns {Promise<Object>} Application
 */
export async function fetchMyApplicationForExpo(expoId) {
  const res = await apiClient.get(`/expos/${expoId}/applications/mine`);
  return res.data.data;
}

/**
 * Withdraw a pending application.
 * DELETE /api/v1/applications/:id
 * @param {string} applicationId
 * @returns {Promise<Object>} Withdrawn application
 */
export async function withdrawApplication(applicationId) {
  const res = await apiClient.delete(`/applications/${applicationId}`);
  return res.data.data;
}

/**
 * Admin: list all applications across expos.
 * GET /api/v1/applications
 * @param {Object} params - { status?, expo?, q?, page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchAdminApplications(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/applications', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Admin: list applications for a specific expo.
 * GET /api/v1/expos/:id/applications
 * @param {string} expoId
 * @param {Object} params - { status?, q?, page?, limit? }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchExpoApplications(expoId, params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get(`/expos/${expoId}/applications`, { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Admin: approve an application.
 * POST /api/v1/applications/:id/approve
 * @param {string} applicationId
 * @param {Object} data - { boothId?, reviewNote? }
 * @returns {Promise<Object>} Approved application
 */
export async function approveApplication(applicationId, data = {}) {
  const res = await apiClient.post(`/applications/${applicationId}/approve`, data);
  return res.data.data;
}

/**
 * Admin: reject an application.
 * POST /api/v1/applications/:id/reject
 * @param {string} applicationId
 * @param {Object} data - { reason: string, reviewNote?: string }
 * @returns {Promise<Object>} Rejected application
 */
export async function rejectApplication(applicationId, data) {
  const res = await apiClient.post(`/applications/${applicationId}/reject`, data);
  return res.data.data;
}
