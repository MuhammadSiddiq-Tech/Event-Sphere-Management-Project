/**
 * @fileoverview Production Error Leakage Test Suite (T-9.4).
 * NFR-SEC-04.
 * Verifies that unexpected errors in production mode do NOT leak:
 *  - Stack traces
 *  - Internal file system paths
 *  - Database connection strings or internal errors
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { errorHandler, ApiError, ValidationError } from '../../src/core/errors.js';
import { ERROR_CODES } from '../../src/config/constants.js';

describe('Error Information Leakage Prevention (T-9.4, NFR-SEC-04)', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  function createMockCtx() {
    let responseStatus = null;
    let responseBody = null;

    return {
      requestId: 'test-req-id-1234',
      log: {
        error: () => {},
      },
      json: (status, data, meta, errorEnvelope) => {
        responseStatus = status;
        responseBody = errorEnvelope;
      },
      getResponse: () => ({ status: responseStatus, body: responseBody }),
    };
  }

  it('suppresses stack traces and sensitive error details in production', () => {
    process.env.NODE_ENV = 'production';

    const ctx = createMockCtx();
    const sensitiveError = new Error(
      'Mongoose connection failed at mongodb://root:supersecret123@10.0.0.5:27017/eventsphere'
    );
    sensitiveError.stack = 'Error: at /var/www/eventsphere/server/src/config/db.js:45:12';

    errorHandler(sensitiveError, ctx);

    const { status, body } = ctx.getResponse();

    expect(status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.error.message).toBe('An unexpected error occurred');

    // Crucial: Must NEVER contain stack trace in production
    expect(body.error.stack).toBeUndefined();

    // Must NOT contain sensitive connection string or file paths
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('mongodb://');
    expect(serialized).not.toContain('supersecret123');
    expect(serialized).not.toContain('/var/www/');
  });

  it('includes stack trace only in non-production environments', () => {
    process.env.NODE_ENV = 'development';

    const ctx = createMockCtx();
    const devError = new Error('Local dev test error');

    errorHandler(devError, ctx);

    const { status, body } = ctx.getResponse();

    expect(status).toBe(500);
    expect(body.error.stack).toBeDefined();
    expect(typeof body.error.stack).toBe('string');
  });

  it('formats ApiErrors safely without stack traces in all environments', () => {
    process.env.NODE_ENV = 'production';

    const ctx = createMockCtx();
    const valError = new ValidationError([
      { path: 'email', message: 'Invalid email address format' },
    ]);

    errorHandler(valError, ctx);

    const { status, body } = ctx.getResponse();

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.details).toHaveLength(1);
    expect(body.error.stack).toBeUndefined();
  });
});
