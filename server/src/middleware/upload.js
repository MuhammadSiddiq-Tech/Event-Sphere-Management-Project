/**
 * @fileoverview Upload middleware for route handling.
 * Parses multipart form data with image and document validation rules.
 * Rule 3.7.1, T-1.7.
 */

import { parseMultipart } from '../core/body.js';

/**
 * Creates upload middleware configured for specific image/doc fields.
 * @param {Object} [opts]
 * @param {string[]} [opts.imageFields]
 * @param {string[]} [opts.docFields]
 * @returns {import('../core/pipeline.js').Middleware}
 */
export function upload(opts = {}) {
  return async function uploadMiddleware(ctx, next) {
    await parseMultipart(ctx, opts);
    await next();
  };
}
