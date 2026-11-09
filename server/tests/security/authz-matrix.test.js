/**
 * @fileoverview Authorization Matrix Test Suite (T-9.2).
 * NFR-SEC-03.
 * Exhaustively verifies role-based and ownership-based access control per route × role:
 *  - Anonymous (401)
 *  - Attendee (role-guarded 403 vs 200)
 *  - Exhibitor (role-guarded 403 vs 200)
 *  - Admin (full admin route access 200 vs restricted member routes)
 *  - Ownership isolation across cross-user resources (403/404)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { requestHandler } from '../../src/app.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { User } from '../../src/models/user.model.js';
import { Expo } from '../../src/models/expo.model.js';
import { Application } from '../../src/models/application.model.js';
import { Notification } from '../../src/models/notification.model.js';
import { Conversation } from '../../src/models/conversation.model.js';
import { NOTIFICATION_TYPE, CONVERSATION_TYPE, APPLICATION_STATUS } from '../../src/config/constants.js';
import { setIo } from '../../src/sockets/emitter.js';

let server;
let admin, adminToken;
let exhibitor1, exhibitor1Token;
let exhibitor2, exhibitor2Token;
let attendee1, attendee1Token;
let attendee2, attendee2Token;

let testExpo;
let exh1App;
let user1Notif;
let conversation1;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);
  setIo({ to: () => ({ emit: () => {} }) });

  const emails = [
    'matrix-admin@test.com',
    'matrix-exh1@test.com',
    'matrix-exh2@test.com',
    'matrix-att1@test.com',
    'matrix-att2@test.com',
  ];
  await User.deleteMany({ email: { $in: emails } });

  const hash = await bcrypt.hash('Password123!', 12);

  // 1. Create Users
  admin = await User.create({
    name: 'Matrix Admin',
    email: 'matrix-admin@test.com',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true },
  });

  exhibitor1 = await User.create({
    name: 'Matrix Exhibitor 1',
    email: 'matrix-exh1@test.com',
    passwordHash: hash,
    role: 'exhibitor',
    consent: { privacyAccepted: true },
  });

  exhibitor2 = await User.create({
    name: 'Matrix Exhibitor 2',
    email: 'matrix-exh2@test.com',
    passwordHash: hash,
    role: 'exhibitor',
    consent: { privacyAccepted: true },
  });

  attendee1 = await User.create({
    name: 'Matrix Attendee 1',
    email: 'matrix-att1@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true },
  });

  attendee2 = await User.create({
    name: 'Matrix Attendee 2',
    email: 'matrix-att2@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true },
  });

  // Login and acquire tokens
  async function getToken(email) {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' });
    return res.body.data.accessToken;
  }

  adminToken = await getToken('matrix-admin@test.com');
  exhibitor1Token = await getToken('matrix-exh1@test.com');
  exhibitor2Token = await getToken('matrix-exh2@test.com');
  attendee1Token = await getToken('matrix-att1@test.com');
  attendee2Token = await getToken('matrix-att2@test.com');

  // 2. Create Shared Expo
  testExpo = await Expo.create({
    title: 'Authz Matrix Expo',
    slug: 'authz-matrix-expo',
    description: 'Expo for testing authorization',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-05'),
    status: 'published',
    createdBy: admin._id,
  });

  // 3. Create Exhibitor 1 Application
  exh1App = await Application.create({
    expo: testExpo._id,
    exhibitor: exhibitor1._id,
    status: APPLICATION_STATUS.PENDING,
    companySnapshot: { companyName: 'Exhibitor One Co' },
  });

  // 4. Create Notification for Attendee 1
  user1Notif = await Notification.create({
    user: attendee1._id,
    type: NOTIFICATION_TYPE.APPLICATION_RESULT,
    payload: { text: 'Hello' },
  });

  // 5. Create Conversation between Exhibitor 1 & Attendee 1
  conversation1 = await Conversation.create({
    participants: [exhibitor1._id, attendee1._id],
    type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
    unreadCounts: { [exhibitor1._id.toString()]: 0, [attendee1._id.toString()]: 0 },
  });
}, 30000);

afterAll(async () => {
  if (testExpo?._id) await Expo.deleteOne({ _id: testExpo._id });
  if (exh1App?._id) await Application.deleteOne({ _id: exh1App._id });
  if (user1Notif?._id) await Notification.deleteOne({ _id: user1Notif._id });
  if (conversation1?._id) await Conversation.deleteOne({ _id: conversation1._id });

  await User.deleteMany({
    email: {
      $in: [
        'matrix-admin@test.com',
        'matrix-exh1@test.com',
        'matrix-exh2@test.com',
        'matrix-att1@test.com',
        'matrix-att2@test.com',
      ],
    },
  });
  await disconnectDb();
});

describe('Authorization Audit Matrix (T-9.2, NFR-SEC-03)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Public Endpoints (Accessible to All Roles and Anonymous)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Public Endpoints (Anonymous + Authenticated Allowed)', () => {
    it('allows anonymous access to GET /health', async () => {
      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
    });

    it('allows anonymous access to GET /api/v1/expos', async () => {
      const res = await request(server).get('/api/v1/expos');
      expect(res.status).toBe(200);
    });

    it('allows anonymous access to GET /api/v1/expos/:id', async () => {
      const res = await request(server).get(`/api/v1/expos/${testExpo._id}`);
      expect(res.status).toBe(200);
    });

    it('allows anonymous access to GET /api/v1/exhibitors', async () => {
      const res = await request(server).get('/api/v1/exhibitors');
      expect(res.status).toBe(200);
    });

    it('allows anonymous access to GET /api/v1/expos/:id/sessions', async () => {
      const res = await request(server).get(`/api/v1/expos/${testExpo._id}/sessions`);
      expect(res.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Generic Authenticated Endpoints (401 for Anon, 200 for Any Role)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Authenticated Base Endpoints (Any Role Allowed, 401 Anonymous)', () => {
    const endpoint = '/api/v1/notifications';

    it('blocks anonymous with 401', async () => {
      const res = await request(server).get(endpoint);
      expect(res.status).toBe(401);
    });

    it('allows attendee with 200', async () => {
      const res = await request(server).get(endpoint).set('Authorization', `Bearer ${attendee1Token}`);
      expect(res.status).toBe(200);
    });

    it('allows exhibitor with 200', async () => {
      const res = await request(server).get(endpoint).set('Authorization', `Bearer ${exhibitor1Token}`);
      expect(res.status).toBe(200);
    });

    it('allows admin with 200', async () => {
      const res = await request(server).get(endpoint).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Admin-Only Endpoints (401 Anon, 403 Attendee, 403 Exhibitor, 200 Admin)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Admin-Only Routes (403 for non-admin)', () => {
    const adminRoutes = [
      { method: 'get', url: '/api/v1/admin/users' },
      { method: 'get', url: '/api/v1/feedback' },
      { method: 'get', url: '/api/v1/applications' },
    ];

    adminRoutes.forEach(({ method, url }) => {
      it(`enforces admin-only for ${method.toUpperCase()} ${url}`, async () => {
        // 1. Anonymous -> 401
        const resAnon = await request(server)[method](url);
        expect(resAnon.status).toBe(401);

        // 2. Attendee -> 403
        const resAtt = await request(server)[method](url).set('Authorization', `Bearer ${attendee1Token}`);
        expect(resAtt.status).toBe(403);

        // 3. Exhibitor -> 403
        const resExh = await request(server)[method](url).set('Authorization', `Bearer ${exhibitor1Token}`);
        expect(resExh.status).toBe(403);

        // 4. Admin -> 200
        const resAdmin = await request(server)[method](url).set('Authorization', `Bearer ${adminToken}`);
        expect(resAdmin.status).toBe(200);
      });
    });

    it('enforces admin-only for POST /api/v1/expos', async () => {
      const resAtt = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${attendee1Token}`)
        .send({ title: 'Hacked Expo' });
      expect(resAtt.status).toBe(403);

      const resExh = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({ title: 'Hacked Expo' });
      expect(resExh.status).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // 4. Exhibitor-Only Endpoints (401 Anon, 403 Attendee, 403 Admin, 200 Exhibitor)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Exhibitor-Only Routes', () => {
    it('blocks attendee and admin from GET /api/v1/applications/mine', async () => {
      const resAnon = await request(server).get('/api/v1/applications/mine');
      expect(resAnon.status).toBe(401);

      const resAtt = await request(server)
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(resAtt.status).toBe(403);

      const resAdmin = await request(server)
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(403);

      const resExh = await request(server)
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${exhibitor1Token}`);
      expect(resExh.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Authenticated User Endpoints (401 Anon, 200 for Any Authenticated User)
  // ───────────────────────────────────────────────────────────────────────────
  describe('User Endpoints (Agenda & Registrations)', () => {
    it('allows authenticated users to access GET /api/v1/sessions/me', async () => {
      const resAnon = await request(server).get('/api/v1/sessions/me');
      expect(resAnon.status).toBe(401);

      const resAtt = await request(server)
        .get('/api/v1/sessions/me')
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(resAtt.status).toBe(200);

      const resExh = await request(server)
        .get('/api/v1/sessions/me')
        .set('Authorization', `Bearer ${exhibitor1Token}`);
      expect(resExh.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Ownership & Multi-Tenant Data Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Resource Ownership & Isolation', () => {
    it('prevents Exhibitor 2 from withdrawing Exhibitor 1 application', async () => {
      const res = await request(server)
        .delete(`/api/v1/applications/${exh1App._id}`)
        .set('Authorization', `Bearer ${exhibitor2Token}`);

      // Should be 403 Forbidden (ownership check)
      expect(res.status).toBe(403);
    });

    it('prevents Attendee 2 from reading or modifying Attendee 1 notifications', async () => {
      const res = await request(server)
        .patch(`/api/v1/notifications/${user1Notif._id}/read`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      // 404 or 403 — cannot mutate someone else's notification
      expect([403, 404]).toContain(res.status);
    });

    it('prevents non-participant from accessing conversation thread', async () => {
      const res = await request(server)
        .get(`/api/v1/conversations/${conversation1._id}`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(403);
    });
  });
});
