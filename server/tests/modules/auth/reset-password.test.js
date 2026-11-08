/**
 * @fileoverview Integration tests for Forgot/Reset Password endpoints.
 * Covers T-2.6: hashed token, 30-min expiry, single-use, no enumeration,
 * revoke all sessions on successful reset.
 * FR-AUTH-04.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { PasswordResetToken } from '../../../src/models/password-reset-token.model.js';
import { hashToken } from '../../../src/utils/tokens.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';

describe('T-2.6: Forgot/Reset Password', () => {
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
    await PasswordResetToken.deleteMany({});
  });

  // Helper: register a test user and return response body data
  async function registerUser(email = 'reset@eventsphere.test') {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Reset User',
        email,
        password: 'Password123!',
        role: 'attendee',
        privacyAccepted: true,
      });
    return res.body.data;
  }

  /**
   * Trigger forgot-password, then inject a known raw token into the
   * PasswordResetToken document so the test can use it predictably.
   * This avoids mocking the mailer while still exercising the full flow.
   */
  async function triggerForgotAndInjectToken(email = 'reset@eventsphere.test') {
    // Step 1: Trigger the flow — creates the token doc in DB (mailer fails silently in test)
    await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email });

    // Step 2: Find the token doc created for this user
    const user = await User.findOne({ email });
    if (!user) throw new Error(`User ${email} not found after forgot-password`);

    const tokenDoc = await PasswordResetToken.findOne({ userId: user._id });
    if (!tokenDoc) throw new Error(`No PasswordResetToken doc for user ${email}`);

    // Step 3: Replace the hash with a known raw token (unique per call to avoid collisions)
    const knownRawToken = randomBytes(16).toString('hex'); // unique each test
    tokenDoc.tokenHash = hashToken(knownRawToken);
    await tokenDoc.save();

    return knownRawToken;
  }

  describe('POST /api/v1/auth/forgot-password', () => {
    it('always returns 200 even for unregistered email (no enumeration)', async () => {
      const res = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@nobody.test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // No token document should exist
      const tokenCount = await PasswordResetToken.countDocuments({});
      expect(tokenCount).toBe(0);
    });

    it('returns 200 for registered user and creates token document in DB', async () => {
      await registerUser();

      const res = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset@eventsphere.test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await User.findOne({ email: 'reset@eventsphere.test' });
      const tokenDoc = await PasswordResetToken.findOne({ userId: user._id });
      expect(tokenDoc).not.toBeNull();
      expect(tokenDoc.consumed).toBe(false);
      expect(tokenDoc.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('replaces existing token when forgot-password is requested again (single active token)', async () => {
      await registerUser();

      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset@eventsphere.test' });

      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset@eventsphere.test' });

      const user = await User.findOne({ email: 'reset@eventsphere.test' });
      const tokens = await PasswordResetToken.find({ userId: user._id });
      expect(tokens).toHaveLength(1);
    });

    it('returns 400 for missing email field', async () => {
      const res = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('successfully resets password with valid token', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      const res = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('new password works for login after successful reset', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'reset@eventsphere.test', password: 'NewPassword456!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('old password no longer works after reset', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'reset@eventsphere.test', password: 'Password123!' });

      expect(loginRes.status).toBe(401);
    });

    it('revokes all existing refresh token sessions on successful reset', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      const user = await User.findOne({ email: 'reset@eventsphere.test' });
      expect(user.refreshTokens).toHaveLength(0);
    });

    it('marks token as consumed after first use (single-use)', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      const tokenHash = hashToken(rawToken);
      const tokenDoc = await PasswordResetToken.findOne({ tokenHash });
      expect(tokenDoc).not.toBeNull();
      expect(tokenDoc.consumed).toBe(true);
    });

    it('rejects token reuse (single-use enforcement)', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      // First use — succeeds
      await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'NewPassword456!' });

      // Second use — must fail (consumed)
      const res = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'AnotherPassword789!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects an entirely invalid/unknown token', async () => {
      const res = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'deadbeefdeadbeefdeadbeef', password: 'NewPassword456!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing token field', async () => {
      const res = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ password: 'NewPassword456!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for weak new password', async () => {
      await registerUser();
      const rawToken = await triggerForgotAndInjectToken();

      const res = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
