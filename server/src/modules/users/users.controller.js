/**
 * @fileoverview Users Controller.
 * Handles PATCH /users/me and PATCH /users/me/password.
 * T-2.8. FR-AUTH-06.
 */

import { usersService } from './users.service.js';

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
};
