/**
 * @fileoverview T-2.7: Auth rate-limit verification test.
 * Verifies the createRateLimit factory enforces the 10 req/15min policy
 * by using a custom store (bypassing the test-mode 1000 relaxation on authRateLimit).
 * NFR-SEC-02. Rule 2.7.
 */

import { describe, it, expect } from '@jest/globals';
import { createRateLimit } from '../../src/core/rate-limit.js';

/**
 * Build a minimal ctx-like object with a fresh writable mock response.
 */
function buildCtx() {
  const headers = {};
  const res = {
    setHeader(k, v) { headers[k] = v; },
    getHeaders() { return headers; },
  };
  const req = { socket: { remoteAddress: '127.0.0.1' } };
  return { req, res, _headers: headers };
}

describe('T-2.7: Auth Rate-Limit Policy', () => {
  it('allows exactly maxRequests requests within the window', async () => {
    const store = new Map();
    const rl = createRateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000, store });

    for (let i = 0; i < 10; i++) {
      const ctx = buildCtx();
      let nextCalled = false;
      await rl(ctx, async () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    }
  });

  it('blocks the 11th request with RateLimitError (429)', async () => {
    const store = new Map();
    const rl = createRateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000, store });

    for (let i = 0; i < 10; i++) {
      await rl(buildCtx(), async () => {});
    }

    const ctx = buildCtx();
    await expect(rl(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('sets X-RateLimit-* response headers on each request', async () => {
    const store = new Map();
    const rl = createRateLimit({ maxRequests: 10, windowMs: 15 * 60 * 1000, store });

    const ctx = buildCtx();
    await rl(ctx, async () => {});

    expect(ctx._headers['X-RateLimit-Limit']).toBe('10');
    expect(ctx._headers['X-RateLimit-Remaining']).toBe('9');
    expect(ctx._headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('sets Retry-After header when rate limited', async () => {
    const store = new Map();
    const rl = createRateLimit({ maxRequests: 1, windowMs: 15 * 60 * 1000, store });

    // Exhaust limit
    await rl(buildCtx(), async () => {});

    const ctx = buildCtx();
    try {
      await rl(ctx, async () => {});
    } catch {
      // expected
    }
    expect(ctx._headers['Retry-After']).toBeDefined();
  });

  it('resets counter after window expires', async () => {
    const store = new Map();
    const shortWindow = 10; // 10ms window
    const rl = createRateLimit({ maxRequests: 2, windowMs: shortWindow, store });

    // Exhaust window
    await rl(buildCtx(), async () => {});
    await rl(buildCtx(), async () => {});

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 20));

    // Should succeed again
    let nextCalled = false;
    await rl(buildCtx(), async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('uses custom keyFn to key by email+IP when provided', async () => {
    const store = new Map();
    const rl = createRateLimit({
      maxRequests: 1,
      windowMs: 15 * 60 * 1000,
      store,
      keyFn: (ctx) => `${ctx.req.socket.remoteAddress}:${ctx.email}`,
    });

    // Different emails — both allowed (separate buckets)
    const ctx1 = { req: { socket: { remoteAddress: '127.0.0.1' } }, res: { setHeader() {} }, email: 'user1@test.com' };
    const ctx2 = { req: { socket: { remoteAddress: '127.0.0.1' } }, res: { setHeader() {} }, email: 'user2@test.com' };

    let called1 = false, called2 = false;
    await rl(ctx1, async () => { called1 = true; });
    await rl(ctx2, async () => { called2 = true; });
    expect(called1).toBe(true);
    expect(called2).toBe(true);

    // Same email+IP — blocked on second call
    await expect(rl(ctx1, async () => {})).rejects.toMatchObject({ status: 429 });
  });
});
