/**
 * @fileoverview Sessions API client functions.
 * T-5.2, T-5.3, T-5.4, T-5.5, T-5.6.
 *
 * Endpoints:
 *  GET    /api/v1/expos/:id/sessions   — public list sessions for expo
 *  GET    /api/v1/sessions/:id         — public get single session
 *  POST   /api/v1/expos/:id/sessions   — admin create session
 *  PATCH  /api/v1/sessions/:id         — admin update session
 *  POST   /api/v1/sessions/:id/cancel  — admin cancel session
 *  DELETE /api/v1/sessions/:id         — admin delete session
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch sessions for an expo with optional query filters.
 * GET /api/v1/expos/:id/sessions
 * @param {string} expoId
 * @param {Object} [params]
 * @param {string} [params.day] - YYYY-MM-DD
 * @param {string} [params.track]
 * @param {string} [params.type] - keynote | session | workshop
 * @param {string} [params.room]
 * @param {string} [params.status] - scheduled | updated | cancelled
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchExpoSessions(expoId, params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get(`/expos/${expoId}/sessions`, { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch a single session by its ID.
 * GET /api/v1/sessions/:id
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function fetchSessionById(sessionId) {
  const res = await apiClient.get(`/sessions/${sessionId}`);
  return res.data.data;
}

/**
 * Admin creates a session for an expo.
 * POST /api/v1/expos/:id/sessions
 * @param {string} expoId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function createSession(expoId, payload) {
  const res = await apiClient.post(`/expos/${expoId}/sessions`, payload);
  return res.data.data;
}

/**
 * Admin updates a session.
 * PATCH /api/v1/sessions/:id
 * @param {string} sessionId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateSession(sessionId, payload) {
  const res = await apiClient.patch(`/sessions/${sessionId}`, payload);
  return res.data.data;
}

/**
 * Admin cancels a session with a reason.
 * POST /api/v1/sessions/:id/cancel
 * @param {string} sessionId
 * @param {{ cancelledReason: string }} payload
 * @returns {Promise<Object>}
 */
export async function cancelSession(sessionId, payload) {
  const res = await apiClient.post(`/sessions/${sessionId}/cancel`, payload);
  return res.data.data;
}

/**
 * Admin deletes a session.
 * DELETE /api/v1/sessions/:id
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  await apiClient.delete(`/sessions/${sessionId}`);
}
