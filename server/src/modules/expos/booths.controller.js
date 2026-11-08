/**
 * @fileoverview Booths Controller.
 * Handles CRUD and bulk replace for booths within an expo.
 * T-3.4, T-3.5. FR-EXPO-03.
 */

import { boothService } from './booths.service.js';

export const boothsController = {
  /**
   * GET /api/v1/expos/:id/booths — List booths in an expo
   */
  async list(ctx) {
    const isAdmin = ctx.user?.role === 'admin';
    const { items, meta } = await boothService.list(ctx.params.id, ctx.query, isAdmin);
    ctx.json(200, items, meta);
  },

  /**
   * GET /api/v1/expos/:id/booths/:boothId — Get a single booth
   */
  async getById(ctx) {
    const isAdmin = ctx.user?.role === 'admin';
    const booth = await boothService.getById(ctx.params.id, ctx.params.boothId, isAdmin);
    ctx.json(200, booth);
  },

  /**
   * POST /api/v1/expos/:id/booths — Add a booth to a DRAFT expo
   */
  async create(ctx) {
    const booth = await boothService.create(ctx.params.id, ctx.body);
    ctx.json(201, booth);
  },

  /**
   * PATCH /api/v1/expos/:id/booths/:boothId — Update a booth's metadata
   */
  async update(ctx) {
    const booth = await boothService.update(ctx.params.id, ctx.params.boothId, ctx.body);
    ctx.json(200, booth);
  },

  /**
   * DELETE /api/v1/expos/:id/booths/:boothId — Delete a booth from a DRAFT expo
   */
  async delete(ctx) {
    await boothService.delete(ctx.params.id, ctx.params.boothId);
    ctx.noContent();
  },

  /**
   * PUT /api/v1/expos/:id/booths — Atomically replace the full floor plan
   */
  async bulkReplace(ctx) {
    const { booths } = ctx.body;
    const result = await boothService.bulkReplace(ctx.params.id, booths);
    ctx.json(200, result);
  },

  /**
   * POST /api/v1/booths/:id/reserve (and /api/v1/expos/:id/booths/:boothId/reserve)
   * Exhibitor reserves an available booth atomically.
   * T-3.6. FR-EXP-04.
   */
  async reserve(ctx) {
    const boothId = ctx.params.boothId || ctx.params.id;
    const booth = await boothService.reserve(ctx.user, boothId);
    ctx.json(200, booth);
  },
};
