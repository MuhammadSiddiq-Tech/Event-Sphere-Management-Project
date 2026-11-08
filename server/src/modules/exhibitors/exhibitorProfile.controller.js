/**
 * @fileoverview ExhibitorProfile Controller.
 * T-4.1 (profile CRUD), T-4.2 (public search).
 * FR-EXP-02, FR-ATT-03/04.
 */

import { exhibitorProfileService } from './exhibitorProfile.service.js';

export const exhibitorProfileController = {
  /**
   * GET /api/v1/exhibitors/me
   * Returns the authenticated exhibitor's full profile (or 404 if none).
   */
  async getMyProfile(ctx) {
    const profile = await exhibitorProfileService.getMyProfile(
      ctx.user._id.toString()
    );
    ctx.json(200, profile);
  },

  /**
   * PUT /api/v1/exhibitors/me
   * Upserts (create or replace) the authenticated exhibitor's profile.
   */
  async upsertMyProfile(ctx) {
    const profile = await exhibitorProfileService.upsertMyProfile(
      ctx.user._id.toString(),
      ctx.body
    );
    ctx.json(200, profile);
  },

  /**
   * GET /api/v1/exhibitors
   * Public paginated list with optional q/category/expo filters.
   */
  async listPublic(ctx) {
    const { items, meta } = await exhibitorProfileService.listPublic(ctx.query);
    ctx.json(200, items, meta);
  },

  /**
   * GET /api/v1/exhibitors/:userId
   * Public single exhibitor profile by user ID.
   */
  async getPublicProfile(ctx) {
    const profile = await exhibitorProfileService.getPublicProfile(
      ctx.params.userId
    );
    ctx.json(200, profile);
  },
};
