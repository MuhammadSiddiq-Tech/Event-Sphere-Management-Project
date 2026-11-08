/**
 * @fileoverview Integration tests for Auth endpoints: Registration & Login.
 * Covers T-2.2 and T-2.3.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';

describe('T-2.2 & T-2.3: Authentication (Register & Login)', () => {
  let server;

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('successfully registers an attendee and returns accessToken + httpOnly refresh cookie', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@eventsphere.test',
        password: 'Password123!',
        role: 'attendee',
        privacyAccepted: true,
      };

      const res = await request(server)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('jane@eventsphere.test');
      expect(res.body.data.user.role).toBe('attendee');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      // Check httpOnly refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('refreshToken=');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('successfully registers an exhibitor', async () => {
      const payload = {
        name: 'Acme Corp Rep',
        email: 'exhibitor@acme.test',
        password: 'Password123!',
        role: 'exhibitor',
        privacyAccepted: true,
      };

      const res = await request(server)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('exhibitor');
    });

    it('rejects registration with role admin (Rule BR-1)', async () => {
      const payload = {
        name: 'Malicious Admin',
        email: 'admin@eventsphere.test',
        password: 'Password123!',
        role: 'admin',
        privacyAccepted: true,
      };

      const res = await request(server)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration if privacy consent is not accepted', async () => {
      const payload = {
        name: 'No Consent',
        email: 'noconsent@eventsphere.test',
        password: 'Password123!',
        role: 'attendee',
        privacyAccepted: false,
      };

      const res = await request(server)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 409 Conflict on duplicate email registration', async () => {
      const payload = {
        name: 'Original User',
        email: 'duplicate@eventsphere.test',
        password: 'Password123!',
        role: 'attendee',
        privacyAccepted: true,
      };

      await request(server).post('/api/v1/auth/register').send(payload);

      const res = await request(server).post('/api/v1/auth/register').send(payload);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create user
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Login User',
          email: 'login@eventsphere.test',
          password: 'Password123!',
          role: 'attendee',
          privacyAccepted: true,
        });
    });

    it('successfully logs in with valid credentials and issues new tokens', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@eventsphere.test',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@eventsphere.test');
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('refreshToken=');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('returns 401 with generic error message on invalid password (no enumeration)', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@eventsphere.test',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns 401 with generic error message on non-existent email', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@eventsphere.test',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('T-2.4: Token Rotation & Logout (POST /api/v1/auth/refresh, POST /api/v1/auth/logout)', () => {
    let initialCookie;
    let initialToken;

    beforeEach(async () => {
      const reg = await request(server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Refresh User',
          email: 'refresh@eventsphere.test',
          password: 'Password123!',
          role: 'attendee',
          privacyAccepted: true,
        });

      initialToken = reg.body.data.accessToken;
      const setCookies = reg.headers['set-cookie'];
      initialCookie = Array.isArray(setCookies) ? setCookies[0] : setCookies;
    });

    it('successfully rotates refresh token and returns new access token', async () => {
      const cookieValue = initialCookie.split(';')[0]; // "refreshToken=..."

      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieValue);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(initialToken);

      const rotatedCookies = res.headers['set-cookie'];
      expect(rotatedCookies).toBeDefined();
      const rotatedCookieStr = Array.isArray(rotatedCookies) ? rotatedCookies.join('; ') : rotatedCookies;
      expect(rotatedCookieStr).toContain('refreshToken=');
    });

    it('rejects refresh when refresh cookie is missing', async () => {
      const res = await request(server).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('detects refresh token reuse and revokes entire family (Reuse Detection)', async () => {
      const cookieValue = initialCookie.split(';')[0];

      // First rotation succeeds
      const firstRotation = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieValue);
      expect(firstRotation.status).toBe(200);

      // Malicious or accidental reuse of the old (revoked) cookieValue
      const reusedAttempt = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieValue);

      expect(reusedAttempt.status).toBe(401);
      expect(reusedAttempt.body.error.message).toContain('Revoked token reuse detected');

      // Verify that all tokens in the family have been purged from the user doc
      const user = await User.findOne({ email: 'refresh@eventsphere.test' });
      expect(user.refreshTokens).toHaveLength(0);
    });

    it('successfully logs out and clears refresh cookie', async () => {
      const cookieValue = initialCookie.split(';')[0];

      const res = await request(server)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieValue);

      expect(res.status).toBe(204);

      // Verify cookie is cleared (Max-Age=0)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('Max-Age=0');

      // Verify token in DB is marked revoked
      const user = await User.findOne({ email: 'refresh@eventsphere.test' });
      const revokedCount = user.refreshTokens.filter((t) => t.isRevoked).length;
      expect(revokedCount).toBeGreaterThan(0);
    });
  });

  describe('T-2.5: User Profile Endpoint (GET /api/v1/auth/me)', () => {
    let accessToken;

    beforeEach(async () => {
      const reg = await request(server)
        .post('/api/v1/auth/register')
        .send({
          name: 'Me Profile User',
          email: 'me@eventsphere.test',
          password: 'Password123!',
          role: 'attendee',
          privacyAccepted: true,
        });

      accessToken = reg.body.data.accessToken;
    });

    it('returns current user profile when valid Bearer token is provided', async () => {
      const res = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('me@eventsphere.test');
      expect(res.body.data.name).toBe('Me Profile User');
      expect(res.body.data.role).toBe('attendee');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('rejects with 401 when Authorization header is missing', async () => {
      const res = await request(server).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects with 401 when token is invalid or malformed', async () => {
      const res = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer bad.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
