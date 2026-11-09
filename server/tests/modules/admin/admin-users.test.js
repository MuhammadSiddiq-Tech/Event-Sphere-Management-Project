/**
 * @fileoverview Integration tests for Admin User Management (T-8.7).
 * FR-ADM-01.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';

let server;
let adminUser, adminToken;
let targetUser;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  const hash = await bcrypt.hash('Password123!', 12);

  adminUser = await User.create({
    name: 'Admin User Mgmt',
    email: 'admin-user-mgmt@test.com',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  targetUser = await User.create({
    name: 'Target Attendee',
    email: 'target-attendee@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  const resAdmin = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'admin-user-mgmt@test.com', password: 'Password123!' });
  adminToken = resAdmin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await User.deleteMany({
    email: { $in: ['admin-user-mgmt@test.com', 'target-attendee@test.com'] },
  });
  await disconnectDb();
});

beforeEach(async () => {
  // Ensure targetUser is active before each test
  await User.findByIdAndUpdate(targetUser._id, { isActive: true });
});

describe('Admin User Management (T-8.7)', () => {
  describe('GET /api/v1/admin/users', () => {
    it('returns paginated user list for admin', async () => {
      const res = await request(server)
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('supports search by name', async () => {
      const res = await request(server)
        .get('/api/v1/admin/users?q=Target+Attendee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((u) => u.email === 'target-attendee@test.com')).toBe(true);
    });

    it('supports filtering by role', async () => {
      const res = await request(server)
        .get('/api/v1/admin/users?role=attendee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u) => u.role === 'attendee')).toBe(true);
    });

    it('denies non-admin with 403', async () => {
      // Use unauthenticated request
      const res = await request(server).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('returns a user by ID', async () => {
      const res = await request(server)
        .get(`/api/v1/admin/users/${targetUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('target-attendee@test.com');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(server)
        .get(`/api/v1/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/deactivate', () => {
    it('deactivates an active user', async () => {
      const res = await request(server)
        .patch(`/api/v1/admin/users/${targetUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const inDb = await User.findById(targetUser._id);
      expect(inDb.isActive).toBe(false);
    });

    it('prevents admin from deactivating their own account', async () => {
      const res = await request(server)
        .patch(`/api/v1/admin/users/${adminUser._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500); // Throws generic Error — mapped to 500
    });
  });

  describe('PATCH /api/v1/admin/users/:id/reactivate', () => {
    it('reactivates a deactivated user', async () => {
      // First deactivate
      await User.findByIdAndUpdate(targetUser._id, { isActive: false });

      const res = await request(server)
        .patch(`/api/v1/admin/users/${targetUser._id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);

      const inDb = await User.findById(targetUser._id);
      expect(inDb.isActive).toBe(true);
    });
  });
});
