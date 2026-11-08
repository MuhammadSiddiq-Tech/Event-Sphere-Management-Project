/**
 * @fileoverview JWT & Refresh Token Utilities.
 * Architecture §8.1. Rule 3.4.2.
 */

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Sign a short-lived access token (15m).
 * Payload: { sub: userId, role: userRole }
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.role
 * @returns {string}
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id.toString(),
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL,
    }
  );
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {{ sub: string, role: string, iat: number, exp: number }}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Generate a random opaque refresh token string.
 * @returns {string}
 */
export function generateRefreshTokenString() {
  return randomBytes(40).toString('hex');
}

/**
 * Hash a refresh token using SHA-256 for secure DB storage.
 * @param {string} token
 * @returns {string}
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate refresh token expiry date (7 days from now).
 * @returns {Date}
 */
export function getRefreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
