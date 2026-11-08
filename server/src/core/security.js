/**
 * @fileoverview Security middleware.
 * - Secure response headers (CSP, nosniff, HSTS, frame-ancestors, Referrer-Policy)
 * - Strict CORS including preflight OPTIONS handling
 * - NoSQL-key sanitiser (reject keys starting with $ or containing .)
 * - Query normaliser (no unexpected arrays — replaces hpp pattern)
 * Architecture §5.3, §11. Rule 5.2. NFR-SEC-04.
 */

import { env } from '../config/env.js';

/** Allowed origins from config */
function getAllowedOrigins() {
  return new Set([env.CLIENT_URL]);
}

/**
 * Set secure HTTP response headers.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function secureHeaders(ctx, next) {
  const { res } = ctx;

  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  await next();
}

/**
 * Handle CORS — sets headers for allowed origins and responds to preflight.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function cors(ctx, next) {
  const origin = ctx.req.headers['origin'];
  const allowed = getAllowedOrigins();

  if (origin && allowed.has(origin)) {
    ctx.res.setHeader('Access-Control-Allow-Origin', origin);
    ctx.res.setHeader('Access-Control-Allow-Credentials', 'true');
    ctx.res.setHeader('Vary', 'Origin');
  }

  if (ctx.method === 'OPTIONS') {
    ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    ctx.res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Request-ID'
    );
    ctx.res.setHeader('Access-Control-Max-Age', '86400');
    ctx.res.writeHead(204);
    ctx.res.end();
    return; // Don't call next — preflight handled
  }

  await next();
}

/**
 * Remove any keys from an object that start with '$' or contain '.'.
 * Prevents NoSQL injection via query operators. Rule 3.3.4.
 * @param {unknown} obj
 * @returns {unknown}
 */
function sanitiseObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitiseObject);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) continue; // Drop dangerous keys
    clean[key] = sanitiseObject(val);
  }
  return clean;
}

/**
 * Sanitise ctx.body to strip NoSQL-injection keys.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function sanitiseBody(ctx, next) {
  if (ctx.body && typeof ctx.body === 'object') {
    ctx.body = sanitiseObject(ctx.body);
  }
  await next();
}

/**
 * Normalise query string — ensure no unexpected arrays (hpp replacement).
 * If a key appears multiple times URLSearchParams gives the last value.
 * This converts any array values in ctx.query to their last string value.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function normaliseQuery(ctx, next) {
  const clean = {};
  for (const [key, val] of Object.entries(ctx.query)) {
    // ctx.query was built with Object.fromEntries(URLSearchParams) which already
    // takes the last value; still apply sanitisation on key names
    if (!key.startsWith('$') && !key.includes('.')) {
      clean[key] = val;
    }
  }
  ctx.query = clean;
  await next();
}
