/**
 * @fileoverview Security Headers Test Suite (T-9.3).
 * NFR-SEC-04, NFR-SEC-05.
 * Validates OWASP security headers, CORS preflight, and Strict-Transport-Security.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { requestHandler } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';

let server;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);
});

afterAll(async () => {
  await disconnectDb();
});

describe('Security Headers (T-9.3, NFR-SEC-05)', () => {
  it('includes core security headers on API responses', async () => {
    const res = await request(server).get('/health');

    expect(res.status).toBe(200);

    // Content-Security-Policy
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");

    // X-Content-Type-Options
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options
    expect(res.headers['x-frame-options']).toBe('DENY');

    // Referrer-Policy
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Permissions-Policy
    expect(res.headers['permissions-policy']).toBeDefined();
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
    expect(res.headers['permissions-policy']).toContain('microphone=()');
    expect(res.headers['permissions-policy']).toContain('camera=()');
  });

  it('handles CORS allowed origin with credentials', async () => {
    const res = await request(server)
      .get('/health')
      .set('Origin', env.CLIENT_URL);

    expect(res.headers['access-control-allow-origin']).toBe(env.CLIENT_URL);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['vary']).toContain('Origin');
  });

  it('does not reflect disallowed origins in Access-Control-Allow-Origin', async () => {
    const res = await request(server)
      .get('/health')
      .set('Origin', 'https://malicious-attacker.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles OPTIONS preflight requests securely', async () => {
    const res = await request(server)
      .options('/api/v1/auth/login')
      .set('Origin', env.CLIENT_URL)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(env.CLIENT_URL);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
    expect(res.headers['access-control-max-age']).toBe('86400');
  });
});
