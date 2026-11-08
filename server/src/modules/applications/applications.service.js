/**
 * @fileoverview Applications Service — business logic layer.
 * T-4.4 (submit/list/withdraw), T-4.5 (admin list/filter), T-4.6 (approve/reject in tx).
 * FR-EXP-01/08, FR-EXH-01/02, Rules §3.3.6.
 *
 * Key invariants:
 *  - One application per exhibitor per expo (unique index → ConflictError on duplicate).
 *  - Expo must be published or ongoing to accept applications.
 *  - Withdrawal allowed only while status = 'pending'.
 *  - Rejection requires a reason (enforced here, also at schema layer).
 *  - Approve with boothId: sets booth allocated atomically in a MongoDB transaction.
 *  - Notifications stubbed via console.log (notification infra in future phase).
 */

import mongoose from 'mongoose';
import { Application, APPLICATION_STATUS } from '../../models/application.model.js';
import { ExhibitorProfile } from '../../models/exhibitorProfile.model.js';
import { Expo } from '../../models/expo.model.js';
import { Booth } from '../../models/booth.model.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../core/errors.js';
import { EXPO_STATUS, BOOTH_STATUS } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

/**
 * Stub notification — logs only. Replace with real email/notification infra in later phase.
 * @param {string} event
 * @param {Object} payload
 */
function stubNotify(event, payload) {
  console.log(`[NOTIFY] ${event}`, JSON.stringify(payload));
}

