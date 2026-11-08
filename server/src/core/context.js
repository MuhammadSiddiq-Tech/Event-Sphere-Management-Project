/**
 * @fileoverview Request context object.
 * Builds ctx from (req, res) and attaches helpers: json, noContent, setCookie, clearCookie.
 * Architecture §5.3 — ctx is passed down through the pipeline instead of (req, res).
 */

import { parseCookies, serialiseCookie } from './cookies.js';
import { successResponse } from '../utils/response.js';

/**
 * @typedef {Object} Ctx
 * @property {import('node:http').IncomingMessage} req
 * @property {import('node:http').ServerResponse} res
 * @property {string} method
 * @property {string} path - pathname without query string
 * @property {Record<string,string>} query - parsed query params
 * @property {Record<string,string>} params - URL path params
 * @property {unknown} body - parsed request body
 * @property {Array<{fieldname:string,filename:string,path:string,mimetype:string,size:number}>} files
 * @property {Record<string,string>} cookies - parsed Cookie header
 * @property {unknown} user - set by requireAuth middleware
 * @property {string} requestId
 * @property {import('pino').Logger} log
 * @property {(status:number, data?:unknown, meta?:unknown, raw?:unknown) => void} json
 * @property {() => void} noContent
 * @property {(name:string, value:string, opts?:import('./cookies.js').CookieOptions) => void} setCookie
 * @property {(name:string) => void} clearCookie
 */

/**
 * Build the ctx object from an HTTP request and response.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} requestId
 * @param {import('pino').Logger} [log]
 * @returns {Ctx}
 */
export function buildCtx(req, res, requestId, log) {
  const rawUrl = req.url ?? '/';
  const qIdx = rawUrl.indexOf('?');
  const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
  const queryString = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';
  const query = Object.fromEntries(new URLSearchParams(queryString));

  const cookies = parseCookies(req.headers['cookie'] ?? '');

  /** @type {Ctx} */
  const ctx = {
    req,
    res,
    method: req.method?.toUpperCase() ?? 'GET',
    path: pathname,
    query,
    params: {},
    body: undefined,
    files: [],
    cookies,
    user: undefined,
    requestId,
    log: log ?? console,

    /**
     * Send a JSON response with the standard envelope.
     * @param {number} status
     * @param {unknown} [data]
     * @param {unknown} [meta]
     * @param {unknown} [raw] - bypass envelope, send raw object
     */
    json(status, data, meta, raw) {
      const payload = raw ?? successResponse(data, meta);
      const body = JSON.stringify(payload);
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
    },

    /** Send 204 No Content */
    noContent() {
      res.writeHead(204);
      res.end();
    },

    /**
     * Append a Set-Cookie header to the response.
     * @param {string} name
     * @param {string} value
     * @param {import('./cookies.js').CookieOptions} [opts]
     */
    setCookie(name, value, opts = {}) {
      const existing = res.getHeader('Set-Cookie') ?? [];
      const headers = Array.isArray(existing) ? existing : [existing];
      headers.push(serialiseCookie(name, value, opts));
      res.setHeader('Set-Cookie', headers);
    },

    /**
     * Clear a cookie by setting Max-Age=0.
     * @param {string} name
     */
    clearCookie(name) {
      ctx.setCookie(name, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'Strict' });
    },
  };

  return ctx;
}
