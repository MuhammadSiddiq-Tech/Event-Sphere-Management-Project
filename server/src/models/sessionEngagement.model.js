/**
 * @fileoverview SessionEngagement Mongoose model.
 * T-6.2, T-6.3 — Attendee Features Phase.
 *
 * Records user engagement with a specific session:
 *   - 'registered' (reserves a seat, requires expo registration, capacity-limited)
 *   - 'bookmark' (saves to personal agenda wishlist)
 *
 * Invariants:
 *  - Unique compound index on { user, session, kind }.
 *  - reminderSentAt tracks automated reminder delivery (T-6.4).
 */

import mongoose from 'mongoose';
import { ENGAGEMENT_KIND } from '../config/constants.js';

const { Schema } = mongoose;

const sessionEngagementSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    session: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },

    expo: {
      type: Schema.Types.ObjectId,
      ref: 'Expo',
      required: true,
      index: true,
    },

    kind: {
      type: String,
      enum: Object.values(ENGAGEMENT_KIND),
      required: true,
    },

    reminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique per user + session + kind (prevents duplicate registrations or duplicate bookmarks)
sessionEngagementSchema.index({ user: 1, session: 1, kind: 1 }, { unique: true });

// For fast capacity checks
sessionEngagementSchema.index({ session: 1, kind: 1 });

// For fast attendee agenda retrieval
sessionEngagementSchema.index({ user: 1, kind: 1 });

// For background reminder queries
sessionEngagementSchema.index({ kind: 1, reminderSentAt: 1 });

// ─── toJSON transform ─────────────────────────────────────────────────────────
sessionEngagementSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const SessionEngagement = mongoose.model(
  'SessionEngagement',
  sessionEngagementSchema
);
