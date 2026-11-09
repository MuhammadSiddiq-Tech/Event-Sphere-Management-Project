/**
 * @fileoverview Attendee Service — business logic layer.
 * T-6.1 — ExpoRegistration (ticket code, idempotent, list mine). FR-ATT-02.
 * T-6.2 — SessionEngagement registration (expo registration check, capacity, time overlap). BR-7.
 * T-6.3 — Bookmark / Unbookmark & My Agenda (GET /sessions/me). FR-ATT-06/08.
 * T-6.4 — Session reminder background runner (15-min lead window). FR-ATT-07.
 */

import { randomBytes } from 'node:crypto';
import { ExpoRegistration } from '../../models/expoRegistration.model.js';
import { SessionEngagement } from '../../models/sessionEngagement.model.js';
import { Expo } from '../../models/expo.model.js';
import { Session } from '../../models/session.model.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../core/errors.js';
import { EXPO_STATUS, SESSION_STATUS, ENGAGEMENT_KIND, NOTIFICATION_TYPE } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { notificationsService } from '../notifications/notifications.service.js';

/**
 * Generate a cryptographically distinct, human-readable ticket code.
 * Format: "TKT-XXXX-YYYY"
 */
function generateTicketCode() {
  const randPart = randomBytes(3).toString('hex').toUpperCase();
  const timePart = Date.now().toString(36).slice(-4).toUpperCase();
  return `TKT-${randPart}-${timePart}`;
}

/**
 * Stub notification logging.
 */
function stubNotify(event, payload) {
  console.log(`[NOTIFY] ${event}`, JSON.stringify(payload));
}

