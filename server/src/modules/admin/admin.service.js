/**
 * @fileoverview Admin Users Management Service.
 * T-8.7. FR-ADM-01.
 * Admin can list users (paginated, searchable) and deactivate/reactivate accounts.
 */

import { User } from '../../models/user.model.js';
import { NotFoundError } from '../../core/errors.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

export const adminService = {
  /**
   * List all users with optional search and role filter.
   * @param {Object} query - { q?, role?, active?, page?, limit? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listUsers(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.q) {
      const regex = new RegExp(query.q, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.active !== undefined && query.active !== '') {
      filter.isActive = query.active === 'true' || query.active === true;
    }

    const [docs, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -refreshTokens -consent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      items: docs.map((u) => u.toJSON()),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Get a single user by ID (admin view).
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select('-passwordHash -refreshTokens');
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`);
    }
    return user.toJSON();
  },

  /**
   * Deactivate a user account.
   * @param {string} userId
   * @param {string} adminId - must not be the same user
   * @returns {Promise<Object>} Updated user
   */
  async deactivateUser(userId, adminId) {
    if (userId === adminId.toString()) {
      throw new Error('Admins cannot deactivate their own account');
    }
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);

    user.isActive = false;
    // Revoke all refresh tokens on deactivation
    user.refreshTokens = [];
    await user.save();

    return user.toJSON();
  },

  /**
   * Reactivate a deactivated user account.
   * @param {string} userId
   * @returns {Promise<Object>} Updated user
   */
  async reactivateUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);

    user.isActive = true;
    await user.save();
    return user.toJSON();
  },
};
