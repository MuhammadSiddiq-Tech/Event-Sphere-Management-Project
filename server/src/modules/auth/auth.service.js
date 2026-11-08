/**
 * @fileoverview Authentication Service.
 * Business rules for user registration, credentials verification, and token lifecycle.
 * Rules §3.1.3, §3.4.
 */

import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'node:crypto';
import { User } from '../../models/user.model.js';
import { PasswordResetToken } from '../../models/password-reset-token.model.js';
import { ConflictError, UnauthenticatedError } from '../../core/errors.js';
import { env } from '../../config/env.js';
import { sendPasswordResetEmail } from '../../services/mailer.service.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  getRefreshTokenExpiry,
} from '../../utils/tokens.js';

export const authService = {
  /**
   * Register a new user (attendee or exhibitor only).
   * @param {Object} data
   * @returns {Promise<{ user: Object, accessToken: string, rawRefreshToken: string }>}
   */
  async register({ name, email, password, role, phone, privacyAccepted, marketingConsent, ip, userAgent }) {
    // Duplicate email check
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password with bcrypt (cost >= 12)
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = randomUUID();

    const user = new User({
      name,
      email,
      passwordHash,
      role,
      phone,
      consent: {
        privacyAccepted,
        acceptedAt: new Date(),
        marketing: Boolean(marketingConsent),
      },
      refreshTokens: [
        {
          tokenHash,
          expiresAt: getRefreshTokenExpiry(),
          userAgent,
          ip,
          isRevoked: false,
          familyId,
        },
      ],
      lastLoginAt: new Date(),
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    return {
      user: user.toJSON(),
      accessToken,
      rawRefreshToken,
    };
  },

  /**
   * Login with email and password.
   * Generates access token and new refresh token family member.
   * @param {Object} credentials
   * @returns {Promise<{ user: Object, accessToken: string, rawRefreshToken: string }>}
   */
  async login({ email, password, ip, userAgent }) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = randomUUID();

    user.refreshTokens.push({
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent,
      ip,
      isRevoked: false,
      familyId,
    });
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    return {
      user: user.toJSON(),
      accessToken,
      rawRefreshToken,
    };
  },

  /**
   * Rotate a refresh token.
   * If a revoked token is reused, revokes the entire token family (Reuse Detection).
   * @param {string} rawRefreshToken
   * @param {Object} meta
   * @returns {Promise<{ accessToken: string, newRawRefreshToken: string, user: Object }>}
   */
  async rotateRefreshToken(rawRefreshToken, { ip, userAgent }) {
    if (!rawRefreshToken) {
      throw new UnauthenticatedError('Refresh token required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });

    if (!user) {
      throw new UnauthenticatedError('Invalid refresh token');
    }

    const tokenDoc = user.refreshTokens.find((t) => t.tokenHash === tokenHash);

    // Reuse detection check (Architecture §8.1)
    if (tokenDoc.isRevoked) {
      // Invalidate the entire family!
      user.refreshTokens = user.refreshTokens.filter((t) => t.familyId !== tokenDoc.familyId);
      await user.save();
      throw new UnauthenticatedError('Revoked token reuse detected. All sessions terminated.');
    }

    // Check expiry
    if (new Date() > tokenDoc.expiresAt) {
      tokenDoc.isRevoked = true;
      await user.save();
      throw new UnauthenticatedError('Refresh token expired');
    }

    // Rotate: revoke old token and create new child token in same family
    tokenDoc.isRevoked = true;

    const newRawRefreshToken = generateRefreshTokenString();
    user.refreshTokens.push({
      tokenHash: hashToken(newRawRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
      userAgent,
      ip,
      isRevoked: false,
      familyId: tokenDoc.familyId,
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    return {
      accessToken,
      newRawRefreshToken,
      user: user.toJSON(),
    };
  },

  /**
   * Revoke refresh token on logout.
   * @param {string} rawRefreshToken
   */
  async logout(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
    if (!user) return;

    const tokenDoc = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (tokenDoc) {
      tokenDoc.isRevoked = true;
      await user.save();
    }
  },

  /**
   * Issue a password reset token and dispatch reset email.
   * Always returns without error — never reveals whether email exists (no enumeration).
   * @param {string} email
   * @param {string} clientUrl - Base URL for the reset link
   */
  async forgotPassword(email, clientUrl) {
    const user = await User.findOne({ email });

    // No enumeration: silently return if user not found or deactivated
    if (!user || !user.isActive) return;

    // Revoke any existing tokens for this user (one active token at a time)
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate opaque 32-byte random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;
    // Non-blocking — mailer failures never fail the user action
    await sendPasswordResetEmail(user.email, resetUrl);
  },

  /**
   * Validate reset token, update password, and revoke all sessions.
   * @param {string} rawToken
   * @param {string} newPassword
   */
  async resetPassword(rawToken, newPassword) {
    if (!rawToken) {
      throw new UnauthenticatedError('Reset token is required');
    }

    const tokenHash = hashToken(rawToken);
    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!tokenDoc) {
      throw new UnauthenticatedError('Invalid or expired password reset token');
    }

    if (tokenDoc.consumed) {
      throw new UnauthenticatedError('This reset link has already been used');
    }

    if (new Date() > tokenDoc.expiresAt) {
      await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
      throw new UnauthenticatedError('Password reset link has expired');
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('Invalid or expired password reset token');
    }

    // Update password hash
    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    // Revoke ALL refresh token sessions (security: new password invalidates all sessions)
    user.refreshTokens = [];

    await user.save();

    // Mark token as consumed (single-use — prevents replay)
    tokenDoc.consumed = true;
    await tokenDoc.save();
  },
};
