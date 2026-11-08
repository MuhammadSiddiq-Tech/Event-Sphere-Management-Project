/**
 * @fileoverview ExhibitorProfile Service — business logic layer.
 * T-4.1 (profile CRUD), T-4.2 (public search/filter).
 * FR-EXP-02, FR-ATT-03/04.
 */

import mongoose from 'mongoose';
import { ExhibitorProfile } from '../../models/exhibitorProfile.model.js';
import { Booth } from '../../models/booth.model.js';
import { NotFoundError } from '../../core/errors.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

/**
 * Public DTO — strips sensitive/internal fields.
 * Removes staff personal emails/phones, internal document metadata beyond url.
 * @param {Object} profile - Mongoose document toJSON result
 * @returns {Object}
 */
function toPublicDto(profile) {
  const p = typeof profile.toJSON === 'function' ? profile.toJSON() : profile;
  return {
    id: p.id ?? p._id,
    user: p.user,
    companyName: p.companyName,
    description: p.description,
    website: p.website,
    logo: p.logo,
    category: p.category,
    products: p.products ?? [],
    socialLinks: p.socialLinks ?? {},
    // Staff — omit personal contact details (privacy)
    staff: (p.staff ?? []).map(({ name, title, bio }) => ({ name, title, bio })),
    // Contacts — only expose role (no email/phone in public view)
    contacts: (p.contacts ?? []).map(({ name, role }) => ({ name, role })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const exhibitorProfileService = {
  /**
   * Get own exhibitor profile (authenticated exhibitor).
   * Returns the full document (all fields including documents).
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getMyProfile(userId) {
    const profile = await ExhibitorProfile.findOne({ user: userId });
    if (!profile) {
      throw new NotFoundError('ExhibitorProfile');
    }
    return profile.toJSON();
  },

  /**
   * Upsert exhibitor profile for the authenticated user.
   * Creates if not exists, updates if exists.
   * @param {string} userId
   * @param {Object} data - Validated body from upsertProfileSchema
   * @returns {Promise<Object>}
   */
  async upsertMyProfile(userId, data) {
    const profile = await ExhibitorProfile.findOneAndUpdate(
      { user: userId },
      { $set: { ...data, user: userId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return profile.toJSON();
  },

  /**
   * Public search/filter list of exhibitor profiles.
   * T-4.2. Supports: q (text search), category, expo (filter by expo's booth exhibitors).
   * @param {Object} query - Validated query params from listExhibitorsSchema
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async listPublic(query) {
    const { q, category, expo } = query;
    const { page, limit, skip } = parsePagination(query);

    const filter = {};

    // Text search on companyName / description
    if (q) {
      filter.$text = { $search: q };
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Filter by exhibitors who have an allocated/reserved booth at a specific expo
    if (expo && mongoose.Types.ObjectId.isValid(expo)) {
      const booths = await Booth.find(
        { expo: new mongoose.Types.ObjectId(expo), assignedTo: { $ne: null } },
        { assignedTo: 1 }
      ).lean();
      const userIds = booths.map((b) => b.assignedTo);
      filter.user = { $in: userIds };
    }

    const [docs, total] = await Promise.all([
      ExhibitorProfile.find(filter)
        .sort(q ? { score: { $meta: 'textScore' } } : { companyName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExhibitorProfile.countDocuments(filter),
    ]);

    return {
      items: docs.map(toPublicDto),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Public single exhibitor profile by user ID.
   * T-4.2. Returns public DTO.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getPublicProfile(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundError('ExhibitorProfile');
    }
    const profile = await ExhibitorProfile.findOne({ user: userId }).lean();
    if (!profile) {
      throw new NotFoundError('ExhibitorProfile');
    }
    return toPublicDto(profile);
  },
};
