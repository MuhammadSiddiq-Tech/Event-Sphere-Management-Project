/**
 * @fileoverview AnalyticsEvent Mongoose Model.
 * T-8.1. FR-ANA-01, FR-ANA-02.
 *
 * Key invariants:
 *  - Each event records one discrete interaction by a user.
 *  - type is from ANALYTICS_EVENT_TYPE enum (constants.js).
 *  - Deduplication uses a compound TTL-indexed dedupKey.
 *  - TTL index auto-deletes events older than 365 days.
 */

import mongoose from 'mongoose';
import { ANALYTICS_EVENT_TYPE } from '../config/constants.js';

const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(ANALYTICS_EVENT_TYPE),
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      default: null,
      index: true,
    },
    // Target entity (booth, session, exhibitor, etc.)
    target: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      enum: ['Booth', 'Session', 'ExhibitorProfile', null],
      default: null,
    },
    // Extra free-form metadata (e.g., search query, source page)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Deduplication key: prevents duplicate counts in the same 10-min window
    dedupKey: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index for deduplication — partial index only when dedupKey is a string
analyticsEventSchema.index(
  { dedupKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupKey: { $type: 'string' } },
  }
);

// Performance indexes for aggregation queries
analyticsEventSchema.index({ expo: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ user: 1, createdAt: -1 });
analyticsEventSchema.index({ target: 1, type: 1, createdAt: -1 });

// TTL index — auto-delete after 365 days
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
