/**
 * @fileoverview Feedback Controller.
 * T-7.11. FR-SYS-02, FR-ADM-01.
 */

import { feedbackService } from './feedback.service.js';

export const feedbackController = {
  /**
   * Submit feedback.
   */
  async submit(ctx) {
    const feedback = await feedbackService.submit({
      userId: ctx.user._id.toString(),
      ...ctx.body,
    });
    ctx.json(201, feedback);
  },

  /**
   * List feedback (admin).
   */
  async list(ctx) {
    const result = await feedbackService.list(ctx.query);
    ctx.json(200, result.items, result.meta);
  },

  /**
   * Get feedback by ID (admin).
   */
  async getById(ctx) {
    const feedback = await feedbackService.getById(ctx.params.id);
    ctx.json(200, feedback);
  },

  /**
   * Update feedback status / notes (admin).
   */
  async updateStatus(ctx) {
    const feedback = await feedbackService.updateStatus(ctx.params.id, ctx.body);
    ctx.json(200, feedback);
  },
};
