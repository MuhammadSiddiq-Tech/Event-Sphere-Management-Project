/**
 * @fileoverview Analytics Controller.
 * T-8.1 (track), T-8.3 (aggregation), T-8.5 (KPI), T-8.6 (CSV).
 * FR-ANA-01, FR-ANA-02, FR-ANA-03.
 */

import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  /**
   * Track an analytics event.
   * POST /api/v1/analytics/events
   */
  async track(ctx) {
    await analyticsService.track({
      userId: ctx.user._id.toString(),
      ...ctx.body,
    });
    // Respond immediately — tracking is fire-and-forget from client's perspective
    ctx.json(202, { tracked: true });
  },

  /**
   * Get summary KPIs for an expo.
   * GET /api/v1/analytics/expos/:expoId/kpis
   */
  async getKpis(ctx) {
    const data = await analyticsService.getSummaryKpis(ctx.params.expoId);
    ctx.json(200, data);
  },

  /**
   * Get engagement over time for an expo.
   * GET /api/v1/analytics/expos/:expoId/engagement
   */
  async getEngagement(ctx) {
    const data = await analyticsService.getEngagementOverTime(ctx.params.expoId, ctx.query);
    ctx.json(200, data);
  },

  /**
   * Get top booths by view traffic.
   * GET /api/v1/analytics/expos/:expoId/booth-traffic
   */
  async getBoothTraffic(ctx) {
    const limit = Math.min(parseInt(ctx.query.limit ?? '10', 10), 50);
    const data = await analyticsService.getBoothTrafficRanking(ctx.params.expoId, limit);
    ctx.json(200, data);
  },

  /**
   * Get session popularity ranking.
   * GET /api/v1/analytics/expos/:expoId/session-popularity
   */
  async getSessionPopularity(ctx) {
    const limit = Math.min(parseInt(ctx.query.limit ?? '10', 10), 50);
    const data = await analyticsService.getSessionPopularity(ctx.params.expoId, limit);
    ctx.json(200, data);
  },

  /**
   * Export analytics events as CSV.
   * GET /api/v1/analytics/expos/:expoId/export.csv
   * T-8.6.
   */
  async exportCsv(ctx) {
    const { expoId } = ctx.params;
    const { type } = ctx.query;

    // Fetch up to 10,000 events for CSV export
    const result = await analyticsService.listEvents({
      expoId,
      type: type || undefined,
      page: 1,
      limit: 10000,
    });

    const headers = ['id', 'type', 'user_id', 'user_email', 'expo_id', 'target_id', 'created_at'];
    const rows = result.items.map((e) => [
      e.id,
      e.type,
      e.user?.id || e.user || '',
      e.user?.email || '',
      e.expo?.id || e.expo || '',
      e.target || '',
      e.createdAt,
    ]);

    const csvLines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))];
    const csv = csvLines.join('\n');

    ctx.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-${expoId}-${Date.now()}.csv"`,
      'Cache-Control': 'no-store',
    });
    ctx.res.end(csv);
  },
};
