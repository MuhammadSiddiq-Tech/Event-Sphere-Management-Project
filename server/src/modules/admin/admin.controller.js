/**
 * @fileoverview Admin Users Management Controller.
 * T-8.7. FR-ADM-01.
 */

import { adminService } from './admin.service.js';

export const adminController = {
  /** GET /api/v1/admin/users */
  async listUsers(ctx) {
    const result = await adminService.listUsers(ctx.query);
    ctx.json(200, result.items, result.meta);
  },

  /** GET /api/v1/admin/users/:id */
  async getUser(ctx) {
    const user = await adminService.getUserById(ctx.params.id);
    ctx.json(200, user);
  },

  /** PATCH /api/v1/admin/users/:id/deactivate */
  async deactivateUser(ctx) {
    const user = await adminService.deactivateUser(ctx.params.id, ctx.user._id.toString());
    ctx.json(200, user);
  },

  /** PATCH /api/v1/admin/users/:id/reactivate */
  async reactivateUser(ctx) {
    const user = await adminService.reactivateUser(ctx.params.id);
    ctx.json(200, user);
  },
};
