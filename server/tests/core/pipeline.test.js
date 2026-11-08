/**
 * @fileoverview Unit tests for core/pipeline.js
 * Tests: compose, next() propagation, error routing to errorHandler.
 * Rule 3.1.9.
 */

import { describe, it, expect } from '@jest/globals';
import { compose } from '../../src/core/pipeline.js';

/** Build a minimal ctx mock */
function makeCtx() {
  const written = { status: null, body: null };
  const ctx = {
    req: {},
    res: {
      writeHead(s) { written.status = s; },
      end(b) { written.body = b; },
      setHeader() {},
      getHeader() { return null; },
      headersSent: false,
    },
    requestId: 'test',
    log: { error() {}, warn() {}, info() {}, debug() {} },
    written,
    json(status, _data, _meta, raw) {
      written.status = status;
      written.body = raw ? JSON.stringify(raw) : null;
    },
  };
  return ctx;
}

describe('core/pipeline.js — compose', () => {
  it('runs middlewares in order', async () => {
    const order = [];
    const a = async (_ctx, next) => { order.push('a:before'); await next(); order.push('a:after'); };
    const b = async (_ctx, next) => { order.push('b:before'); await next(); order.push('b:after'); };
    const handler = compose([a, b]);
    await handler(makeCtx());
    expect(order).toEqual(['a:before', 'b:before', 'b:after', 'a:after']);
  });

  it('short-circuits if next() is not called', async () => {
    const order = [];
    const a = async () => { order.push('a'); }; // doesn't call next
    const b = async () => { order.push('b'); };
    const handler = compose([a, b]);
    await handler(makeCtx());
    expect(order).toEqual(['a']);
  });

  it('catches thrown errors and routes to errorHandler', async () => {
    const ctx = makeCtx();
    const { ApiError } = await import('../../src/core/errors.js');
    const throwing = async () => { throw new ApiError(400, 'TEST_CODE', 'test error'); };
    const handler = compose([throwing]);
    await handler(ctx); // should not throw
    expect(ctx.written.status).toBe(400);
    const parsed = JSON.parse(ctx.written.body);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe('TEST_CODE');
  });

  it('handles async errors from nested next() calls', async () => {
    const ctx = makeCtx();
    const { ApiError } = await import('../../src/core/errors.js');
    const a = async (_ctx, next) => { await next(); };
    const b = async () => { throw new ApiError(409, 'CONFLICT', 'conflict'); };
    const handler = compose([a, b]);
    await handler(ctx);
    expect(ctx.written.status).toBe(409);
  });

  it('works with an empty middleware array', async () => {
    const handler = compose([]);
    await expect(handler(makeCtx())).resolves.toBeUndefined();
  });
});
