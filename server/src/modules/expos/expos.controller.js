/**
 * @fileoverview Expos Controller.
 * Handles CRUD, publish/unpublish, and delete for expo resources.
 * T-3.1, T-3.2, T-3.3. FR-EXPO-01/02.
 */

import { expoService } from './expos.service.js';
import { ROLES } from '../../config/constants.js';

export const exposController = {
  /**
   * POST /api/v1/expos — Admin creates expo
   */
  async create(ctx) {
    const expo = await expoService.create(ctx.user._id.toString(), ctx.body);
    ctx.json(201, expo);
  },

  /**
   * GET /api/v1/expos — List expos (public + admin)
   */
  async list(ctx) {
    const isAdmin = ctx.user?.role === ROLES.ADMIN;
    const { items, meta } = await expoService.list(ctx.query, isAdmin);
    ctx.json(200, items, meta);
  },

  /**
   * GET /api/v1/expos/:id — Get expo by ID
   */
  async getById(ctx) {
    const isAdmin = ctx.user?.role === ROLES.ADMIN;
    const expo = await expoService.getById(ctx.params.id, isAdmin);
    ctx.json(200, expo);
  },

  /**
   * GET /api/v1/expos/slug/:slug — Get expo by slug (public)
   */
  async getBySlug(ctx) {
    const expo = await expoService.getBySlug(ctx.params.slug);
    ctx.json(200, expo);
  },

  /**
   * PATCH /api/v1/expos/:id — Admin updates expo metadata
   */
  async update(ctx) {
    const expo = await expoService.update(ctx.params.id, ctx.body);
    ctx.json(200, expo);
  },

  /**
   * POST /api/v1/expos/:id/publish — Admin publishes a DRAFT expo
   */
  async publish(ctx) {
    const expo = await expoService.publish(ctx.params.id);
    ctx.json(200, expo);
  },

  /**
   * POST /api/v1/expos/:id/unpublish — Admin reverts a PUBLISHED expo to DRAFT
   */
  async unpublish(ctx) {
    const expo = await expoService.unpublish(ctx.params.id);
    ctx.json(200, expo);
  },

  /**
   * DELETE /api/v1/expos/:id — Admin deletes an expo (T-3.3 rules apply)
   */
  async delete(ctx) {
    await expoService.delete(ctx.params.id);
    ctx.noContent();
  },
};
