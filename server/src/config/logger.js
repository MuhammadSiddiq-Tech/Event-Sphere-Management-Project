/**
 * @fileoverview Application logger using pino.
 * JSON structured logs with request-ID correlation. Rule 3.6.1.
 * Sensitive fields are redacted. Rule 3.6.2.
 */

import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
      'body.confirmPassword',
      'body.passwordHash',
      'body.token',
      'body.accessToken',
      'body.refreshToken',
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino/file',
        },
      }
    : {}),
});
