/**
 * @fileoverview Unit tests for response compression middleware (core/compress.js).
 * Verifies gzip/brotli compression on payloads > 1KB when requested.
 * Rule 3.1.9, T-1.4.
 */

import { describe, it, expect } from '@jest/globals';
import { Writable } from 'node:stream';
import { compress } from '../../src/core/compress.js';

function makeCtx(acceptEncoding = '') {
  const headers = {};
  const written = { status: null, body: null };

  const res = new Writable({
    write(chunk, encoding, callback) {
      written.body = chunk;
      callback();
    },
  });

  res.writeHead = function (status, h = {}) {
    written.status = status;
    Object.assign(headers, h);
  };
  res.setHeader = function (k, v) { headers[k] = v; };
  res.getHeader = function (k) { return headers[k]; };

  const ctx = {
    req: { headers: { 'accept-encoding': acceptEncoding } },
    res,
    headers,
    written,
    json(status, data, meta, raw) {
      const payload = raw ?? { success: true, data };
      const body = Buffer.from(JSON.stringify(payload), 'utf8');
      res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': body.length });
      res.end(body);
    },
  };

  return ctx;
}

describe('core/compress.js — Compression Middleware', () => {
  it('does not compress if Accept-Encoding does not support gzip/br', async () => {
    const ctx = makeCtx('');
    await compress(ctx, async () => {});

    const smallData = { message: 'hello' };
    ctx.json(200, smallData);

    expect(ctx.headers['Content-Encoding']).toBeUndefined();
    expect(ctx.written.body).toBeDefined();
  });

  it('does not compress payloads smaller than threshold (1KB) even if gzip accepted', async () => {
    const ctx = makeCtx('gzip');
    await compress(ctx, async () => {});

    const smallData = { message: 'small payload' };
    ctx.json(200, smallData);

    expect(ctx.headers['Content-Encoding']).toBeUndefined();
    expect(ctx.written.body).toBeDefined();
  });

  it('sets Content-Encoding: gzip for large payloads (> 1KB) when gzip is accepted', async () => {
    const ctx = makeCtx('gzip');
    await compress(ctx, async () => {});

    // Create a payload > 1KB
    const largeData = { text: 'A'.repeat(2048) };
    ctx.json(200, largeData);

    expect(ctx.headers['Content-Encoding']).toBe('gzip');
    expect(ctx.headers['Vary']).toBe('Accept-Encoding');
  });

  it('sets Content-Encoding: br for large payloads when brotli is accepted', async () => {
    const ctx = makeCtx('br, gzip');
    await compress(ctx, async () => {});

    const largeData = { text: 'B'.repeat(2048) };
    ctx.json(200, largeData);

    expect(ctx.headers['Content-Encoding']).toBe('br');
  });
});
