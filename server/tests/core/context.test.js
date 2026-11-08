/**
 * @fileoverview Unit tests for core/context.js
 * Tests: ctx properties, json envelope, setCookie, clearCookie, noContent.
 * Rule 3.1.9.
 */

import { describe, it, expect } from '@jest/globals';
import { buildCtx } from '../src/core/context.js';

/** Build a minimal mock req/res */
function makeMocks(method = 'GET', url = '/test?foo=bar') {
  const headers = { cookie: 'token=abc; session=xyz' };
  const req = { method, url, headers, socket: {} };

  const resData = { status: null, headers: {}, body: null };
  const res = {
    writeHead(s, h = {}) { resData.status = s; Object.assign(resData.headers, h); },
    end(b) { resData.body = b; },
    setHeader(k, v) {
      const existing = resData.headers[k];
      if (existing) {
        resData.headers[k] = Array.isArray(existing) ? [...existing, v] : [existing, v];
      } else {
        resData.headers[k] = v;
      }
    },
    getHeader(k) { return resData.headers[k]; },
    headersSent: false,
  };
  return { req, res, resData };
}

describe('core/context.js — buildCtx', () => {
  it('extracts method and pathname', () => {
    const { req, res } = makeMocks('POST', '/users/me');
    const ctx = buildCtx(req, res, 'req-1');
    expect(ctx.method).toBe('POST');
    expect(ctx.path).toBe('/users/me');
  });

  it('parses query string into ctx.query', () => {
    const { req, res } = makeMocks('GET', '/search?q=hello&limit=10');
    const ctx = buildCtx(req, res, 'req-2');
    expect(ctx.query).toEqual({ q: 'hello', limit: '10' });
  });

  it('parses Cookie header into ctx.cookies', () => {
    const { req, res } = makeMocks('GET', '/');
    const ctx = buildCtx(req, res, 'req-3');
    expect(ctx.cookies.token).toBe('abc');
    expect(ctx.cookies.session).toBe('xyz');
  });

  it('ctx.json writes success envelope', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-4');
    ctx.json(200, { id: 1 });
    expect(resData.status).toBe(200);
    const parsed = JSON.parse(resData.body);
    expect(parsed).toEqual({ success: true, data: { id: 1 } });
  });

  it('ctx.json writes meta if provided', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-5');
    ctx.json(200, [], { page: 1, total: 5 });
    const parsed = JSON.parse(resData.body);
    expect(parsed.meta).toEqual({ page: 1, total: 5 });
  });

  it('ctx.json with raw payload bypasses envelope', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-6');
    ctx.json(400, null, null, { success: false, error: { code: 'X', message: 'err' } });
    const parsed = JSON.parse(resData.body);
    expect(parsed.success).toBe(false);
    expect(parsed.error.code).toBe('X');
  });

  it('ctx.noContent writes 204', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-7');
    ctx.noContent();
    expect(resData.status).toBe(204);
  });

  it('ctx.setCookie appends Set-Cookie header', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-8');
    ctx.setCookie('refresh', 'tok123', { httpOnly: true, path: '/', sameSite: 'Strict', maxAge: 3600 });
    const setCookieHeader = resData.headers['Set-Cookie'];
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    expect(cookieStr).toContain('refresh=tok123');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('ctx.clearCookie sets Max-Age=0', () => {
    const { req, res, resData } = makeMocks();
    const ctx = buildCtx(req, res, 'req-9');
    ctx.clearCookie('refresh');
    const setCookieHeader = resData.headers['Set-Cookie'];
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    expect(cookieStr).toContain('Max-Age=0');
  });

  it('initialises body, files, params, user to defaults', () => {
    const { req, res } = makeMocks();
    const ctx = buildCtx(req, res, 'req-10');
    expect(ctx.body).toBeUndefined();
    expect(ctx.files).toEqual([]);
    expect(ctx.params).toEqual({});
    expect(ctx.user).toBeUndefined();
  });
});
