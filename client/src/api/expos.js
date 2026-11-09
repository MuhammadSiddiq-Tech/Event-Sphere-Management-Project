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

export const fetchAdminExpos = fetchPublicExpos;

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

/**
 * Admin creates a new expo (Draft).
 * POST /api/v1/expos
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createExpo(data) {
  const res = await apiClient.post('/expos', data);
  return res.data.data;
}

/**
 * Admin updates an expo's metadata.
 * PATCH /api/v1/expos/:id
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateExpo(id, data) {
  const res = await apiClient.patch(`/expos/${id}`, data);
  return res.data.data;
}

/**
 * Admin publishes an expo (Draft -> Published).
 * POST /api/v1/expos/:id/publish
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function publishExpo(id) {
  const res = await apiClient.post(`/expos/${id}/publish`);
  return res.data.data;
}

/**
 * Admin unpublishes an expo (Published -> Draft).
 * POST /api/v1/expos/:id/unpublish
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function unpublishExpo(id) {
  const res = await apiClient.post(`/expos/${id}/unpublish`);
  return res.data.data;
}

/**
 * Admin deletes an expo (with cascade or block validation).
 * DELETE /api/v1/expos/:id
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteExpo(id) {
  await apiClient.delete(`/expos/${id}`);
}

/**
 * Admin atomically replaces all booths for a DRAFT expo floor plan.
 * PUT /api/v1/expos/:id/booths
 * @param {string} expoId
 * @param {Array<Object>} booths
 * @returns {Promise<{ created: number, booths: Object[] }>}
 */
export async function saveFloorPlanBooths(expoId, booths) {
  // Sanitize payload to match backend bulkBoothItemSchema
  const payload = booths.map((b) => ({
    code: b.code.toUpperCase().trim(),
    label: b.label || undefined,
    description: b.description || undefined,
    size: b.size || 'medium',
    pricePerDay: Number(b.pricePerDay) || 0,
    geometry: {
      x: Number(b.geometry.x),
      y: Number(b.geometry.y),
      w: Number(b.geometry.w),
      h: Number(b.geometry.h),
    },
  }));
  const res = await apiClient.put(`/expos/${expoId}/booths`, { booths: payload });
  return res.data.data;
}

/**
 * Upload an expo banner or image.
 * POST /api/v1/upload
 * @param {File} file
 * @returns {Promise<{ url: string, filename: string }>}
 */
export async function uploadBanner(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/**
 * Exhibitor atomically reserves an available booth for an expo.
 * POST /api/v1/booths/:id/reserve
 * @param {string} boothId
 * @returns {Promise<Object>} Reserved booth
 */
export async function reserveBooth(boothId) {
  const res = await apiClient.post(`/booths/${boothId}/reserve`);
  return res.data.data;
}
