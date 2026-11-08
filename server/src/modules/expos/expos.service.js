/**
 * @fileoverview Expo Service — business logic layer.
 * T-3.1, T-3.2, T-3.3. FR-EXPO-01/02, BR-2.
 *
 * Slug generation: kebab-case title + 6-char hex suffix for uniqueness.
 * Delete rules (T-3.3):
 *  - DRAFT expos → hard delete allowed (no booths yet)
 *  - PUBLISHED/ONGOING with reserved/allocated booths → 409 (block)
 *  - Otherwise → soft-delete (isDeleted=true)
 */

import { randomBytes } from 'node:crypto';
import { Expo } from '../../models/expo.model.js';
import { Booth } from '../../models/booth.model.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors.js';
import { EXPO_STATUS, BOOTH_STATUS } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

/** Convert a string to a URL-safe slug (lowercase, hyphens). */
function toSlugBase(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars except hyphen
    .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphen
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-|-$/g, '');     // trim leading/trailing hyphens
}

/** Generate a unique slug for the given title. */
async function generateUniqueSlug(title) {
  const base = toSlugBase(title);
  let attempt = 0;
  while (attempt < 10) {
    const suffix = randomBytes(3).toString('hex');
    const slug = `${base}-${suffix}`;
    const exists = await Expo.exists({ slug });
    if (!exists) return slug;
    attempt++;
  }
  throw new Error('Could not generate a unique slug — please try a different title');
}

