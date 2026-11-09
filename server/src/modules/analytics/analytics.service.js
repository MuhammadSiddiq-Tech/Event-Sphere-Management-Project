/**
 * @fileoverview Analytics Service.
 * T-8.1 (track), T-8.3 (aggregation), T-8.5 (real-time KPI emission), T-8.6 (CSV export).
 * FR-ANA-01, FR-ANA-02.
 */

import mongoose from 'mongoose';
import { AnalyticsEvent } from '../../models/analyticsEvent.model.js';
import { User } from '../../models/user.model.js';
import { ANALYTICS_EVENT_TYPE } from '../../config/constants.js';
import { emitToAdmin } from '../../sockets/emitter.js';
import { logger } from '../../config/logger.js';

// ─── Throttle map for real-time KPI ticks (T-8.5) ───────────────────────────
const kpiEmitTimestamps = new Map();
const KPI_THROTTLE_MS = 5000; // max one KPI push per expo per 5 seconds

/**
 * Build the deduplication key for a 10-minute window.
 * @param {string} userId
 * @param {string} type
 * @param {string|null} targetId
 * @returns {string}
 */
function buildDedupKey(userId, type, targetId) {
  const windowMinutes = Math.floor(Date.now() / (10 * 60 * 1000));
  return `${userId}:${type}:${targetId || 'none'}:${windowMinutes}`;
}

/**
 * Throttled helper to push live KPI snapshot to admin room.
 * @param {string} expoId
 */
async function maybeEmitKpiTick(expoId) {
  if (!expoId) return;
  const expoKey = expoId.toString();
  const now = Date.now();
  const last = kpiEmitTimestamps.get(expoKey) || 0;
  if (now - last < KPI_THROTTLE_MS) return;
  kpiEmitTimestamps.set(expoKey, now);

  try {
    const kpi = await analyticsService.getSummaryKpis(expoId);
    emitToAdmin(expoId, 'analytics:kpi', kpi);
  } catch (err) {
    logger.warn({ err: err.message, expoId }, 'Failed to emit KPI tick');
  }
}

export const analyticsService = {
  /**
   * Track an analytics event with deduplication.
   * Silently drops duplicate events (upsert-or-ignore pattern).
   * T-8.1.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.type   - ANALYTICS_EVENT_TYPE value
   * @param {string} [params.expoId]
   * @param {string} [params.target]
   * @param {string} [params.targetModel]
   * @param {Object} [params.meta]
   * @returns {Promise<void>}
   */
  async track({ userId, type, expoId = null, target = null, targetModel = null, meta = {} }) {
    try {
      const dedupKey = buildDedupKey(userId, type, target);

      await AnalyticsEvent.create({
        type,
        user: userId,
        expo: expoId,
        target,
        targetModel,
        meta,
        dedupKey,
      });

      // Throttled real-time KPI push to admin room
      if (expoId) {
        maybeEmitKpiTick(expoId).catch(() => {});
      }
    } catch (err) {
      // E11000 = duplicate key → dedup hit, silently swallow
      if (err.code === 11000) return;
      logger.warn({ err: err.message, type, userId }, 'Analytics track failed');
    }
  },

  /**
   * Summary KPI snapshot for an expo.
   * T-8.3, T-8.5.
   *
   * @param {string} expoId
   * @returns {Promise<Object>} KPI object
   */
  async getSummaryKpis(expoId) {
    const filter = { expo: expoId };
    const [
      totalEvents,
      boothViews,
      profileViews,
      sessionViews,
      sessionCheckins,
      searches,
      uniqueVisitors,
    ] = await Promise.all([
      AnalyticsEvent.countDocuments(filter),
      AnalyticsEvent.countDocuments({ ...filter, type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW }),
      AnalyticsEvent.countDocuments({ ...filter, type: ANALYTICS_EVENT_TYPE.PROFILE_VIEW }),
      AnalyticsEvent.countDocuments({ ...filter, type: ANALYTICS_EVENT_TYPE.SESSION_VIEW }),
      AnalyticsEvent.countDocuments({ ...filter, type: ANALYTICS_EVENT_TYPE.SESSION_CHECKIN }),
      AnalyticsEvent.countDocuments({ ...filter, type: ANALYTICS_EVENT_TYPE.SEARCH }),
      AnalyticsEvent.distinct('user', filter).then((arr) => arr.length),
    ]);

    return {
      expoId,
      totalEvents,
      boothViews,
      profileViews,
      sessionViews,
      sessionCheckins,
      searches,
      uniqueVisitors,
    };
  },

  /**
   * Engagement over time — events grouped by day.
   * T-8.3.
   *
   * @param {string} expoId
   * @param {Object} opts - { days?, startDate?, endDate? }
   * @returns {Promise<Array<{ date: string, count: number, type: string }>>}
   */
  async getEngagementOverTime(expoId, { days = 30, startDate, endDate } = {}) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - days * 24 * 3600 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          expo: typeof expoId === 'string' ? new mongoose.Types.ObjectId(expoId) : expoId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          type: '$_id.type',
          count: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    return result;
  },

  /**
   * Booth traffic ranking — top booths by view count.
   * T-8.3.
   *
   * @param {string} expoId
   * @param {number} [limit=10]
   * @returns {Promise<Array<{ boothId: string, views: number }>>}
   */
  async getBoothTrafficRanking(expoId, limit = 10) {
    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          expo: typeof expoId === 'string' ? new mongoose.Types.ObjectId(expoId) : expoId,
          type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW,
          target: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$target',
          views: { $sum: 1 },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'booths',
          localField: '_id',
          foreignField: '_id',
          as: 'booth',
        },
      },
      {
        $project: {
          _id: 0,
          boothId: { $toString: '$_id' },
          label: { $ifNull: [{ $arrayElemAt: ['$booth.label', 0] }, 'Unknown Booth'] },
          views: 1,
        },
      },
    ]);

    return result;
  },

  /**
   * Session popularity ranking — top sessions by view + check-in count.
   * T-8.3.
   *
   * @param {string} expoId
   * @param {number} [limit=10]
   * @returns {Promise<Array>}
   */
  async getSessionPopularity(expoId, limit = 10) {
    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          expo: typeof expoId === 'string' ? new mongoose.Types.ObjectId(expoId) : expoId,
          type: { $in: [ANALYTICS_EVENT_TYPE.SESSION_VIEW, ANALYTICS_EVENT_TYPE.SESSION_CHECKIN] },
          target: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$target',
          views: {
            $sum: { $cond: [{ $eq: ['$type', ANALYTICS_EVENT_TYPE.SESSION_VIEW] }, 1, 0] },
          },
          checkins: {
            $sum: { $cond: [{ $eq: ['$type', ANALYTICS_EVENT_TYPE.SESSION_CHECKIN] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'sessions',
          localField: '_id',
          foreignField: '_id',
          as: 'session',
        },
      },
      {
        $project: {
          _id: 0,
          sessionId: { $toString: '$_id' },
          title: { $ifNull: [{ $arrayElemAt: ['$session.title', 0] }, 'Unknown Session'] },
          views: 1,
          checkins: 1,
          total: 1,
        },
      },
    ]);

    return result;
  },

  /**
   * List all analytics events (admin, paginated, filterable).
   * T-8.3.
   *
   * @param {Object} query - { expoId?, type?, page?, limit? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listEvents(query = {}) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(parseInt(query.limit ?? '20', 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.expoId) filter.expo = query.expoId;
    if (query.type) filter.type = query.type;

    const [docs, total] = await Promise.all([
      AnalyticsEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email role')
        .populate('expo', 'title'),
      AnalyticsEvent.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => d.toJSON()),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};
