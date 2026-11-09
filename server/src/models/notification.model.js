/**
 * @fileoverview Notification Mongoose Model.
 * T-7.5. FR-SYS-03.
 *
 * Key invariants:
 *  - Each notification belongs to one user (recipient).
 *  - type is from NOTIFICATION_TYPE enum (constants.js).
 *  - payload is a flexible Mixed sub-doc for event-specific data.
 *  - isRead defaults to false; readAt is set when marked read.
 *  - TTL index auto-deletes notifications older than 90 days.
 */

import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
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

// Compound index for fast per-user queries sorted by newest first
notificationSchema.index({ user: 1, createdAt: -1 });
// Compound index for unread count queries
notificationSchema.index({ user: 1, isRead: 1 });
// TTL: auto-delete after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const Notification = mongoose.model('Notification', notificationSchema);
