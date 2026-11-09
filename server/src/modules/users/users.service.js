/**
 * @fileoverview Users Service.
 * Business logic for profile updates, password changes, privacy consent,
 * data export (GDPR), and account anonymization.
 * T-2.8, T-9.1. FR-AUTH-06, FR-SYS-05, NFR-PRIV-01, NFR-PRIV-02, NFR-PRIV-03.
 */

import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { Application } from '../../models/application.model.js';
import { SessionEngagement } from '../../models/sessionEngagement.model.js';
import { ExpoRegistration } from '../../models/expoRegistration.model.js';
import { Notification } from '../../models/notification.model.js';
import { Feedback } from '../../models/feedback.model.js';
import { ExhibitorProfile } from '../../models/exhibitorProfile.model.js';
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

  /**
   * Update optional user consents (marketing, analytics).
   * T-9.1. NFR-PRIV-02.
   * @param {string} userId
   * @param {{ marketing?: boolean, analytics?: boolean }} consentUpdates
   * @returns {Promise<Object>} Updated user JSON
   */
  async updateConsent(userId, consentUpdates) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User not found');
    }

    if (!user.consent) {
      user.consent = { privacyAccepted: true, acceptedAt: new Date() };
    }

    if (consentUpdates.marketing !== undefined) {
      user.consent.marketing = consentUpdates.marketing;
    }
    if (consentUpdates.analytics !== undefined) {
      user.consent.analytics = consentUpdates.analytics;
    }
    user.consent.updatedAt = new Date();

    await user.save();
    return user.toJSON();
  },

  /**
   * Export all user data as a structured JSON object (GDPR data portability).
   * T-9.1. NFR-PRIV-03, FR-SYS-05.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async exportData(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User not found');
    }

    const [
      exhibitorProfile,
      applications,
      sessionEngagements,
      expoRegistrations,
      notifications,
      feedback,
    ] = await Promise.all([
      ExhibitorProfile.findOne({ user: userId }).lean(),
      Application.find({ exhibitor: userId }).lean(),
      SessionEngagement.find({ user: userId }).populate('session', 'title startTime endTime room').lean(),
      ExpoRegistration.find({ user: userId }).populate('expo', 'title startDate endDate').lean(),
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean(),
      Feedback.find({ user: userId }).lean(),
    ]);

    return {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        userId: user._id.toString(),
      },
      profile: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        consent: user.consent,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      exhibitorProfile: exhibitorProfile || null,
      applications: applications || [],
      sessionEngagements: sessionEngagements || [],
      expoRegistrations: expoRegistrations || [],
      notifications: notifications || [],
      feedback: feedback || [],
    };
  },

  /**
   * Anonymize and deactivate the user account (GDPR Right to Erasure / Anonymization).
   * T-9.1. NFR-PRIV-03, FR-SYS-05.
   * Requires password confirmation.
   * @param {string} userId
   * @param {string} password
   * @returns {Promise<void>}
   */
  async anonymizeAccount(userId, password) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new UnauthenticatedError('User not found');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new UnauthenticatedError('Incorrect password');
    }

    // 1. Anonymize user PII
    user.name = 'Anonymized User';
    user.email = `anonymized-${user._id}@deleted.local`;
    user.phone = '';
    user.avatarUrl = '';
    user.isActive = false;
    user.refreshTokens = [];
    if (user.consent) {
      user.consent.marketing = false;
      user.consent.analytics = false;
      user.consent.withdrawnAt = new Date();
    }
    await user.save();

    // 2. Anonymize exhibitor profile if one exists
    await ExhibitorProfile.updateOne(
      { user: user._id },
      {
        $set: {
          companyName: '[Deleted Exhibitor]',
          description: '',
          website: '',
          socialLinks: {},
          contacts: [],
          staff: [],
        },
      }
    );
  },
};
