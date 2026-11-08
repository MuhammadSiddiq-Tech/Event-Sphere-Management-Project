/**
 * @fileoverview Applications Controller.
 * T-4.4 (exhibitor submit/list/withdraw), T-4.5 (admin list), T-4.6 (admin review).
 */

import { applicationsService } from './applications.service.js';

export const applicationsController = {
  // ─── Exhibitor actions ─────────────────────────────────────────────────────

  /**
   * POST /api/v1/expos/:id/applications
   * Submit an application to an expo.
   */
  async submit(ctx) {
    const application = await applicationsService.submit(
      ctx.user,
      ctx.params.id,
      ctx.body ?? {}
    );
    ctx.json(201, application);
  },

  /**
   * GET /api/v1/applications/mine
   * List all applications for the authenticated exhibitor.
   */
  async listMine(ctx) {
    const { items, meta } = await applicationsService.listMine(
      ctx.user._id.toString(),
      ctx.query
    );
    ctx.json(200, items, meta);
  },

  /**
   * GET /api/v1/expos/:id/applications/mine
   * Get the authenticated exhibitor's application for a specific expo.
   */
  async getMyApplicationForExpo(ctx) {
    const application = await applicationsService.getMyApplicationForExpo(
      ctx.user._id.toString(),
      ctx.params.id
    );
    ctx.json(200, application);
  },

  /**
   * DELETE /api/v1/applications/:id
   * Withdraw a pending application.
   */
  async withdraw(ctx) {
    const application = await applicationsService.withdraw(
      ctx.user._id.toString(),
      ctx.params.id
    );
    ctx.json(200, application);
  },

  // ─── Admin actions ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/expos/:id/applications
   * Admin: list all applications for a specific expo.
   */
  async listForExpo(ctx) {
    const { items, meta } = await applicationsService.listForExpo(
      ctx.params.id,
      ctx.query
    );
    ctx.json(200, items, meta);
  },

  /**
   * GET /api/v1/applications
   * Admin: list all applications across all expos.
   */
  async listAll(ctx) {
    const { items, meta } = await applicationsService.listAll(ctx.query);
    ctx.json(200, items, meta);
  },

  /**
   * POST /api/v1/applications/:id/approve
   * Admin: approve an application (optionally assign a booth).
   */
  async approve(ctx) {
    const application = await applicationsService.approve(
      ctx.user,
      ctx.params.id,
      ctx.body ?? {}
    );
    ctx.json(200, application);
  },

  /**
   * POST /api/v1/applications/:id/reject
   * Admin: reject an application (reason required).
   */
  async reject(ctx) {
    const application = await applicationsService.reject(
      ctx.user,
      ctx.params.id,
      ctx.body ?? {}
    );
    ctx.json(200, application);
  },
};