export const attendeeService = {
  // ─── T-6.1: Expo Registration ─────────────────────────────────────────────

  /**
   * Register authenticated user for an expo.
   * FR-ATT-02. Idempotent: returns existing registration if already registered.
   * @param {Object} user - ctx.user
   * @param {string} expoId
   * @returns {Promise<{ registration: Object, isNew: boolean }>}
   */
  async registerForExpo(user, expoId) {
    const userId = user._id.toString();

    // Verify expo exists and is active (published or ongoing)
    const expo = await Expo.findOne({ _id: expoId, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    if (
      expo.status !== EXPO_STATUS.PUBLISHED &&
      expo.status !== EXPO_STATUS.ONGOING
    ) {
      throw new ForbiddenError(
        `Registrations are only open for published or ongoing expos (current: ${expo.status}).`
      );
    }

    // Idempotent check: if already registered, return existing
    const existing = await ExpoRegistration.findOne({ user: userId, expo: expoId });
    if (existing) {
      return { registration: existing.toJSON(), isNew: false };
    }

    // Generate unique ticket code
    const ticketCode = generateTicketCode();

    let registration;
    try {
      registration = await ExpoRegistration.create({
        user: userId,
        expo: expoId,
        ticketCode,
      });
    } catch (err) {
      if (err.code === 11000) {
        // Race condition: another request just created it
        const raced = await ExpoRegistration.findOne({ user: userId, expo: expoId });
        if (raced) return { registration: raced.toJSON(), isNew: false };
      }
      throw err;
    }

    const result = registration.toJSON();
    stubNotify('expo_registered', {
      userId,
      expoId,
      ticketCode: result.ticketCode,
    });

    return { registration: result, isNew: true };
  },

  /**
   * List all expo registrations for the authenticated user.
   * Paginated.
   * @param {string} userId
   * @param {Object} query
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listMyExpoRegistrations(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = { user: userId };

    const [docs, total] = await Promise.all([
      ExpoRegistration.find(filter)
        .populate('expo', 'title slug status startDate endDate venue bannerUrl coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ExpoRegistration.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => d.toJSON()),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Check if user is registered for a specific expo.
   * @param {string} userId
   * @param {string} expoId
   * @returns {Promise<Object|null>}
   */
  async getMyExpoRegistration(userId, expoId) {
    const reg = await ExpoRegistration.findOne({ user: userId, expo: expoId })
      .populate('expo', 'title slug status startDate endDate venue bannerUrl');
    return reg ? reg.toJSON() : null;
  },

  // ─── T-6.2: Session Registration ──────────────────────────────────────────

  /**
   * Register authenticated user for a session.
   * BR-7: Requires prior expo registration. Enforces capacity. Checks time conflicts.
   * Idempotent: returns existing engagement if already registered.
   * @param {Object} user - ctx.user
   * @param {string} sessionId
   * @returns {Promise<{ engagement: Object, isNew: boolean }>}
   */
  async registerForSession(user, sessionId) {
    const userId = user._id.toString();

    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    if (session.status === SESSION_STATUS.CANCELLED) {
      throw new ForbiddenError('Cannot register for a cancelled session.');
    }

    const expoId = session.expo.toString();

    // 1. Invariant BR-7: User must be registered for the expo first
    const isExpoRegistered = await ExpoRegistration.exists({ user: userId, expo: expoId });
    if (!isExpoRegistered) {
      throw new ForbiddenError(
        'You must register for the expo before you can register for its sessions.'
      );
    }

    // 2. Idempotent check
    const existing = await SessionEngagement.findOne({
      user: userId,
      session: sessionId,
      kind: ENGAGEMENT_KIND.REGISTERED,
    });
    if (existing) {
      return { engagement: existing.toJSON(), isNew: false };
    }

    // 3. Capacity enforcement
    if (session.capacity) {
      const currentCount = await SessionEngagement.countDocuments({
        session: sessionId,
        kind: ENGAGEMENT_KIND.REGISTERED,
      });
      if (currentCount >= session.capacity) {
        throw new ConflictError(
          `This session has reached its maximum capacity of ${session.capacity} seats.`
        );
      }
    }

    // 4. Time conflict check: prevent double-booking overlapping sessions in the same expo
    const otherRegistrations = await SessionEngagement.find({
      user: userId,
      expo: expoId,
      kind: ENGAGEMENT_KIND.REGISTERED,
      session: { $ne: sessionId },
    }).populate('session');

    for (const reg of otherRegistrations) {
      const other = reg.session;
      if (other && other.status !== SESSION_STATUS.CANCELLED) {
        const otherStart = new Date(other.startTime);
        const otherEnd = new Date(other.endTime);
        const thisStart = new Date(session.startTime);
        const thisEnd = new Date(session.endTime);

        if (thisStart < otherEnd && thisEnd > otherStart) {
          throw new ConflictError(
            `Time conflict: You are already registered for "${other.title}" (${otherStart.toLocaleTimeString()} – ${otherEnd.toLocaleTimeString()}).`
          );
        }
      }
    }

    // 5. Create registration
    let engagement;
    try {
      engagement = await SessionEngagement.create({
        user: userId,
        session: sessionId,
        expo: expoId,
        kind: ENGAGEMENT_KIND.REGISTERED,
      });
    } catch (err) {
      if (err.code === 11000) {
        const raced = await SessionEngagement.findOne({
          user: userId,
          session: sessionId,
          kind: ENGAGEMENT_KIND.REGISTERED,
        });
        if (raced) return { engagement: raced.toJSON(), isNew: false };
      }
      throw err;
    }

    const result = engagement.toJSON();
    stubNotify('session_registered', {
      userId,
      sessionId,
      expoId,
    });

    return { engagement: result, isNew: true };
  },

  /**
   * Unregister authenticated user from a session.
   * @param {Object} user - ctx.user
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async unregisterFromSession(user, sessionId) {
    const userId = user._id.toString();
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    await SessionEngagement.deleteOne({
      user: userId,
      session: sessionId,
      kind: ENGAGEMENT_KIND.REGISTERED,
    });

    stubNotify('session_unregistered', {
      userId,
      sessionId,
    });
  },

  // ─── T-6.3: Bookmarks & My Agenda ─────────────────────────────────────────

  /**
   * Bookmark a session for user's personal wishlist.
   * Idempotent. Does NOT require expo registration or capacity check.
   * @param {Object} user - ctx.user
   * @param {string} sessionId
   * @returns {Promise<{ engagement: Object, isNew: boolean }>}
   */
  async bookmarkSession(user, sessionId) {
    const userId = user._id.toString();

    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    const expoId = session.expo.toString();

    const existing = await SessionEngagement.findOne({
      user: userId,
      session: sessionId,
      kind: ENGAGEMENT_KIND.BOOKMARK,
    });
    if (existing) {
      return { engagement: existing.toJSON(), isNew: false };
    }

    let engagement;
    try {
      engagement = await SessionEngagement.create({
        user: userId,
        session: sessionId,
        expo: expoId,
        kind: ENGAGEMENT_KIND.BOOKMARK,
      });
    } catch (err) {
      if (err.code === 11000) {
        const raced = await SessionEngagement.findOne({
          user: userId,
          session: sessionId,
          kind: ENGAGEMENT_KIND.BOOKMARK,
        });
        if (raced) return { engagement: raced.toJSON(), isNew: false };
      }
      throw err;
    }

    return { engagement: engagement.toJSON(), isNew: true };
  },

  /**
   * Remove a session bookmark.
   * @param {Object} user - ctx.user
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async unbookmarkSession(user, sessionId) {
    const userId = user._id.toString();
    await SessionEngagement.deleteOne({
      user: userId,
      session: sessionId,
      kind: ENGAGEMENT_KIND.BOOKMARK,
    });
  },

  /**
   * Get user's agenda: registered + bookmarked sessions.
   * GET /api/v1/sessions/me
   * FR-ATT-08.
   * @param {string} userId
   * @param {Object} query - { expo?, kind?, page?, limit? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async getMyAgenda(userId, query) {
    const { expo, kind } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = { user: userId };
    if (expo) filter.expo = expo;
    if (kind) filter.kind = kind;

    const [docs, total] = await Promise.all([
      SessionEngagement.find(filter)
        .populate({
          path: 'session',
          populate: { path: 'expo', select: 'title slug startDate endDate status' },
        })
        .populate('expo', 'title slug startDate endDate status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SessionEngagement.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => d.toJSON()),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  // ─── T-6.4: Reminder Background Job ───────────────────────────────────────

  /**
   * Run upcoming session reminders.
   * FR-ATT-07. Finds active sessions starting within `leadMinutes` (default 15m),
   * finds engagements without `reminderSentAt`, dispatches notifications,
   * and stamps `reminderSentAt`.
   * @param {{ leadMinutes?: number }} [options]
   * @returns {Promise<{ processedReminders: number, matchedSessions: number }>}
   */
  async runSessionReminders({ leadMinutes = 15 } = {}) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + leadMinutes * 60 * 1000);

    // Find sessions starting within the lead window that are not cancelled
    const upcomingSessions = await Session.find({
      status: { $ne: SESSION_STATUS.CANCELLED },
      startTime: { $gte: now, $lte: windowEnd },
    }).lean();

    if (upcomingSessions.length === 0) {
      return { processedReminders: 0, matchedSessions: 0 };
    }

    const sessionIds = upcomingSessions.map((s) => s._id);

    // Find all engagements for these sessions that haven't received a reminder yet
    const pendingEngagements = await SessionEngagement.find({
      session: { $in: sessionIds },
      reminderSentAt: null,
    }).populate('session user');

    let processedCount = 0;
    for (const eng of pendingEngagements) {
      const session = eng.session;
      const user = eng.user;

      if (!session || !user) continue;

      // Dispatch reminder notification
      stubNotify('session_reminder', {
        userId: user._id || user.id,
        userEmail: user.email,
        sessionId: session._id || session.id,
        sessionTitle: session.title,
        startTime: session.startTime,
        room: session.room,
        kind: eng.kind,
      });

      const targetUserId = (user._id || user.id).toString();
      await notificationsService.notify(targetUserId, NOTIFICATION_TYPE.SESSION_REMINDER, {
        sessionId: (session._id || session.id).toString(),
        sessionTitle: session.title,
        startTime: session.startTime,
        room: session.room,
        kind: eng.kind,
      });

      eng.reminderSentAt = new Date();
      await eng.save();
      processedCount++;
    }

    return {
      processedReminders: processedCount,
      matchedSessions: upcomingSessions.length,
    };
  },
};