export const expoService = {
  /**
   * Create a new expo in DRAFT status.
   * @param {string} adminId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(adminId, data) {
    const slug = await generateUniqueSlug(data.title);

    const expo = new Expo({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      slug,
      createdBy: adminId,
      status: EXPO_STATUS.DRAFT,
    });

    await expo.save();
    return expo.toJSON();
  },

  /**
   * List expos with optional filters, text search, and pagination.
   * Public visitors only see PUBLISHED/ONGOING/COMPLETED.
   * Admins can optionally see DRAFT/CANCELLED too.
   * @param {Object} query
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async list(query, isAdmin = false) {
    const { q, status, category, sort = '-createdAt' } = query;
    const pagination = parsePagination(query);

    const filter = { isDeleted: { $ne: true } };

    // Status filter — public only gets non-draft statuses unless admin
    if (status) {
      if (!isAdmin && (status === EXPO_STATUS.DRAFT || status === EXPO_STATUS.CANCELLED)) {
        // Non-admins requesting draft/cancelled get empty results
        filter.status = '__none__';
      } else {
        filter.status = status;
      }
    } else if (!isAdmin) {
      filter.status = { $in: [EXPO_STATUS.PUBLISHED, EXPO_STATUS.ONGOING, EXPO_STATUS.COMPLETED] };
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    // Full-text search
    if (q) {
      filter.$text = { $search: q };
    }

    // Build sort object
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [items, total] = await Promise.all([
      Expo.find(filter)
        .sort(sortObj)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Expo.countDocuments(filter),
    ]);

    return {
      items,
      meta: buildPaginationMeta(total, pagination),
    };
  },

  /**
   * Get a single expo by ID. Soft-deleted expos return 404.
   * @param {string} id
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<Object>}
   */
  async getById(id, isAdmin = false) {
    const expo = await Expo.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    // Non-admins cannot see draft/cancelled expos by ID
    if (!isAdmin && (expo.status === EXPO_STATUS.DRAFT || expo.status === EXPO_STATUS.CANCELLED)) {
      throw new NotFoundError('Expo');
    }

    return expo.toJSON();
  },

  /**
   * Get a single expo by slug (public — only published/ongoing/completed).
   * @param {string} slug
   * @returns {Promise<Object>}
   */
  async getBySlug(slug) {
    const expo = await Expo.findOne({
      slug,
      isDeleted: { $ne: true },
      status: { $in: [EXPO_STATUS.PUBLISHED, EXPO_STATUS.ONGOING, EXPO_STATUS.COMPLETED] },
    });
    if (!expo) throw new NotFoundError('Expo');
    return expo.toJSON();
  },

  /**
   * Update an expo's metadata (admin only).
   * Cannot change status via this method — use publish/unpublish instead.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async update(id, updates) {
    const expo = await Expo.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    const fields = ['title', 'description', 'bannerUrl', 'category', 'tags', 'venue', 'maxBooths'];
    for (const f of fields) {
      if (updates[f] !== undefined) expo[f] = updates[f];
    }

    if (updates.startDate !== undefined) expo.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined) expo.endDate = new Date(updates.endDate);

    await expo.save();
    return expo.toJSON();
  },

  /**
   * Publish a DRAFT expo. T-3.2 BR-2: requires title, startDate, endDate, venue.city.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async publish(id) {
    const expo = await Expo.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    if (expo.status !== EXPO_STATUS.DRAFT) {
      throw new ConflictError(`Expo is already ${expo.status} and cannot be published`);
    }

    // BR-2: published expos must have dates and venue city
    if (!expo.startDate || !expo.endDate) {
      throw new ConflictError('Cannot publish: startDate and endDate are required');
    }
    if (!expo.venue?.city) {
      throw new ConflictError('Cannot publish: venue city is required');
    }

    expo.status = EXPO_STATUS.PUBLISHED;
    expo.publishedAt = new Date();
    await expo.save();
    return expo.toJSON();
  },

  /**
   * Unpublish a PUBLISHED expo (revert to DRAFT).
   * Blocked if expo has reserved/allocated booths.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async unpublish(id) {
    const expo = await Expo.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    if (expo.status !== EXPO_STATUS.PUBLISHED) {
      throw new ConflictError(`Only published expos can be unpublished (current: ${expo.status})`);
    }

    // Block if any booths are reserved/allocated
    const occupiedCount = await Booth.countDocuments({
      expo: id,
      status: { $in: [BOOTH_STATUS.RESERVED, BOOTH_STATUS.ALLOCATED] },
    });

    if (occupiedCount > 0) {
      throw new ConflictError(
        `Cannot unpublish: ${occupiedCount} booth(s) are already reserved or allocated`
      );
    }

    expo.status = EXPO_STATUS.DRAFT;
    expo.publishedAt = undefined;
    await expo.save();
    return expo.toJSON();
  },

  /**
   * Delete an expo.
   * T-3.3 rules:
   *  - DRAFT: hard delete (and hard delete any booths)
   *  - ONGOING/COMPLETED/CANCELLED: blocked
   *  - PUBLISHED: soft delete if no reserved/allocated booths; else 409
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const expo = await Expo.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!expo) throw new NotFoundError('Expo');

    // Block deletion for ongoing/completed expos
    if (expo.status === EXPO_STATUS.ONGOING || expo.status === EXPO_STATUS.COMPLETED) {
      throw new ForbiddenError(
        `Cannot delete an ${expo.status} expo. Cancel it first.`
      );
    }

    // For published expos, check booth reservations
    if (expo.status === EXPO_STATUS.PUBLISHED) {
      const occupiedCount = await Booth.countDocuments({
        expo: id,
        status: { $in: [BOOTH_STATUS.RESERVED, BOOTH_STATUS.ALLOCATED] },
      });
      if (occupiedCount > 0) {
        throw new ConflictError(
          `Cannot delete: ${occupiedCount} booth(s) are reserved or allocated. Unallocate them first.`
        );
      }
    }

    if (expo.status === EXPO_STATUS.DRAFT || expo.status === EXPO_STATUS.CANCELLED) {
      // Hard delete — no active bookings possible
      await Booth.deleteMany({ expo: id });
      await expo.deleteOne();
    } else {
      // Soft delete
      expo.isDeleted = true;
      expo.deletedAt = new Date();
      await expo.save();
    }
  },
};
