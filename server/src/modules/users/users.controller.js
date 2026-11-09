/**
 * @fileoverview Users Controller.
 * Handles PATCH /users/me, PATCH /users/me/password,
 * GET /users/me/export, PATCH /users/me/consent, DELETE /users/me.
 * T-2.8, T-9.1. FR-AUTH-06, FR-SYS-05, NFR-PRIV-01..03.
 */

import { usersService } from './users.service.js';

const REFRESH_COOKIE_NAME = 'eventsphere_refresh';

export const usersController = {
  /**
   * Update own profile (name, phone, avatarUrl).
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async updateMe(ctx) {
    const updated = await usersService.updateProfile(ctx.user._id.toString(), ctx.body);
    ctx.json(200, updated);
  },

  /**
   * Change own password (requires current password verification).
   * Revokes all sessions — client must re-authenticate.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async changePassword(ctx) {
    const { currentPassword, newPassword } = ctx.body;
    await usersService.changePassword(ctx.user._id.toString(), currentPassword, newPassword);
    ctx.json(200, { message: 'Password changed successfully. Please log in again.' });
  },

  /**
   * Export all user data as JSON (GDPR Data Portability).
   * GET /api/v1/users/me/export
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async exportMe(ctx) {
    const data = await usersService.exportData(ctx.user._id.toString());
    ctx.json(200, data);
  },

  /**
   * Update user consents (marketing, analytics).
   * PATCH /api/v1/users/me/consent
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async updateConsent(ctx) {
    const updated = await usersService.updateConsent(ctx.user._id.toString(), ctx.body);
    ctx.json(200, updated);
  },

  /**
   * Anonymize and deactivate account (GDPR Right to Erasure).
   * DELETE /api/v1/users/me
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async deleteMe(ctx) {
    const { password } = ctx.body;
    await usersService.anonymizeAccount(ctx.user._id.toString(), password);
    ctx.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    ctx.json(200, { message: 'Account successfully anonymized and deactivated.' });
  },
};
