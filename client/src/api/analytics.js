/**
 * @fileoverview Analytics API client functions.
 * T-8.1 (track), T-8.3 (aggregation), T-8.6 (CSV export).
 * FR-ANA-01, FR-ANA-02, FR-ANA-03.
 */

import { apiClient } from '../lib/axios.js';

/**
 * Track a client-side analytics event.
 * POST /api/v1/analytics/events
 * Fire-and-forget — errors are silently swallowed.
 * @param {Object} event - { type, expoId?, target?, targetModel?, meta? }
 */
export async function trackEvent(event) {
  try {
    await apiClient.post('/analytics/events', event);
  } catch {
    // Analytics tracking failures must never break UX
  }
}

/**
 * Get summary KPIs for an expo.
 * GET /api/v1/analytics/expos/:expoId/kpis
 * @param {string} expoId
 * @returns {Promise<Object>}
 */
export async function fetchKpis(expoId) {
  const res = await apiClient.get(`/analytics/expos/${expoId}/kpis`);
  return res.data.data;
}

/**
 * Get engagement over time for an expo.
 * GET /api/v1/analytics/expos/:expoId/engagement
 * @param {string} expoId
 * @param {Object} params - { days?, startDate?, endDate? }
 * @returns {Promise<Array>}
 */
export async function fetchEngagementOverTime(expoId, params = {}) {
  const res = await apiClient.get(`/analytics/expos/${expoId}/engagement`, { params });
  return res.data.data ?? [];
}

/**
 * Get top booths by view traffic.
 * GET /api/v1/analytics/expos/:expoId/booth-traffic
 * @param {string} expoId
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
export async function fetchBoothTraffic(expoId, limit = 10) {
  const res = await apiClient.get(`/analytics/expos/${expoId}/booth-traffic`, {
    params: { limit },
  });
  return res.data.data ?? [];
}

/**
 * Get session popularity ranking.
 * GET /api/v1/analytics/expos/:expoId/session-popularity
 * @param {string} expoId
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
export async function fetchSessionPopularity(expoId, limit = 10) {
  const res = await apiClient.get(`/analytics/expos/${expoId}/session-popularity`, {
    params: { limit },
  });
  return res.data.data ?? [];
}

/**
 * Build the CSV export URL for download.
 * GET /api/v1/analytics/expos/:expoId/export.csv
 * T-8.6.
 * @param {string} expoId
 * @param {string} [eventType]
 * @returns {string} Full URL for download
 */
export function buildCsvExportUrl(expoId, eventType) {
  const base = `/api/v1/analytics/expos/${expoId}/export.csv`;
  return eventType ? `${base}?type=${eventType}` : base;
}
