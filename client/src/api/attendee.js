/**
 * @fileoverview Attendee API client functions.
 * T-6.1, T-6.2, T-6.3, T-6.5, T-6.6, T-6.9.
 *
 * Endpoints:
 *   POST   /api/v1/expos/:id/register       — Register for expo (returns ticket)
 *   GET    /api/v1/expos/me/registrations   — List user's expo registrations
 *   GET    /api/v1/expos/:id/registration   — Check user's registration status for expo
 *   POST   /api/v1/sessions/:id/register   — Register for session
 *   DELETE /api/v1/sessions/:id/register   — Unregister from session
 *   POST   /api/v1/sessions/:id/bookmark   — Bookmark session
 *   DELETE /api/v1/sessions/:id/bookmark   — Unbookmark session
 *   GET    /api/v1/sessions/me             — My agenda
 */

import { apiClient } from '../lib/axios.js';

/**
 * Register the authenticated attendee for an expo.
 * POST /api/v1/expos/:id/register
 * @param {string} expoId
 * @returns {Promise<Object>}
 */
export async function registerForExpo(expoId) {
  const res = await apiClient.post(`/expos/${expoId}/register`);
  return res.data.data;
}

/**
 * List the authenticated user's registered expos.
 * GET /api/v1/expos/me/registrations
 * @param {Object} [params]
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchMyExpoRegistrations(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/expos/me/registrations', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Check if the user is registered for a specific expo.
 * GET /api/v1/expos/:id/registration
 * @param {string} expoId
 * @returns {Promise<{ registered: boolean, ticketCode?: string, checkedInAt?: string }>}
 */
export async function fetchMyExpoRegistration(expoId) {
  const res = await apiClient.get(`/expos/${expoId}/registration`);
  return res.data.data;
}

/**
 * Register for a session (requires expo registration, checks capacity & time conflict).
 * POST /api/v1/sessions/:id/register
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function registerForSession(sessionId) {
  const res = await apiClient.post(`/sessions/${sessionId}/register`);
  return res.data.data;
}

/**
 * Unregister from a session.
 * DELETE /api/v1/sessions/:id/register
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function unregisterFromSession(sessionId) {
  await apiClient.delete(`/sessions/${sessionId}/register`);
}

/**
 * Bookmark a session for personal agenda wishlist.
 * POST /api/v1/sessions/:id/bookmark
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function bookmarkSession(sessionId) {
  const res = await apiClient.post(`/sessions/${sessionId}/bookmark`);
  return res.data.data;
}

/**
 * Remove a session bookmark.
 * DELETE /api/v1/sessions/:id/bookmark
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function unbookmarkSession(sessionId) {
  await apiClient.delete(`/sessions/${sessionId}/bookmark`);
}

/**
 * Fetch the user's personal agenda (registered and bookmarked sessions).
 * GET /api/v1/sessions/me
 * @param {Object} [params]
 * @param {string} [params.expo] - filter by expo ID
 * @param {string} [params.kind] - 'registered' | 'bookmark'
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchMyAgenda(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/sessions/me', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}
