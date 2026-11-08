/**
 * @fileoverview Authentication Controller.
 * Handles request parsing, invokes authService, sets httpOnly refresh cookies,
 * and formats standard envelopes.
 * Architecture §5.2.
 */

import { authService } from './auth.service.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

export const authController = {
  /**
   * Register new account.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async register(ctx) {
    const ip = ctx.req.socket?.remoteAddress;
    const userAgent = ctx.req.headers['user-agent'];

    const result = await authService.register({
      ...ctx.body,
      ip,
      userAgent,
    });

    // Set rotating refresh token in httpOnly cookie
    ctx.setCookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    ctx.json(201, {
      user: result.user,
      accessToken: result.accessToken,
    });
  },

  /**
   * Log in with credentials.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async login(ctx) {
    const ip = ctx.req.socket?.remoteAddress;
    const userAgent = ctx.req.headers['user-agent'];

    const result = await authService.login({
      ...ctx.body,
      ip,
      userAgent,
    });

    // Set rotating refresh token in httpOnly cookie
    ctx.setCookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    ctx.json(200, {
      user: result.user,
      accessToken: result.accessToken,
    });
  },

  /**
   * Rotate refresh token and issue new access token.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async refresh(ctx) {
    const rawRefreshToken = ctx.cookies[REFRESH_COOKIE_NAME];
    const ip = ctx.req.socket?.remoteAddress;
    const userAgent = ctx.req.headers['user-agent'];

    const result = await authService.rotateRefreshToken(rawRefreshToken, { ip, userAgent });

    ctx.setCookie(REFRESH_COOKIE_NAME, result.newRawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    ctx.json(200, {
      user: result.user,
      accessToken: result.accessToken,
    });
  },

  /**
   * Logout and revoke refresh token.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async logout(ctx) {
    const rawRefreshToken = ctx.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken);
    ctx.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    ctx.noContent();
  },

  /**
   * Get current authenticated user profile.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async me(ctx) {
    ctx.json(200, ctx.user.toJSON());
  },

  /**
   * Initiate forgot-password flow. Always returns 200 (no enumeration).
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async forgotPassword(ctx) {
    const { email } = ctx.body;
    const clientUrl = ctx.req.headers['origin'] || env.CLIENT_URL;
    // Fire-and-forget: service handles no-op for unknown emails
    await authService.forgotPassword(email, clientUrl);
    ctx.json(200, { message: 'If that email is registered you will receive a reset link shortly.' });
  },

  /**
   * Reset password using a valid reset token.
   * @param {import('../../core/context.js').Ctx} ctx
   */
  async resetPassword(ctx) {
    const { token, password } = ctx.body;
    await authService.resetPassword(token, password);
    ctx.json(200, { message: 'Password updated successfully. Please log in with your new password.' });
  },
};