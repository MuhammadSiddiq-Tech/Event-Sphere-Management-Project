/**
 * @fileoverview Cookie parser and serialiser.
 * Parses 'Cookie' request header; serialises 'Set-Cookie' response values.
 * Architecture §5.3 — no Express cookie-parser dependency.
 */

/**
 * Parse the Cookie header string into a plain object.
 * @param {string} cookieHeader - Value of the 'Cookie' header
 * @returns {Record<string, string>}
 */
export function parseCookies(cookieHeader) {
  /** @type {Record<string, string>} */
  const cookies = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * @typedef {Object} CookieOptions
 * @property {boolean} [httpOnly]
 * @property {boolean} [secure]
 * @property {'Strict'|'Lax'|'None'} [sameSite]
 * @property {string} [path]
 * @property {number} [maxAge] - seconds
 * @property {Date} [expires]
 */

/**
 * Serialise a cookie name=value pair with options.
 * @param {string} name
 * @param {string} value
 * @param {CookieOptions} [options]
 * @returns {string}
 */
export function serialiseCookie(name, value, options = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.maxAge != null) str += `; Max-Age=${options.maxAge}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += '; HttpOnly';
  if (options.secure) str += '; Secure';
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}
