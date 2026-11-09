/**
 * @fileoverview Sessions Controller — HTTP layer.
 * T-5.2 (CRUD), T-5.3 (cancel), T-5.4 (public list).
 * Thin layer: validate params, delegate to service, respond.
 */

import { sessionsService } from './sessions.service.js';
import { errorHandler } from '../../core/errors.js';

export const sessionsController = {
  /**
   * POST /api/v1/expos/:id/sessions
   * Admin creates a session for an expo.
   */
  async create(ctx) {
    try {
      const expoId = ctx.params.id;
      const session = await sessionsService.create(ctx.user, expoId, ctx.body);
      ctx.json(201, session);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * GET /api/v1/expos/:id/sessions
   * Public: list sessions for an expo with optional filters.
   */
  async list(ctx) {
    try {
      const expoId = ctx.params.id;
      const result = await sessionsService.list(expoId, ctx.query);
      ctx.json(200, result.items, result.meta);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * GET /api/v1/sessions/:id
   * Public: get a single session by ID.
   */
  async getById(ctx) {
    try {
      const session = await sessionsService.getById(ctx.params.id);
      ctx.json(200, session);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * PATCH /api/v1/sessions/:id
   * Admin updates a session.
   */
  async update(ctx) {
    try {
      const session = await sessionsService.update(ctx.user, ctx.params.id, ctx.body);
      ctx.json(200, session);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * POST /api/v1/sessions/:id/cancel
   * Admin cancels a session.
   */
  async cancel(ctx) {
    try {
      const session = await sessionsService.cancel(ctx.user, ctx.params.id, ctx.body);
      ctx.json(200, session);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * DELETE /api/v1/sessions/:id
   * Admin hard-deletes a session.
   */
  async delete(ctx) {
    try {
      await sessionsService.delete(ctx.user, ctx.params.id);
      ctx.noContent();
    } catch (err) {
      errorHandler(err, ctx);
    }
  },
};
