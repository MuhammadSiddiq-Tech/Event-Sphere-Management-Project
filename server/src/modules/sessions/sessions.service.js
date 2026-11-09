/**
 * @fileoverview Sessions Service — business logic layer.
 * T-5.2 — Session CRUD with no-overlap validation (BR-6).
 * T-5.3 — Update/Cancel flow with stub notifications.
 * T-5.4 — Public schedule listing with filters.
 *
 * Key invariants:
 *  - endTime must be after startTime.
 *  - Session must fall within expo dates.
 *  - No same-room overlap for active (non-cancelled) sessions in the same expo.
 *  - Hard DELETE is blocked only if the session has registrations (stubbed — T-6.x).
 *  - Notifications are stubbed via console.log; real infra is Phase 7.
 */

import { Session } from '../../models/session.model.js';
import { Expo } from '../../models/expo.model.js';
import { SessionEngagement } from '../../models/sessionEngagement.model.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../core/errors.js';
import { SESSION_STATUS } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { emitToExpo } from '../../sockets/emitter.js';

// ─── Stub notification ────────────────────────────────────────────────────────

/**
 * Stub notification — logs only. Replace with real email/notification infra in later phase.
 * @param {string} event
 * @param {Object} payload
 */
function stubNotify(event, payload) {
  console.log(`[NOTIFY] ${event}`, JSON.stringify(payload));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate that the session times are within the expo dates.
 * @param {Object} expo - Expo document
 * @param {Date} startTime
 * @param {Date} endTime
 */
function validateSessionWithinExpoDates(expo, startTime, endTime) {
  const expoStart = new Date(expo.startDate);
  const expoEnd = new Date(expo.endDate);

  if (startTime < expoStart || endTime > expoEnd) {
    throw new ValidationError([
      {
        path: 'startTime',
        message: `Session times must fall within the expo dates (${expoStart.toISOString()} – ${expoEnd.toISOString()}).`,
      },
    ]);
  }
}

/**
 * Check for same-room overlap. Throws ConflictError if overlap found.
 * @param {string} expoId
 * @param {string} room
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {string|null} excludeSessionId - ID to exclude from check (for updates)
 */
async function checkRoomOverlap(expoId, room, startTime, endTime, excludeSessionId = null) {
  if (!room) return; // No room set → no overlap check needed

  const filter = {
    expo: expoId,
    room,
    status: { $ne: SESSION_STATUS.CANCELLED },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeSessionId) {
    filter._id = { $ne: excludeSessionId };
  }

  const conflict = await Session.findOne(filter).lean();
  if (conflict) {
    throw new ConflictError(
      `Room "${room}" is already booked for "${conflict.title}" during the requested time slot.`
    );
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const sessionsService = {
  // ─── T-5.2: Create ───────────────────────────────────────────────────────

  /**
   * Admin creates a session for an expo.
   * FR-SCH-01, BR-6.
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} expoId
   * @param {Object} body - validated body
   * @returns {Promise<Object>} Created session
   */
  async create(adminUser, expoId, body) {
    // Validate expo exists
    const expo = await Expo.findOne({ _id: expoId, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    // endTime > startTime (also validated at schema level but double-check here)
    if (endTime <= startTime) {
      throw new ValidationError([{ path: 'endTime', message: 'endTime must be after startTime' }]);
    }

    // Session within expo dates
    validateSessionWithinExpoDates(expo, startTime, endTime);

    // Room overlap check
    await checkRoomOverlap(expoId, body.room, startTime, endTime, null);

    const session = await Session.create({
      expo: expoId,
      title: body.title,
      description: body.description,
      type: body.type,
      startTime,
      endTime,
      room: body.room,
      track: body.track,
      capacity: body.capacity,
      speakers: body.speakers ?? [],
      tags: body.tags ?? [],
      createdBy: adminUser._id,
    });

    emitToExpo(expoId, 'schedule:updated', {
      expoId: expoId.toString(),
      sessionId: session._id.toString(),
      action: 'created',
    });
    return session.toJSON();
  },

  // ─── T-5.4: List (public, with filters) ──────────────────────────────────

  /**
   * Public: list sessions for an expo with optional filters.
   * FR-SCH-02 / T-5.4.
   * @param {string} expoId
   * @param {Object} query - validated query params
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async list(expoId, query) {
    // Validate expo exists
    const expoExists = await Expo.exists({ _id: expoId, isDeleted: { $ne: true } });
    if (!expoExists) throw new NotFoundError('Expo');

    const { day, track, type, room, status } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = { expo: expoId };

    if (day) {
      // Filter by calendar date — sessions that start on this date (UTC)
      const dayStart = new Date(`${day}T00:00:00.000Z`);
      const dayEnd = new Date(`${day}T23:59:59.999Z`);
      filter.startTime = { $gte: dayStart, $lte: dayEnd };
    }
    if (track) filter.track = track;
    if (type) filter.type = type;
    if (room) filter.room = room;
    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      Session.find(filter)
        .populate('expo', 'title slug startDate endDate')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit),
      Session.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => d.toJSON()),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  // ─── T-5.2: Get by ID ────────────────────────────────────────────────────

  /**
   * Public: get a single session by its ID.
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  async getById(sessionId) {
    const session = await Session.findById(sessionId)
      .populate('expo', 'title slug startDate endDate');
    if (!session) throw new NotFoundError('Session');
    return session.toJSON();
  },

  // ─── T-5.3: Update ───────────────────────────────────────────────────────

  /**
   * Admin updates a session. Sets status = 'updated', stores updatedReason.
   * Re-validates times and overlap. Stubs a session_updated notification.
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} sessionId
   * @param {Object} body - validated body (partial update)
   * @returns {Promise<Object>} Updated session
   */
  async update(adminUser, sessionId, body) {
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    // Cancelled sessions cannot be updated
    if (session.status === SESSION_STATUS.CANCELLED) {
      throw new ForbiddenError('Cancelled sessions cannot be updated.');
    }

    // Load expo for date validation
    const expo = await Expo.findById(session.expo);
    if (!expo) throw new NotFoundError('Expo');

    // Merge new times with existing times
    const startTime = body.startTime ? new Date(body.startTime) : session.startTime;
    const endTime = body.endTime ? new Date(body.endTime) : session.endTime;

    // Validate time ordering
    if (endTime <= startTime) {
      throw new ValidationError([{ path: 'endTime', message: 'endTime must be after startTime' }]);
    }

    // Validate within expo dates
    validateSessionWithinExpoDates(expo, startTime, endTime);

    // Room overlap check (use updated room or existing room)
    const room = 'room' in body ? body.room : session.room;
    await checkRoomOverlap(session.expo.toString(), room, startTime, endTime, sessionId);

    // Apply changes
    const fields = ['title', 'description', 'type', 'room', 'track', 'capacity', 'speakers', 'tags', 'updatedReason'];
    for (const field of fields) {
      if (field in body) session[field] = body[field];
    }
    session.startTime = startTime;
    session.endTime = endTime;
    session.status = SESSION_STATUS.UPDATED;

    await session.save();
    const result = session.toJSON();

    // Stub notification
    stubNotify('session_updated', {
      sessionId,
      expoId: result.expo,
      title: result.title,
      updatedBy: adminUser._id,
    });

    emitToExpo(session.expo, 'schedule:updated', {
      expoId: session.expo.toString(),
      sessionId: sessionId.toString(),
      action: 'updated',
    });
    return result;
  },

  // ─── T-5.3: Cancel ───────────────────────────────────────────────────────

  /**
   * Admin cancels a session. Sets status = 'cancelled', stores cancelledReason.
   * Stubs a session_cancelled notification.
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} sessionId
   * @param {Object} body - { cancelledReason }
   * @returns {Promise<Object>} Updated session
   */
  async cancel(adminUser, sessionId, body) {
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    if (session.status === SESSION_STATUS.CANCELLED) {
      throw new ForbiddenError('Session is already cancelled.');
    }

    session.status = SESSION_STATUS.CANCELLED;
    session.cancelledReason = body.cancelledReason;

    await session.save();
    const result = session.toJSON();

    // Stub notification
    stubNotify('session_cancelled', {
      sessionId,
      expoId: result.expo,
      title: result.title,
      reason: body.cancelledReason,
      cancelledBy: adminUser._id,
    });

    emitToExpo(session.expo, 'schedule:updated', {
      expoId: session.expo.toString(),
      sessionId: sessionId.toString(),
      action: 'cancelled',
    });
    return result;
  },

  // ─── T-5.2 + T-5.3: Delete ───────────────────────────────────────────────

  /**
   * Admin hard-deletes a session.
   * Blocked if the session has registrations (stubbed check — T-6.x will add real check).
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} sessionId
   * @returns {Promise<void>}
   */
  async delete(adminUser, sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) throw new NotFoundError('Session');

    // BR-8: block hard-delete if attendee registrations exist
    const regCount = await SessionEngagement.countDocuments({
      session: sessionId,
      kind: 'registered',
    });
    if (regCount > 0) {
      throw new ConflictError(
        'Cannot delete session: attendees are already registered. Cancel the session instead.'
      );
    }

    // Also remove any bookmarks for this session
    await SessionEngagement.deleteMany({ session: sessionId });

    await Session.deleteOne({ _id: sessionId });

    emitToExpo(session.expo, 'schedule:updated', {
      expoId: session.expo.toString(),
      sessionId: sessionId.toString(),
      action: 'cancelled',
    });
  },
};
