/**
 * @fileoverview ExpoRegistration Mongoose model.
 * T-6.1 — Attendee Features Phase.
 *
 * Represents an attendee's official registration/ticket for an Expo.
 * Required before an attendee can register for sessions (BR-7).
 *
 * Invariants:
 *  - Unique compound index on { user, expo } ensures duplicate registration prevention.
 *  - Unique ticketCode per registration.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const expoRegistrationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    expo: {
      type: Schema.Types.ObjectId,
      ref: 'Expo',
      required: true,
      index: true,
    },

    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    checkedInAt: {
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
// Unique per user + expo (duplicate prevention / idempotent registration)
expoRegistrationSchema.index({ user: 1, expo: 1 }, { unique: true });

// ─── toJSON transform ─────────────────────────────────────────────────────────
expoRegistrationSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const ExpoRegistration = mongoose.model('ExpoRegistration', expoRegistrationSchema);
