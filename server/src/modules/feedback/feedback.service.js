/**
 * @fileoverview Feedback Service.
 * T-7.11. FR-SYS-02, FR-ADM-01.
 *
 * Implements submit, admin paginated list, getById, and updateStatus.
 */

import { Feedback } from '../../models/feedback.model.js';
import { NotFoundError } from '../../core/errors.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

export const feedbackService = {
  /**
   * Submit new feedback.
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.category
   * @param {string} params.message
   * @param {number} [params.rating]
   * @param {string} [params.expo]
   * @returns {Promise<Object>}
   */
  async submit({ userId, category, message, rating, expo }) {
    const feedback = await Feedback.create({
      user: userId,
      category,
      message,
      rating: rating || null,
      expo: expo || null,
    });

    const populated = await Feedback.findById(feedback._id)
      .populate('user', 'name email role')
      .populate('expo', 'title');

    return populated.toJSON();
  },

  /**
   * List feedback entries (Admin triage).
   * Paginated, sorted newest-first, supports filtering by status, category, expo.
   * @param {Object} query - { page?, limit?, status?, category?, expo? }
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async list(query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.expo) {
      filter.expo = query.expo;
    }

    const [docs, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email role')
        .populate('expo', 'title'),
      Feedback.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => d.toJSON()),
      meta: buildPaginationMeta(total, { page, limit }),
    };
  },

  /**
   * Get feedback by ID.
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const feedback = await Feedback.findById(id)
      .populate('user', 'name email role')
      .populate('expo', 'title');

    if (!feedback) {
      throw new NotFoundError(`Feedback with ID ${id} not found`);
    }

    return feedback.toJSON();
  },

  /**
   * Update feedback status / notes (Admin triage).
   * @param {string} id
   * @param {Object} updates - { status?, adminNotes? }
   * @returns {Promise<Object>}
   */
  async updateStatus(id, updates = {}) {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw new NotFoundError(`Feedback with ID ${id} not found`);
    }

    if (updates.status !== undefined) {
      feedback.status = updates.status;
    }
    if (updates.adminNotes !== undefined) {
      feedback.adminNotes = updates.adminNotes;
    }

    await feedback.save();

    const populated = await Feedback.findById(feedback._id)
      .populate('user', 'name email role')
      .populate('expo', 'title');

    return populated.toJSON();
  },
};
