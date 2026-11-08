/**
 * @fileoverview Users Service.
 * Business logic for profile updates and password changes.
 * T-2.8. FR-AUTH-06.
 */

import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { UnauthenticatedError } from '../../core/errors.js';
import { env } from '../../config/env.js';

export const usersService = {
  /**
   * Update the authenticated user's public profile fields.
   * @param {string} userId
   * @param {{ name?: string, phone?: string, avatarUrl?: string }} updates
   * @returns {Promise<Object>} Updated user JSON
   */
  async updateProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User not found');
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;

    await user.save();
    return user.toJSON();
  },

  /**
   * Change the authenticated user's password.
   * Verifies the current password before updating.
   * Revokes all existing refresh token sessions on success.
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User not found');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new UnauthenticatedError('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    // Revoke all sessions — user must log in again with new password
    user.refreshTokens = [];
    await user.save();
  },
};
