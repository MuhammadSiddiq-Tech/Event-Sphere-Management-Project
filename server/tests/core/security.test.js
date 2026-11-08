/**
 * @fileoverview Unit tests for core/security.js
 * Tests: secureHeaders, cors preflight, sanitiseBody ($ and . key removal), normaliseQuery.
 * Rule 3.1.9. NFR-SEC-04.
 */

import { describe, it, expect } from '@jest/globals';
import { secureHeaders, cors, sanitiseBody, normaliseQuery } from '../../src/core/security.js';

function makeCtx(overrides = {}) {
  const headers = {};
  const written = { status: null };
  const ctx = {
    method: 'GET',
    path: '/test',
    query: {},
    body: null,
    req: { headers: {} },
    res: {
      setHeader(k, v) { headers[k] = v; },
      getHeader(k) { return headers[k]; },
      writeHead(s) { written.status = s; },
      end() {},
      headersSent: false,
    },
    headers,
    written,
    ...overrides,
  };
  return ctx;
}

describe('core/security.js — secureHeaders', () => {
  it('sets Content-Security-Policy', async () => {
    const ctx = makeCtx();
    await secureHeaders(ctx, async () => {});
    expect(ctx.headers['Content-Security-Policy']).toContain("default-src 'self'");
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const ctx = makeCtx();
    await secureHeaders(ctx, async () => {});
    expect(ctx.headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const ctx = makeCtx();
    await secureHeaders(ctx, async () => {});
    expect(ctx.headers['X-Frame-Options']).toBe('DENY');
  });

  it('calls next()', async () => {
    const ctx = makeCtx();
    let called = false;
    await secureHeaders(ctx, async () => { called = true; });
    expect(called).toBe(true);
  });
});

describe('core/security.js — cors', () => {
  it('sets Access-Control-Allow-Origin for allowed origin', async () => {
    const ctx = makeCtx();
    ctx.req.headers['origin'] = 'http://localhost:5173';
    await cors(ctx, async () => {});
    expect(ctx.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('does NOT set Allow-Origin for unknown origin', async () => {
    const ctx = makeCtx();
    ctx.req.headers['origin'] = 'http://evil.com';
    await cors(ctx, async () => {});
    expect(ctx.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('handles OPTIONS preflight — writes 204 and does not call next', async () => {
    const ctx = makeCtx({ method: 'OPTIONS' });
    ctx.req.headers['origin'] = 'http://localhost:5173';
    let nextCalled = false;
    await cors(ctx, async () => { nextCalled = true; });
    expect(ctx.written.status).toBe(204);
    expect(nextCalled).toBe(false);
  });
});

describe('core/security.js — sanitiseBody', () => {
  it('strips keys starting with $', async () => {
    const ctx = makeCtx();
    ctx.body = { name: 'Alice', '$where': 'malicious' };
    await sanitiseBody(ctx, async () => {});
    expect(ctx.body.name).toBe('Alice');
    expect(ctx.body['$where']).toBeUndefined();
  });

  it('strips keys containing .', async () => {
    const ctx = makeCtx();
    ctx.body = { 'valid': 'ok', 'a.b': 'bad' };
    await sanitiseBody(ctx, async () => {});
    expect(ctx.body.valid).toBe('ok');
    expect(ctx.body['a.b']).toBeUndefined();
  });

  it('recursively sanitises nested objects', async () => {
    const ctx = makeCtx();
    ctx.body = { nested: { '$gt': 0, safe: 'yes' } };
    await sanitiseBody(ctx, async () => {});
    expect(ctx.body.nested.safe).toBe('yes');
    expect(ctx.body.nested['$gt']).toBeUndefined();
  });

  it('handles arrays inside body', async () => {
    const ctx = makeCtx();
    ctx.body = { items: [{ '$or': 1 }, { safe: true }] };
    await sanitiseBody(ctx, async () => {});
    expect(ctx.body.items[0]['$or']).toBeUndefined();
    expect(ctx.body.items[1].safe).toBe(true);
  });

  it('leaves non-object body untouched', async () => {
    const ctx = makeCtx();
    ctx.body = 'just a string';
    await sanitiseBody(ctx, async () => {});
    expect(ctx.body).toBe('just a string');
  });
});

describe('core/security.js — normaliseQuery', () => {
  it('passes safe query keys through', async () => {
    const ctx = makeCtx();
    ctx.query = { page: '1', q: 'hello' };
    await normaliseQuery(ctx, async () => {});
    expect(ctx.query).toEqual({ page: '1', q: 'hello' });
  });

  it('strips query keys starting with $', async () => {
    const ctx = makeCtx();
    ctx.query = { valid: 'yes', '$where': 'bad' };
    await normaliseQuery(ctx, async () => {});
    expect(ctx.query.valid).toBe('yes');
    expect(ctx.query['$where']).toBeUndefined();
  });
});
