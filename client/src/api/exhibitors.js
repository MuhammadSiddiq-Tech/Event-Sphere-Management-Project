/**
 * @fileoverview Exhibitors API client functions.
 * Wraps exhibitor profile management, booth details, and public directory endpoints.
 * T-4.1, T-4.2, T-4.7, T-4.10.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Fetch the authenticated exhibitor's own profile.
 * GET /api/v1/exhibitors/me
 * @returns {Promise<Object>}
 */
export async function fetchMyExhibitorProfile() {
  const res = await apiClient.get('/exhibitors/me');
  return res.data.data;
}

/**
 * Create or update the authenticated exhibitor's profile.
 * PUT /api/v1/exhibitors/me
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateMyExhibitorProfile(data) {
  const res = await apiClient.put('/exhibitors/me', data);
  return res.data.data;
}

/**
 * Fetch public exhibitor directory.
 * GET /api/v1/exhibitors
 * @param {Object} params
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function fetchPublicExhibitors(params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const res = await apiClient.get('/exhibitors', { params: cleanedParams });
  return { items: res.data.data ?? [], meta: res.data.meta ?? {} };
}

/**
 * Fetch public exhibitor profile by user ID.
 * GET /api/v1/exhibitors/:userId
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function fetchPublicExhibitorById(userId) {
  const res = await apiClient.get(`/exhibitors/${userId}`);
  return res.data.data;
}

/**
 * Upload a document or logo file.
 * POST /api/v1/upload
 * @param {File} file
 * @returns {Promise<{ url: string, filename: string, mimetype: string, size: number }>}
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/**
 * Exhibitor updates booth presentation details (showcase, products, staff).
 * PATCH /api/v1/booths/:id/details
 * @param {string} boothId
 * @param {Object} detailsData - { showcase?, products?, staff? }
 * @returns {Promise<Object>} Updated booth
 */
export async function updateBoothDetails(boothId, detailsData) {
  const res = await apiClient.patch(`/booths/${boothId}/details`, detailsData);
  return res.data.data;
}

/**
 * Release a reserved or held booth.
 * POST /api/v1/booths/:id/release
 * @param {string} boothId
 * @returns {Promise<Object>} Released booth
 */
export async function releaseHeldBooth(boothId) {
  const res = await apiClient.post(`/booths/${boothId}/release`);
  return res.data.data;
}
