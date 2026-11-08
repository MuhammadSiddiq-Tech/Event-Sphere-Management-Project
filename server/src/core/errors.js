/**
 * @fileoverview ApiError hierarchy + central errorHandler.
 * Rules 3.1.4, 3.1.5, 3.6.3. Architecture §5.3.
 */

import { ERROR_CODES } from '../config/constants.js';
import { errorResponse } from '../utils/response.js';

/**
 * Base application error. All intentional HTTP errors extend this.
 * The pipeline's single try/catch converts these to the JSON envelope.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - Machine-readable error code (ERROR_CODES)
   * @param {string} message - Human-readable message
   * @param {Array<{path:string,message:string}>} [details] - Validation details
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

export class ValidationError extends ApiError {
  /** @param {Array<{path:string,message:string}>} details */
  constructor(details) {
    super(400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details);
    this.name = 'ValidationError';
  }
}

export class UnauthenticatedError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Authentication required') {
    super(401, ERROR_CODES.UNAUTHENTICATED, message);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Access denied') {
    super(403, ERROR_CODES.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  /** @param {string} [resource] */
  constructor(resource = 'Resource') {
    super(404, ERROR_CODES.NOT_FOUND, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Conflict') {
    super(409, ERROR_CODES.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  /** @param {string} [message] */
  constructor(message = 'Too many requests') {
    super(429, ERROR_CODES.RATE_LIMITED, message);
    this.name = 'RateLimitError';
  }
}

export class UnsupportedMediaError extends ApiError {
  constructor() {
    super(415, ERROR_CODES.UNSUPPORTED_MEDIA, 'Unsupported media type');
    this.name = 'UnsupportedMediaError';
  }
}

/**
 * Central error handler called by the pipeline's catch block.
 * Never leaks stack traces in production. Rule 3.1.5.
 * @param {Error} err
 * @param {import('./context.js').Ctx} ctx
 */
export function errorHandler(err, ctx) {
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof ApiError) {
    // Expected errors — do NOT log as error (rule 3.6.3)
    const body = errorResponse(err.code, err.message, err.details);
    ctx.json(err.status, null, null, body);
    return;
  }

  // Unexpected errors — log them
  if (ctx.log) {
    ctx.log.error({ err, reqId: ctx.requestId }, 'Unhandled error');
  }

  ctx.json(500, null, null, {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
