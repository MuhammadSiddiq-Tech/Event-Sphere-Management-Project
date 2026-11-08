/**
 * @fileoverview Booth Mongoose Model.
 * Represents a physical booth (stand) within an Expo floor plan.
 * T-3.4. FR-EXPO-03/04, Architecture §6.3.
 *
 * Key invariants:
 *  - Booth code is unique within an expo: compound unique index { expo, code }
 *  - Geometry is stored as { x, y, w, h } integers (grid units). Overlap
 *    validation is enforced at the service layer, not in the DB (rule 3.3.5).
 *  - Status transitions are managed by the service layer.
 */

import mongoose from 'mongoose';
import { BOOTH_STATUS, BOOTH_SIZE } from '../config/constants.js';

const BOOTH_STATUS_VALUES = Object.values(BOOTH_STATUS);
const BOOTH_SIZE_VALUES = Object.values(BOOTH_SIZE);

/** Rectangular geometry in integer grid units. */
const geometrySchema = new mongoose.Schema(
  {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    w: { type: Number, required: true, min: 1 },
    h: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const boothSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    size: {
      type: String,
      enum: BOOTH_SIZE_VALUES,
      default: BOOTH_SIZE.MEDIUM,
    },
    pricePerDay: {
      type: Number,
      min: 0,
      default: 0,
    },
    geometry: {
      type: geometrySchema,
      required: true,
    },
    status: {
      type: String,
      enum: BOOTH_STATUS_VALUES,
      default: BOOTH_STATUS.AVAILABLE,
      required: true,
      index: true,
    },
    /** Exhibitor who reserved/holds this booth (null when available). */
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reservedAt: {
      type: Date,
      default: null,
    },
    /** Admin-assigned exhibitor (null until allocated). */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
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

// ─── Unique booth code per expo ───────────────────────────────────────────────
boothSchema.index({ expo: 1, code: 1 }, { unique: true });

// ─── Status + expo for filtering available booths ─────────────────────────────
boothSchema.index({ expo: 1, status: 1 });

// ─── Exhibitor → booth lookup ─────────────────────────────────────────────────
boothSchema.index({ expo: 1, reservedBy: 1 });

export const Booth = mongoose.model('Booth', boothSchema);
