/**
 * @fileoverview Zod validation middleware.
 * Validates ctx.body, ctx.query, and ctx.params against a schema.
 * Unknown body keys are stripped. Rule 3.2.5.
 */

import { z } from 'zod';
import { ValidationError } from '../core/errors.js';

/**
 * @typedef {{ body?: z.ZodTypeAny, query?: z.ZodTypeAny, params?: z.ZodTypeAny }} ValidationSchemas
 */

/**
 * Create a middleware that validates incoming data with Zod.
 * @param {ValidationSchemas} schemas
 * @returns {import('../core/pipeline.js').Middleware}
 */
export function validate(schemas) {
  return async function validateMiddleware(ctx, next) {
    const errors = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(ctx.body);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'body'));
      } else {
        ctx.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(ctx.query);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'query'));
      } else {
        ctx.query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(ctx.params);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'params'));
      } else {
        ctx.params = result.data;
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    await next();
  };
}

/**
 * Format Zod issues into the standard error details format.
 * @param {z.ZodError} error
 * @param {string} source
 * @returns {Array<{path: string, message: string}>}
 */
function formatZodErrors(error, source) {
  return error.issues.map((issue) => ({
    path: [source, ...issue.path].join('.'),
    message: issue.message,
  }));
}
