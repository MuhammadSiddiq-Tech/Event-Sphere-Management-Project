/**
 * @fileoverview Expo Mongoose Model.
 * Represents a trade-show / expo event managed by an admin.
 * T-3.1. FR-EXPO-01/02, Architecture §6.3.
 *
 * Status lifecycle:  draft → published → ongoing → completed | cancelled
 * Slug: auto-generated from title + nanoid suffix, immutable after publish.
 */

import mongoose from 'mongoose';
import { EXPO_STATUS } from '../config/constants.js';

/** @type {string[]} */
const EXPO_STATUS_VALUES = Object.values(EXPO_STATUS);

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 255 },
    city: { type: String, trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80 },
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: false }
);

const expoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: EXPO_STATUS_VALUES,
      default: EXPO_STATUS.DRAFT,
      required: true,
      index: true,
    },
    venue: {
      type: venueSchema,
      default: () => ({}),
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    maxBooths: {
      type: Number,
      min: 1,
      default: 100,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
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
        delete ret.isDeleted;
        delete ret.deletedAt;
        return ret;
      },
    },
  }
);

// ─── Compound indexes ─────────────────────────────────────────────────────────
// Status + date for cron job and listing queries
expoSchema.index({ status: 1, startDate: 1 });
// Date range queries
expoSchema.index({ startDate: 1, endDate: 1 });
// Soft-delete filter
expoSchema.index({ isDeleted: 1, status: 1 });

// ─── Full-text search index ───────────────────────────────────────────────────
expoSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });

// ─── Date validation ──────────────────────────────────────────────────────────
expoSchema.pre('save', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    return next(new Error('endDate must be after startDate'));
  }
  next();
});

export const Expo = mongoose.model('Expo', expoSchema);
