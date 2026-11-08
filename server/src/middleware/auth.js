/**
 * @fileoverview Authentication & RBAC Route Middleware.
 * Enforces JWT access token verification and role-based permissions.
 * Architecture §8.3. Rules §3.4.3, §3.4.4.
 */

import { UnauthenticatedError, ForbiddenError } from '../core/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/user.model.js';

/**
 * Require valid JWT Bearer access token in Authorization header.
 * Attaches authenticated user document to ctx.user.
 * @type {import('../core/pipeline.js').Middleware}
 */
export async function requireAuth(ctx, next) {
  const authHeader = ctx.req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthenticatedError('Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7).trim();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new UnauthenticatedError('Invalid or expired access token');
  }

  // Load user to verify account is still active
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthenticatedError('User account not found or deactivated');
  }

  ctx.user = user;
  await next();
}

/**
 * Require one or more authorized roles.
 * Must be placed AFTER requireAuth.
 * @param {...string} allowedRoles
 * @returns {import('../core/pipeline.js').Middleware}
 */
export function requireRole(...allowedRoles) {
  return async function roleMiddleware(ctx, next) {
    if (!ctx.user) {
      throw new UnauthenticatedError('Authentication required before role check');
    }

    if (!allowedRoles.includes(ctx.user.role)) {
      throw new ForbiddenError(`Access denied. Requires one of: ${allowedRoles.join(', ')}`);
    }

    await next();
  };
}

/**
 * Ownership assertion helper.
 * Throws ForbiddenError if user does not own the target resource and is not an admin.
 * @param {Object} user - ctx.user
 * @param {string|Object} resourceOwnerId - ID of the resource owner
 * @param {string} [message] - Custom forbidden message
 */
export function assertOwnership(user, resourceOwnerId, message = 'You do not have permission to modify this resource') {
  if (user.role === 'admin') return true; // Admins bypass resource ownership
  const ownerStr = resourceOwnerId.toString ? resourceOwnerId.toString() : String(resourceOwnerId);
  const userStr = user._id ? user._id.toString() : String(user.id);
  if (ownerStr !== userStr) {
    throw new ForbiddenError(message);
  }
  return true;
}
