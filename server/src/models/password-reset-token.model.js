/**
 * @fileoverview PasswordResetToken Mongoose model.
 * Stores a SHA-256 hash of a 32-byte opaque token with a 30-min expiry.
 * Single-use: consumed flag prevents replay; each request replaces existing tokens.
 * Architecture §8.4. Rule 3.4.5. T-2.6.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const passwordResetTokenSchema = new Schema(
  {
    /** Reference to the user who requested the reset */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** SHA-256 hash of the opaque random token (never store raw) */
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    /** Token expiry — 30 minutes from creation */
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-cleanup
    },

    /** Consumed flag — set true on first use to prevent replay */
    consumed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
