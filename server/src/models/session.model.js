/**
 * @fileoverview Session Mongoose model.
 * T-5.1 — Schedule & Sessions Phase.
 *
 * Represents a single scheduled event (keynote / session / workshop)
 * within an Expo. Enforces time integrity at the DB layer via indexes.
 *
 * Key invariants (business rule BR-6):
 *  - endTime must be after startTime (validated in service layer)
 *  - Session must fall within expo dates (validated in service layer)
 *  - No same-room overlap for active (non-cancelled) sessions (validated in service layer)
 */

import mongoose from 'mongoose';
import { SESSION_TYPE, SESSION_STATUS } from '../config/constants.js';

const { Schema } = mongoose;

// ─── Speaker sub-document ─────────────────────────────────────────────────────
const speakerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    org: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String, trim: true },
  },
  { _id: false }
);

// ─── Session schema ───────────────────────────────────────────────────────────
const sessionSchema = new Schema(
  {
    expo: {
      type: Schema.Types.ObjectId,
      ref: 'Expo',
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    type: {
      type: String,
      enum: Object.values(SESSION_TYPE),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    room: {
      type: String,
      trim: true,
      maxlength: 80,
    },

    track: {
      type: String,
      trim: true,
      maxlength: 80,
    },

    capacity: {
      type: Number,
      min: 1,
    },

    speakers: {
      type: [speakerSchema],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    cancelledReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    updatedReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Composite index for time-ordered listing per expo
sessionSchema.index({ expo: 1, startTime: 1 });

// Composite index for overlap check: same expo, same room, startTime
sessionSchema.index({ expo: 1, room: 1, startTime: 1 });

// Full-text search on title and description
sessionSchema.index({ title: 'text', description: 'text' });

// ─── toJSON transform ─────────────────────────────────────────────────────────
sessionSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Session = mongoose.model('Session', sessionSchema);
