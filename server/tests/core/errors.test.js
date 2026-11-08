/**
 * @fileoverview Unit tests for core/errors.js
 * Tests: ApiError subclasses, errorHandler envelope output.
 * Rule 3.1.9.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ApiError,
  ValidationError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
} from '../src/core/errors.js';

function makeCtx() {
  const written = { status: null, body: null };
  return {
    written,
    requestId: 'test-req',
    log: { error() {} },
    json(status, _d, _m, raw) {
      written.status = status;
      written.body = raw;
    },
  };
}

describe('core/errors.js — ApiError subclasses', () => {
  it('ValidationError → 400', () => {
    const e = new ValidationError([{ path: 'email', message: 'Invalid' }]);
    expect(e.status).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.details).toHaveLength(1);
  });

  it('UnauthenticatedError → 401', () => {
    const e = new UnauthenticatedError();
    expect(e.status).toBe(401);
    expect(e.code).toBe('UNAUTHENTICATED');
  });

  it('ForbiddenError → 403', () => {
    const e = new ForbiddenError();
    expect(e.status).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('NotFoundError → 404 with resource name', () => {
    const e = new NotFoundError('Expo');
    expect(e.status).toBe(404);
    expect(e.message).toContain('Expo');
  });

  it('ConflictError → 409', () => {
    const e = new ConflictError('Booth taken');
    expect(e.status).toBe(409);
    expect(e.message).toBe('Booth taken');
  });

  it('RateLimitError → 429', () => {
    const e = new RateLimitError();
    expect(e.status).toBe(429);
  });
});

describe('core/errors.js — errorHandler', () => {
  it('formats ApiError as error envelope', () => {
    const ctx = makeCtx();
    errorHandler(new ConflictError('Booth conflict'), ctx);
    expect(ctx.written.status).toBe(409);
    expect(ctx.written.body.success).toBe(false);
    expect(ctx.written.body.error.code).toBe('CONFLICT');
    expect(ctx.written.body.error.message).toBe('Booth conflict');
  });

  it('includes details for ValidationError', () => {
    const ctx = makeCtx();
    errorHandler(new ValidationError([{ path: 'email', message: 'bad' }]), ctx);
    expect(ctx.written.body.error.details).toBeDefined();
    expect(ctx.written.body.error.details[0].path).toBe('email');
  });

  it('formats unknown errors as 500', () => {
    const ctx = makeCtx();
    errorHandler(new Error('something broke'), ctx);
    expect(ctx.written.status).toBe(500);
    expect(ctx.written.body.success).toBe(false);
    expect(ctx.written.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('does not leak stack trace in production', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const ctx = makeCtx();
    errorHandler(new Error('secret stack'), ctx);
    expect(ctx.written.body.error.stack).toBeUndefined();
    process.env.NODE_ENV = original;
  });
});
