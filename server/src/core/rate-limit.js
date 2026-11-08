/**
 * @fileoverview Sliding-window rate limiter.
 * Keyed by IP (or IP+email for auth endpoints).
 * In-memory store with a pluggable interface (can be swapped for Mongo/Redis).
 * Architecture §5.3. Rule 5.2. NFR-SEC-02.
 */

import { RateLimitError } from './errors.js';

/**
 * @typedef {{ count: number, resetAt: number }} WindowEntry
 */

/** Default in-memory store */
const defaultStore = new Map();

/**
 * Create a rate-limit middleware.
 * @param {object} opts
 * @param {number} opts.maxRequests - allowed requests per window
 * @param {number} opts.windowMs - window size in milliseconds
 * @param {(ctx: import('./context.js').Ctx) => string} [opts.keyFn] - derive the rate-limit key
 * @param {Map<string, WindowEntry>} [opts.store] - pluggable store (defaults to in-memory)
 * @returns {import('./pipeline.js').Middleware}
 */
export function createRateLimit({ maxRequests, windowMs, keyFn, store = defaultStore }) {
  const defaultKey = (ctx) => ctx.req.socket?.remoteAddress ?? 'unknown';
  const getKey = keyFn ?? defaultKey;

  return async function rateLimitMiddleware(ctx, next) {
    const key = getKey(ctx);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count += 1;
    }

    ctx.res.setHeader('X-RateLimit-Limit', String(maxRequests));
    ctx.res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    ctx.res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      ctx.res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      throw new RateLimitError();
    }

    await next();
  };
}

/** Global rate limiter — 300 requests/minute per IP */
export const globalRateLimit = createRateLimit({
  maxRequests: 300,
  windowMs: 60 * 1000,
});

/** Auth rate limiter — 10 requests/15 min per IP. Rule 2.7, NFR-SEC-02. (Relaxed in test mode) */
export const authRateLimit = createRateLimit({
  maxRequests: process.env.NODE_ENV === 'test' ? 1000 : 10,
  windowMs: 15 * 60 * 1000,
});

/** Upload rate limiter — 20 requests/hour per IP */
export const uploadRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
});

/**
 * Purge expired entries from a store (call periodically to prevent memory leaks).
 * @param {Map<string, WindowEntry>} [store]
 */
export function purgeExpiredEntries(store = defaultStore) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}
