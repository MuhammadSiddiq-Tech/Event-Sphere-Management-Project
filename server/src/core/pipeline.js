/**
 * @fileoverview Async middleware pipeline — Koa-style onion.
 * compose(middlewares) returns a single handler(ctx) function.
 * One try/catch boundary routes errors to the central errorHandler. Architecture §5.3.
 *
 * Handler signature: async (ctx, next) => void
 * Calling next() resumes the next middleware; not calling it short-circuits.
 */

import { errorHandler } from './errors.js';

/**
 * @typedef {(ctx: import('./context.js').Ctx, next: () => Promise<void>) => Promise<void>} Middleware
 */

/**
 * Compose an array of middleware functions into a single handler.
 * @param {Middleware[]} middlewares
 * @returns {(ctx: import('./context.js').Ctx) => Promise<void>}
 */
export function compose(middlewares) {
  return async function handle(ctx) {
    let idx = -1;

    async function dispatch(i) {
      if (i <= idx) throw new Error('next() called multiple times');
      idx = i;
      const fn = middlewares[i];
      if (!fn) return;
      await fn(ctx, () => dispatch(i + 1));
    }

    try {
      await dispatch(0);
    } catch (err) {
      errorHandler(err, ctx);
    }
  };
}
