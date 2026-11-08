/**
 * @fileoverview Unit tests for core/cookies.js
 * Tests: parseCookies, serialiseCookie options.
 * Rule 3.1.9.
 */

import { describe, it, expect } from '@jest/globals';
import { parseCookies, serialiseCookie } from '../src/core/cookies.js';

describe('core/cookies.js — parseCookies', () => {
  it('parses a simple cookie string', () => {
    const result = parseCookies('token=abc123; session=xyz');
    expect(result).toEqual({ token: 'abc123', session: 'xyz' });
  });

  it('URL-decodes cookie values', () => {
    const result = parseCookies('name=hello%20world');
    expect(result.name).toBe('hello world');
  });

  it('returns empty object for empty header', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
  });

  it('handles cookies without values gracefully', () => {
    const result = parseCookies('key=val; orphan; another=x');
    expect(result.key).toBe('val');
    expect(result.another).toBe('x');
    expect(result.orphan).toBeUndefined();
  });
});

describe('core/cookies.js — serialiseCookie', () => {
  it('serialises basic name=value', () => {
    const s = serialiseCookie('token', 'abc');
    expect(s).toContain('token=abc');
  });

  it('sets HttpOnly flag', () => {
    const s = serialiseCookie('rt', 'val', { httpOnly: true });
    expect(s).toContain('HttpOnly');
  });

  it('sets Secure flag', () => {
    const s = serialiseCookie('rt', 'val', { secure: true });
    expect(s).toContain('Secure');
  });

  it('sets SameSite=Strict', () => {
    const s = serialiseCookie('rt', 'val', { sameSite: 'Strict' });
    expect(s).toContain('SameSite=Strict');
  });

  it('sets Max-Age', () => {
    const s = serialiseCookie('rt', 'val', { maxAge: 3600 });
    expect(s).toContain('Max-Age=3600');
  });

  it('sets Path', () => {
    const s = serialiseCookie('rt', 'val', { path: '/' });
    expect(s).toContain('Path=/');
  });

  it('URL-encodes value with special characters', () => {
    const s = serialiseCookie('key', 'a b');
    expect(s).toContain('key=a%20b');
  });
});
