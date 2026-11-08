/**
 * @fileoverview Unit tests for core/rate-limit.js
 * Tests: sliding window, maxRequests enforcement, key isolation, purge.
 * Rule 3.1.9.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createRateLimit, purgeExpiredEntries } from '../src/core/rate-limit.js';
import { RateLimitError } from '../src/core/errors.js';

function makeCtx(ip = '127.0.0.1') {
  return {
    req: { socket: { remoteAddress: ip } },
    res: {
      setHeader() {},
    },
  };
}

describe('core/rate-limit.js — createRateLimit', () => {
  it('allows requests under the limit', async () => {
    const store = new Map();
    const limiter = createRateLimit({ maxRequests: 3, windowMs: 60000, store });
    const ctx = makeCtx();
    let threw = false;
    for (let i = 0; i < 3; i++) {
      try { await limiter(ctx, async () => {}); } catch { threw = true; }
    }
    expect(threw).toBe(false);
  });

  it('throws RateLimitError on the (maxRequests+1)th request', async () => {
    const store = new Map();
    const limiter = createRateLimit({ maxRequests: 2, windowMs: 60000, store });
    const ctx = makeCtx('10.0.0.1');
    for (let i = 0; i < 2; i++) {
      await limiter(ctx, async () => {});
    }
    await expect(limiter(ctx, async () => {})).rejects.toBeInstanceOf(RateLimitError);
  });

  it('isolates counters by key (different IPs)', async () => {
    const store = new Map();
    const limiter = createRateLimit({ maxRequests: 1, windowMs: 60000, store });
    const ctxA = makeCtx('1.1.1.1');
    const ctxB = makeCtx('2.2.2.2');
    await limiter(ctxA, async () => {});
    // ctxA is now at limit; ctxB should still be allowed
    await expect(limiter(ctxB, async () => {})).resolves.toBeUndefined();
  });

  it('resets counter after window expires', async () => {
    const store = new Map();
    const limiter = createRateLimit({ maxRequests: 1, windowMs: 1, store }); // 1 ms window
    const ctx = makeCtx('3.3.3.3');
    await limiter(ctx, async () => {});
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 5));
    await expect(limiter(ctx, async () => {})).resolves.toBeUndefined();
  });

  it('uses custom keyFn', async () => {
    const store = new Map();
    const limiter = createRateLimit({
      maxRequests: 1,
      windowMs: 60000,
      store,
      keyFn: (ctx) => ctx.customKey,
    });
    const ctxA = { customKey: 'user:1', req: {}, res: { setHeader() {} } };
    const ctxB = { customKey: 'user:2', req: {}, res: { setHeader() {} } };
    await limiter(ctxA, async () => {});
    await expect(limiter(ctxB, async () => {})).resolves.toBeUndefined();
    await expect(limiter(ctxA, async () => {})).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe('core/rate-limit.js — purgeExpiredEntries', () => {
  it('removes expired entries', async () => {
    const store = new Map();
    store.set('stale', { count: 5, resetAt: Date.now() - 1 });
    store.set('fresh', { count: 1, resetAt: Date.now() + 60000 });
    purgeExpiredEntries(store);
    expect(store.has('stale')).toBe(false);
    expect(store.has('fresh')).toBe(true);
  });
});
