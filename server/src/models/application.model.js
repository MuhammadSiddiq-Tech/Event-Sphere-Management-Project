/**
 * @fileoverview Application Mongoose Model.
 * Represents an exhibitor's application to participate in an Expo.
 * Architecture §6.2, FR-EXP-01, BR-3.
 */

import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../config/constants.js';

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
    companySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    productsServices: {
      type: [String],
      default: [],
    },
    documents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    preferredBooths: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booth',
      },
    ],
    assignedBooth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booth',
      default: null,
    },
    reviewNote: {
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

// Unique pair: an exhibitor can only apply once per expo
applicationSchema.index({ expo: 1, exhibitor: 1 }, { unique: true });
applicationSchema.index({ expo: 1, status: 1 });

export const Application = mongoose.model('Application', applicationSchema);
