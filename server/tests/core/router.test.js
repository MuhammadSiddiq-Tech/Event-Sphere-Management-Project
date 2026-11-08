/**
 * @fileoverview Unit tests for core/router.js
 * Tests: params extraction, 404, 405 with Allow header.
 * Rule 3.1.9.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// We need a fresh router for each test suite — reset module between tests
// Since ES modules cache, we build a local router for isolation

/** Build a minimal ctx mock */
function makeCtx(method, path) {
  const written = { status: null, headers: {}, body: null };
  const res = {
    writeHead(status, headers = {}) {
      written.status = status;
      Object.assign(written.headers, headers);
    },
    end(body) { written.body = body; },
    setHeader(k, v) { written.headers[k] = v; },
    getHeader(k) { return written.headers[k]; },
    headersSent: false,
  };
  return { ctx: { method, path, params: {}, res, req: { socket: { remoteAddress: '127.0.0.1' } } }, written };
}

// Because the router module holds global state, we test its compilePath logic
// and the matching behaviour by importing and re-using it carefully.
// In production the server boots once; for tests we verify via the exported match function.

describe('core/router.js', () => {
  it('extracts named params from a path', async () => {
    const { router } = await import('../src/core/router.js');
    let captured = {};
    router.get('/test-items/:id/sub/:subId', (ctx) => { captured = ctx.params; });

    const { ctx } = makeCtx('GET', '/test-items/abc123/sub/xyz');
    const match = router.match(ctx);
    expect(match).not.toBeNull();
    expect(ctx.params).toEqual({ id: 'abc123', subId: 'xyz' });
  });

  it('returns null and writes 404 for unknown path', async () => {
    const { router } = await import('../src/core/router.js');
    const { ctx, written } = makeCtx('GET', '/no-such-path-exists-xyz');
    const match = router.match(ctx);
    expect(match).toBeNull();
    expect(written.status).toBe(404);
  });

  it('returns null and writes 405 with Allow header for wrong method', async () => {
    const { router } = await import('../src/core/router.js');
    // Register a GET route for a unique path
    router.get('/method-test-unique', async () => {});
    const { ctx, written } = makeCtx('DELETE', '/method-test-unique');
    const match = router.match(ctx);
    expect(match).toBeNull();
    expect(written.status).toBe(405);
    expect(written.headers['Allow']).toContain('GET');
  });

  it('returns handlers array on a matching route', async () => {
    const { router } = await import('../src/core/router.js');
    const handler = async () => {};
    router.post('/handler-test/:id', handler);
    const { ctx } = makeCtx('POST', '/handler-test/42');
    const match = router.match(ctx);
    expect(match).not.toBeNull();
    expect(Array.isArray(match.handlers)).toBe(true);
  });

  it('URL-decodes path params', async () => {
    const { router } = await import('../src/core/router.js');
    router.get('/decode-test/:slug', async () => {});
    const { ctx } = makeCtx('GET', '/decode-test/hello%20world');
    router.match(ctx);
    expect(ctx.params.slug).toBe('hello world');
  });
});