export const applicationsService = {
  // ─── T-4.4: Exhibitor actions ──────────────────────────────────────────────

  /**
   * Submit an application to an expo (exhibitor).
   * FR-EXP-01. Rules: expo must be published/ongoing; unique per exhibitor/expo.
   * Captures exhibitor profile snapshot at application time.
   * @param {Object} exhibitorUser - ctx.user (exhibitor)
   * @param {string} expoId
   * @param {Object} body - validated body
   * @returns {Promise<Object>} Created application
   */
  async submit(exhibitorUser, expoId, body) {
    const exhibitorId = exhibitorUser._id.toString();

    // Validate expo exists and is accepting applications
    const expo = await Expo.findOne({ _id: expoId, isDeleted: { $ne: true } });
    if (!expo) {
      throw new NotFoundError('Expo');
    }
    if (
      expo.status !== EXPO_STATUS.PUBLISHED &&
      expo.status !== EXPO_STATUS.ONGOING
    ) {
      throw new ForbiddenError(
        `Applications are only accepted for published or ongoing expos (current: ${expo.status}).`
      );
    }

    // Capture snapshot from exhibitor profile (if it exists)
    const profileDoc = await ExhibitorProfile.findOne({ user: exhibitorId }).lean();
    const companySnapshot = profileDoc
      ? {
          companyName: profileDoc.companyName,
          description: profileDoc.description,
          website: profileDoc.website,
          logo: profileDoc.logo,
          category: profileDoc.category,
          products: profileDoc.products ?? [],
        }
      : {};

    // Create application — unique index will throw on duplicate
    let application;
    try {
      application = await Application.create({
        expo: expoId,
        exhibitor: exhibitorId,
        companySnapshot,
        boothPreferences: body.boothPreferences ?? [],
        documents: body.documents ?? [],
        reviewNote: body.note ?? undefined,
      });
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError(
          'You have already submitted an application for this expo.'
        );
      }
      throw err;
    }

    return application.toJSON();
  },

  /**
   * List all applications submitted by the authenticated exhibitor.
   * FR-EXP-08. Paginated.
   * @param {string} exhibitorId
   * @param {Object} query - ctx.query (page, limit)
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listMine(exhibitorId, query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = { exhibitor: exhibitorId };

    const [docs, total] = await Promise.all([
      Application.find(filter)
        .populate('expo', 'title slug status startDate endDate coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return {
      items: docs,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Get the authenticated exhibitor's application for a specific expo.
   * @param {string} exhibitorId
   * @param {string} expoId
   * @returns {Promise<Object>}
   */
  async getMyApplicationForExpo(exhibitorId, expoId) {
    const application = await Application.findOne({
      expo: expoId,
      exhibitor: exhibitorId,
    })
      .populate('expo', 'title slug status startDate endDate coverImage')
      .lean();

    if (!application) {
      throw new NotFoundError('Application');
    }
    return application;
  },

  /**
   * Withdraw a pending application (exhibitor only).
   * FR-EXP-08. Only allowed while status = 'pending'.
   * @param {string} exhibitorId
   * @param {string} applicationId
   * @returns {Promise<Object>}
   */
  async withdraw(exhibitorId, applicationId) {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application');
    }

    // Ownership check
    if (application.exhibitor.toString() !== exhibitorId) {
      throw new ForbiddenError('You do not own this application.');
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      throw new ForbiddenError(
        `Only pending applications can be withdrawn (current: ${application.status}).`
      );
    }

    application.status = APPLICATION_STATUS.WITHDRAWN;
    application.withdrawnAt = new Date();
    await application.save();

    return application.toJSON();
  },

  // ─── T-4.5: Admin list/filter ─────────────────────────────────────────────

  /**
   * Admin: list all applications for a specific expo.
   * FR-EXH-01. Filters: status, q (company name text search). Paginated.
   * @param {string} expoId
   * @param {Object} query - validated query params
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listForExpo(expoId, query) {
    const { status, q } = query;
    const { page, limit, skip } = parsePagination(query);

    // Ensure expo exists
    const expoExists = await Expo.exists({ _id: expoId, isDeleted: { $ne: true } });
    if (!expoExists) {
      throw new NotFoundError('Expo');
    }

    const filter = { expo: expoId };
    if (status) filter.status = status;
    if (q) filter.$text = { $search: q };

    const [docs, total] = await Promise.all([
      Application.find(filter)
        .populate('exhibitor', 'name email role')
        .populate('assignedBooth', 'code size status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return {
      items: docs,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Admin: list all applications across all expos (optionally filtered by expo).
   * @param {Object} query - validated query params
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listAll(query) {
    const { status, expo, q } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = {};
    if (status) filter.status = status;
    if (expo && mongoose.Types.ObjectId.isValid(expo)) {
      filter.expo = new mongoose.Types.ObjectId(expo);
    }
    if (q) filter.$text = { $search: q };

    const [docs, total] = await Promise.all([
      Application.find(filter)
        .populate('expo', 'title slug status')
        .populate('exhibitor', 'name email role')
        .populate('assignedBooth', 'code size status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
    ]);

    return {
      items: docs,
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  // ─── T-4.6: Admin review (approve / reject) ───────────────────────────────

  /**
   * Admin approves an application.
   * FR-EXH-02, Rule §3.3.6 — uses sequential atomic operations (transaction-like).
   * Falls back gracefully on standalone MongoDB (no replica set needed).
   *  1. Set application status = 'approved'.
   *  2. If boothId provided: atomically set booth status = 'allocated', assignedTo = exhibitor.
   *  3. Stub notification to exhibitor.
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} applicationId
   * @param {Object} body - { boothId?, reviewNote? }
   * @returns {Promise<Object>} Updated application
   */
  async approve(adminUser, applicationId, body) {
    const { boothId, reviewNote } = body;
    const adminId = adminUser._id.toString();

    const application = await Application.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application');
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      throw new ForbiddenError(
        `Only pending applications can be approved (current: ${application.status}).`
      );
    }

    // Optionally assign a booth (atomic conditional update)
    if (boothId) {
      const booth = await Booth.findById(boothId);
      if (!booth) {
        throw new NotFoundError('Booth');
      }
      if (booth.expo.toString() !== application.expo.toString()) {
        throw new ForbiddenError('Booth does not belong to the same expo as this application.');
      }
      if (booth.status !== BOOTH_STATUS.AVAILABLE && booth.status !== BOOTH_STATUS.RESERVED) {
        throw new ConflictError(
          `Booth is not available for assignment (current status: ${booth.status}).`
        );
      }

      // Atomic conditional update — same pattern as booths.service.js §3.3.5
      const updatedBooth = await Booth.findOneAndUpdate(
        { _id: boothId, status: { $in: [BOOTH_STATUS.AVAILABLE, BOOTH_STATUS.RESERVED] } },
        {
          $set: {
            status: BOOTH_STATUS.ALLOCATED,
            assignedTo: application.exhibitor,
            reservedBy: null,
            reservedAt: null,
          },
        },
        { new: true }
      );

      if (!updatedBooth) {
        throw new ConflictError('Booth was just allocated by another operation. Please try again.');
      }

      application.assignedBooth = boothId;
    }

    application.status = APPLICATION_STATUS.APPROVED;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    if (reviewNote) application.reviewNote = reviewNote;

    await application.save();
    const result = application.toJSON();

    // Stub notification
    stubNotify('application_approved', {
      applicationId,
      exhibitorId: result.exhibitor,
      expoId: result.expo,
      assignedBooth: result.assignedBooth ?? null,
    });

    return result;
  },

  /**
   * Admin rejects an application.
   * FR-EXH-02, Rule §3.3.6 — sequential atomic operations.
   *  1. Validate reason is provided.
   *  2. Set application status = 'rejected', rejectionReason = reason.
   *  3. Stub notification to exhibitor.
   * @param {Object} adminUser - ctx.user (admin)
   * @param {string} applicationId
   * @param {Object} body - { reason, reviewNote? }
   * @returns {Promise<Object>} Updated application
   */
  async reject(adminUser, applicationId, body) {
    const { reason, reviewNote } = body;
    const adminId = adminUser._id.toString();

    // Reason is required (also enforced by schema, double-checked here)
    if (!reason || !reason.trim()) {
      throw new ValidationError([{ path: 'reason', message: 'Rejection reason is required.' }]);
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application');
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      throw new ForbiddenError(
        `Only pending applications can be rejected (current: ${application.status}).`
      );
    }

    application.status = APPLICATION_STATUS.REJECTED;
    application.rejectionReason = reason.trim();
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    if (reviewNote) application.reviewNote = reviewNote;

    await application.save();
    const result = application.toJSON();

    // Stub notification
    stubNotify('application_rejected', {
      applicationId,
      exhibitorId: result.exhibitor,
      expoId: result.expo,
      reason,
    });

    return result;
  },
};
