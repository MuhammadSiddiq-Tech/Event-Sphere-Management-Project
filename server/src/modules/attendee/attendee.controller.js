/**
 * @fileoverview Attendee Controller — HTTP layer.
 * T-6.1, T-6.2, T-6.3, T-6.4.
 */

import { attendeeService } from './attendee.service.js';
import { errorHandler } from '../../core/errors.js';

export const attendeeController = {
  /**
   * POST /api/v1/expos/:id/register
   * Register authenticated user for an expo.
   */
  async registerForExpo(ctx) {
    try {
      const result = await attendeeService.registerForExpo(ctx.user, ctx.params.id);
      ctx.json(result.isNew ? 201 : 200, result.registration);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * GET /api/v1/expos/me/registrations
   * GET /api/v1/registrations/mine
   * List authenticated user's expo registrations.
   */
  async listMyExpoRegistrations(ctx) {
    try {
      const result = await attendeeService.listMyExpoRegistrations(
        ctx.user._id.toString(),
        ctx.query
      );
      ctx.json(200, result.items, result.meta);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * GET /api/v1/expos/:id/registration
   * Check user registration for a specific expo.
   */
  async getMyExpoRegistration(ctx) {
    try {
      const result = await attendeeService.getMyExpoRegistration(
        ctx.user._id.toString(),
        ctx.params.id
      );
      ctx.json(200, result ? { registered: true, ...result } : { registered: false });
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * POST /api/v1/sessions/:id/register
   * Register authenticated user for a session.
   */
  async registerForSession(ctx) {
    try {
      const result = await attendeeService.registerForSession(ctx.user, ctx.params.id);
      ctx.json(result.isNew ? 201 : 200, result.engagement);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * DELETE /api/v1/sessions/:id/register
   * Unregister authenticated user from a session.
   */
  async unregisterFromSession(ctx) {
    try {
      await attendeeService.unregisterFromSession(ctx.user, ctx.params.id);
      ctx.noContent();
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * POST /api/v1/sessions/:id/bookmark
   * Bookmark a session.
   */
  async bookmarkSession(ctx) {
    try {
      const result = await attendeeService.bookmarkSession(ctx.user, ctx.params.id);
      ctx.json(result.isNew ? 201 : 200, result.engagement);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * DELETE /api/v1/sessions/:id/bookmark
   * Unbookmark a session.
   */
  async unbookmarkSession(ctx) {
    try {
      await attendeeService.unbookmarkSession(ctx.user, ctx.params.id);
      ctx.noContent();
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * GET /api/v1/sessions/me
   * Get user's personal agenda (registered + bookmarked sessions).
   */
  async getMyAgenda(ctx) {
    try {
      const result = await attendeeService.getMyAgenda(
        ctx.user._id.toString(),
        ctx.query
      );
      ctx.json(200, result.items, result.meta);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },

  /**
   * POST /api/v1/admin/reminders/run
   * Admin trigger / cron test for session reminder job (T-6.4).
   */
  async triggerReminders(ctx) {
    try {
      const result = await attendeeService.runSessionReminders();
      ctx.json(200, result);
    } catch (err) {
      errorHandler(err, ctx);
    }
  },
};
