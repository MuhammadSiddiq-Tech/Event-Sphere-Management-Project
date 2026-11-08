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
      'body.password',
      'body.passwordHash',
      'body.token',
      'body.refreshToken',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});
