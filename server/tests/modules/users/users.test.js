/**
 * @fileoverview Integration tests for Users endpoints.
 * Covers T-2.8: PATCH /users/me (profile update) and
 * PATCH /users/me/password (change password with old-password verification).
 * FR-AUTH-06.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';

describe('T-2.8: Users Endpoints', () => {
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

  // Helper: register and return { accessToken, user }
  async function registerAndLogin(email = 'user@eventsphere.test') {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email,
        password: 'Password123!',
        role: 'attendee',
        privacyAccepted: true,
      });
    return {
      accessToken: res.body.data.accessToken,
      user: res.body.data.user,
    };
  }

  describe('PATCH /api/v1/users/me', () => {
    it('updates name successfully', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('updates phone successfully', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: '+923001234567' });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('+923001234567');
    });

    it('updates multiple fields simultaneously', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name', phone: '+441234567890' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.phone).toBe('+441234567890');
    });

    it('never returns passwordHash in the response', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Safe User' });

      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 400 when no updatable fields are provided', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid avatarUrl', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(server)
        .patch('/api/v1/users/me')
        .send({ name: 'Hacker' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/me/password', () => {
    it('successfully changes password with correct current password', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('new password works for login after change', async () => {
      const { accessToken } = await registerAndLogin();

      await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword456!' });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'user@eventsphere.test', password: 'NewPassword456!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('old password no longer works after change', async () => {
      const { accessToken } = await registerAndLogin();

      await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword456!' });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'user@eventsphere.test', password: 'Password123!' });

      expect(loginRes.status).toBe(401);
    });

    it('revokes all sessions on password change', async () => {
      const { accessToken } = await registerAndLogin();

      await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword456!' });

      const user = await User.findOne({ email: 'user@eventsphere.test' });
      expect(user.refreshTokens).toHaveLength(0);
    });

    it('returns 401 when current password is wrong', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword456!' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('incorrect');
    });

    it('returns 400 for weak new password', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'Password123!', newPassword: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when currentPassword is missing', async () => {
      const { accessToken } = await registerAndLogin();

      const res = await request(server)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newPassword: 'NewPassword456!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(server)
        .patch('/api/v1/users/me/password')
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword456!' });

      expect(res.status).toBe(401);
    });
  });
});
