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
};
