/**
 * @fileoverview Unit tests for Authentication & RBAC middleware.
 * Verifies requireAuth, requireRole, and assertOwnership.
 * T-2.5. Rules §3.4.3, §3.4.4.
 */

import { describe, it, expect } from '@jest/globals';
import { requireAuth, requireRole, assertOwnership } from '../../src/middleware/auth.js';
import { UnauthenticatedError, ForbiddenError } from '../../src/core/errors.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { User } from '../../src/models/user.model.js';
import { ROLES } from '../../src/config/constants.js';

describe('T-2.5: Authentication & RBAC Middleware', () => {
  describe('requireAuth', () => {
    it('throws UnauthenticatedError if Authorization header is missing', async () => {
      const ctx = { req: { headers: {} } };
      await expect(requireAuth(ctx, async () => {})).rejects.toThrow(UnauthenticatedError);
    });

    it('throws UnauthenticatedError if token format is not Bearer', async () => {
      const ctx = { req: { headers: { authorization: 'Basic 12345' } } };
      await expect(requireAuth(ctx, async () => {})).rejects.toThrow(UnauthenticatedError);
    });

    it('throws UnauthenticatedError if token is invalid or expired', async () => {
      const ctx = { req: { headers: { authorization: 'Bearer invalid.token.signature' } } };
      await expect(requireAuth(ctx, async () => {})).rejects.toThrow(UnauthenticatedError);
    });
  });

  describe('requireRole', () => {
    it('throws UnauthenticatedError if user is missing on context', async () => {
      const middleware = requireRole(ROLES.ADMIN);
      const ctx = {};
      await expect(middleware(ctx, async () => {})).rejects.toThrow(UnauthenticatedError);
    });

    it('throws ForbiddenError if user role is not authorized', async () => {
      const middleware = requireRole(ROLES.ADMIN);
      const ctx = { user: { role: ROLES.ATTENDEE } };
      await expect(middleware(ctx, async () => {})).rejects.toThrow(ForbiddenError);
    });

    it('passes if user has one of the allowed roles', async () => {
      const middleware = requireRole(ROLES.ADMIN, ROLES.EXHIBITOR);
      const ctx = { user: { role: ROLES.EXHIBITOR } };
      let nextCalled = false;
      await middleware(ctx, async () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });
  });

  describe('assertOwnership', () => {
    it('allows access if user ID matches resource owner ID', () => {
      const user = { _id: 'user-123', role: ROLES.ATTENDEE };
      expect(assertOwnership(user, 'user-123')).toBe(true);
    });

    it('allows access if user is admin regardless of owner ID', () => {
      const user = { _id: 'admin-1', role: ROLES.ADMIN };
      expect(assertOwnership(user, 'other-user')).toBe(true);
    });

    it('throws ForbiddenError if non-admin tries to access different user resource', () => {
      const user = { _id: 'user-123', role: ROLES.EXHIBITOR };
      expect(() => assertOwnership(user, 'user-456')).toThrow(ForbiddenError);
    });
  });
});
