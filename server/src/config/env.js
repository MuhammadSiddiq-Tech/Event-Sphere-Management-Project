/**
 * @fileoverview Environment configuration — the ONLY place process.env is read.
 * Validated with Zod at boot; throws on invalid config so the server fails fast.
 * Rules: 3.1.6, invariant #12.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // MongoDB
  MONGO_URI: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // Email
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('noreply@eventsphere.test'),

  // Uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  CLOUDINARY_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

/** @type {z.infer<typeof envSchema>} */
let _env;

/**
 * Validates and returns the environment config.
 * Cached after first call. Throws on invalid config.
 * @returns {z.infer<typeof envSchema>}
 */
export function getEnv() {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment configuration:\n${issues}`);
  }

  _env = result.data;
  return _env;
}

export const env = new Proxy(
  {},
  {
    get(_target, key) {
      return getEnv()[key];
    },
  }
);
