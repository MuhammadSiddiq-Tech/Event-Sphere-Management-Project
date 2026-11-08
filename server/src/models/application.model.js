/**
 * @fileoverview Application Mongoose Model.
 * Represents an exhibitor's application to participate in an Expo.
 * T-4.3. Architecture §6.2, FR-EXP-01, FR-EXH-01, BR-3.
 *
 * Key invariants:
 *  - Unique compound index {expo, exhibitor} — one app per exhibitor per expo.
 *  - Status lifecycle: pending → approved | rejected | withdrawn.
 *  - companySnapshot captures exhibitor profile at time of application.
 *  - rejectionReason is required when status = rejected (enforced at service layer).
 */

import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../config/constants.js';

/** Preference for a specific booth size/notes at application time. */
const boothPreferenceSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      enum: ['small', 'medium', 'large'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

/** Snapshot of the exhibitor's profile at the time of application. */
const snapshotSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    description: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String, trim: true },
    category: { type: String, trim: true },
    products: [{ type: String }],
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: true,
      index: true,
    },
    exhibitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
      required: true,
      index: true,
    },

    /** Snapshot of the exhibitor's profile captured at application time. */
    companySnapshot: {
      type: snapshotSchema,
      default: () => ({}),
    },

    /** Exhibitor's booth size/notes preferences. */
    boothPreferences: {
      type: [boothPreferenceSchema],
      default: [],
    },

    /** Additional documents uploaded with the application. */
    documents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    /** Booth assigned on approval (may be set by admin or exhibitor reserve). */
    assignedBooth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booth',
      default: null,
    },

    /** Admin note shown to the exhibitor (used for both approve & reject notes). */
    reviewNote: {
      type: String,
      trim: true,
    },

    /** Required when status = rejected. Stored separately for clarity. */
    rejectionReason: {
      type: String,
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    reviewedAt: {
      type: Date,
    },

    withdrawnAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique: one application per exhibitor per expo
applicationSchema.index({ expo: 1, exhibitor: 1 }, { unique: true });
applicationSchema.index({ expo: 1, status: 1 });
// Text search on company name snapshot
applicationSchema.index({ 'companySnapshot.companyName': 'text' });

export const Application = mongoose.model('Application', applicationSchema);
export { APPLICATION_STATUS };
