/**
 * @fileoverview User Mongoose Model.
 * Architecture §6.2, FR-AUTH-01..05, Rules §3.3.1, §3.3.2.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ip: { type: String },
    isRevoked: { type: Boolean, default: false },
    familyId: { type: String, required: true },
  },
  { _id: false, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Invariant #2: never returned in API queries
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ATTENDEE,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    consent: {
      privacyAccepted: { type: Boolean, required: true },
      acceptedAt: { type: Date, required: true, default: Date.now },
      marketing: { type: Boolean, default: false },
      analytics: { type: Boolean, default: true },
      updatedAt: { type: Date },
      withdrawnAt: { type: Date },
    },
    refreshTokens: [refreshTokenSchema],
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokens;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ role: 1 });

/**
 * Compare plain password with stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
