/**
 * @fileoverview Feedback Mongoose Model.
 * T-7.11. FR-SYS-02, FR-ADM-01.
 *
 * Invariants:
 *  - Each feedback entry is submitted by an authenticated user.
 *  - Category must be one of FEEDBACK_CATEGORY (suggestion, issue, support).
 *  - Status tracks triage lifecycle: open -> in_review -> resolved.
 *  - Admin notes allow internal triage context.
 */

import mongoose from 'mongoose';
import { FEEDBACK_CATEGORY, FEEDBACK_STATUS } from '../config/constants.js';

const feedbackSchema = new mongoose.Schema(
  {
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
    category: {
      type: String,
      enum: Object.values(FEEDBACK_CATEGORY),
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(FEEDBACK_STATUS),
      default: FEEDBACK_STATUS.OPEN,
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
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

feedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
