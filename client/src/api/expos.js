/**
 * @fileoverview Expos API client functions.
 * Wraps GET endpoints for the public expos list, detail, and booths.
 * T-3.10. FR-ATT-01, FR-EXP-03.
 *
 * API shapes (from server):
 *  GET /api/v1/expos  → { success, data: Expo[], meta: { page, limit, total, pages } }
 *  GET /api/v1/expos/:id → { success, data: Expo }
 *  GET /api/v1/expos/slug/:slug → { success, data: Expo }
 *  GET /api/v1/expos/:id/booths → { success, data: Booth[] }
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch the public expos list with optional filters, search, pagination.
 * GET /api/v1/expos
 * @param {Object} params
 * @param {string}  [params.q]        - Full-text search term
 * @param {string}  [params.category] - Category filter
 * @param {string}  [params.status]   - Status filter (published|ongoing|completed)
 * @param {number}  [params.page]
 * @param {number}  [params.limit]
 * @returns {Promise<{ items: Object[], meta: { page, limit, total, pages } }>}
 */
export async function fetchPublicExpos(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/expos', { params: cleanedParams });
  // Server returns { success, data: items[], meta }
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch a single published expo by ID.
 * GET /api/v1/expos/:id
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function fetchExpoById(id) {
  const res = await apiClient.get(`/expos/${id}`);
  return res.data.data;
}

/**
 * Fetch a single published expo by slug.
 * GET /api/v1/expos/slug/:slug
 * @param {string} slug
 * @returns {Promise<Object>}
 */
export async function fetchExpoBySlug(slug) {
  const res = await apiClient.get(`/expos/slug/${slug}`);
  return res.data.data;
}

/**
 * Fetch the booths for an expo (view mode).
 * GET /api/v1/expos/:id/booths
 * @param {string} expoId
 * @returns {Promise<Object[]>}
 */
export async function fetchExpoBooths(expoId) {
  const res = await apiClient.get(`/expos/${expoId}/booths`);
  return res.data.data ?? [];
}
