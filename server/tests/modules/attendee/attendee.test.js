/**
 * @fileoverview Integration tests for Attendee Features.
 * T-6.1 — ExpoRegistration (ticket code, idempotent, list mine).
 * T-6.2 — SessionRegistration (expo check, capacity, time overlap, cancel-delete block).
 * T-6.3 — Bookmarks & My Agenda (GET /sessions/me).
 * T-6.4 — Reminder Background Runner.
 * FR-ATT-02, FR-ATT-06, FR-ATT-07, FR-ATT-08, BR-7, BR-8.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { Session } from '../../../src/models/session.model.js';
import { ExpoRegistration } from '../../../src/models/expoRegistration.model.js';
import { SessionEngagement } from '../../../src/models/sessionEngagement.model.js';
import { attendeeService } from '../../../src/modules/attendee/attendee.service.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import {
  EXPO_STATUS,
  SESSION_TYPE,
  SESSION_STATUS,
  ENGAGEMENT_KIND,
} from '../../../src/config/constants.js';

let server;
let adminToken, adminId;
let attendee1Token, attendee1Id;
let attendee2Token, attendee2Id;
let publishedExpoId;
let draftExpoId;

async function seedAdmin() {
  const hash = await bcrypt.hash('Admin@1234!', 12);
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@attendee-test.test',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  adminId = admin._id.toString();
  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@attendee-test.test', password: 'Admin@1234!' });
  return login.body.data.accessToken;
}

async function registerAttendee(suffix = '1') {
  const email = `attendee${suffix}@attendee-test.test`;
  const res = await request(server)
    .post('/api/v1/auth/register')
    .send({
      name: `Attendee ${suffix}`,
      email,
      password: 'Password123!',
      role: 'attendee',
      privacyAccepted: true,
    });
  return {
    token: res.body.data.accessToken,
    userId: res.body.data.user.id,
  };
}

async function seedExpo(overrides = {}) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  return Expo.create({
    title: `Attendee Expo ${ts}`,
    slug: `attendee-expo-${ts}`,
    description: 'Expo for attendee tests',
    theme: 'Technology',
    status: EXPO_STATUS.PUBLISHED,
    startDate: new Date('2027-08-01T00:00:00.000Z'),
    endDate: new Date('2027-08-05T23:59:59.000Z'),
    venue: { name: 'Convention Hall', address: '123 Test St', city: 'Test City', country: 'US' },
    floorPlan: { width: 500, height: 400, gridSize: 10 },
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

async function seedSession(expoId, overrides = {}) {
  return Session.create({
    expo: expoId,
    title: `Session ${Date.now()}`,
    type: SESSION_TYPE.SESSION,
    status: SESSION_STATUS.SCHEDULED,
    startTime: new Date('2027-08-01T09:00:00.000Z'),
    endTime: new Date('2027-08-01T10:00:00.000Z'),
    room: 'Hall A',
    track: 'AI',
    capacity: 100,
    ...overrides,
  });
}

describe('T-6.1–6.4: Attendee Features (Registrations, Sessions, Bookmarks, Reminders)', () => {
  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);

    // Clean test slate
    await User.deleteMany({ email: /@attendee-test\.test$/ });
    await Expo.deleteMany({});
    await Session.deleteMany({});
    await ExpoRegistration.deleteMany({});
    await SessionEngagement.deleteMany({});

    adminToken = await seedAdmin();
    const a1 = await registerAttendee('1');
    attendee1Token = a1.token;
    attendee1Id = a1.userId;

    const a2 = await registerAttendee('2');
    attendee2Token = a2.token;
    attendee2Id = a2.userId;

    const pub = await seedExpo({ status: EXPO_STATUS.PUBLISHED });
    publishedExpoId = pub._id.toString();

    const dft = await seedExpo({ status: EXPO_STATUS.DRAFT });
    draftExpoId = dft._id.toString();
  });

  beforeEach(async () => {
    // Clear registrations and engagements between tests
    await ExpoRegistration.deleteMany({});
    await SessionEngagement.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@attendee-test\.test$/ });
    await Expo.deleteMany({});
    await Session.deleteMany({});
    await ExpoRegistration.deleteMany({});
    await SessionEngagement.deleteMany({});
    await disconnectDb();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-6.1: Expo Registration
  // ──────────────────────────────────────────────────────────────────────────

  describe('T-6.1: Expo Registration', () => {
    it('attendee registers for published expo → 201 with ticketCode', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.ticketCode).toMatch(/^TKT-[A-F0-9]{6}-[A-Z0-9]+$/);
      expect(res.body.data.expo).toBe(publishedExpoId);
      expect(res.body.data.user).toBe(attendee1Id);
    });

    it('idempotent: re-registering returns 200 with existing ticketCode', async () => {
      // First registration
      const r1 = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r1.status).toBe(201);
      const ticket1 = r1.body.data.ticketCode;

      // Second registration attempt
      const r2 = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r2.status).toBe(200);
      expect(r2.body.data.ticketCode).toBe(ticket1);
    });

    it('unauthenticated request → 401', async () => {
      const res = await request(server).post(`/api/v1/expos/${publishedExpoId}/register`);
      expect(res.status).toBe(401);
    });

    it('registering for draft expo → 403', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(403);
    });

    it('registering for non-existent expo → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/v1/expos/${fakeId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(404);
    });

    it('GET /api/v1/expos/me/registrations lists user registrations', async () => {
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      const res = await request(server)
        .get('/api/v1/expos/me/registrations')
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].expo.title).toBeDefined();
      expect(res.body.data[0].ticketCode).toBeDefined();
      expect(res.body.meta.total).toBe(1);
    });

    it('GET /api/v1/expos/:id/registration checks specific registration status', async () => {
      // Before registration
      const r1 = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/registration`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r1.status).toBe(200);
      expect(r1.body.data.registered).toBe(false);

      // Register
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // After registration
      const r2 = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/registration`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r2.status).toBe(200);
      expect(r2.body.data.registered).toBe(true);
      expect(r2.body.data.ticketCode).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-6.2: Session Registration (BR-7, Capacity, Time Overlap)
  // ──────────────────────────────────────────────────────────────────────────

  describe('T-6.2: Session Registration', () => {
    let sessionA;

    beforeEach(async () => {
      sessionA = await seedSession(publishedExpoId, {
        title: 'Session A',
        startTime: new Date('2027-08-01T09:00:00.000Z'),
        endTime: new Date('2027-08-01T10:00:00.000Z'),
        capacity: 1, // Only 1 seat to test capacity
      });
    });

    it('user CANNOT register for session without expo registration (BR-7) → 403', async () => {
      const res = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/register for the expo before/i);
    });

    it('user registers for session after registering for expo → 201', async () => {
      // 1. Register for expo
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // 2. Register for session
      const res = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.kind).toBe(ENGAGEMENT_KIND.REGISTERED);
      expect(res.body.data.session).toBe(sessionA._id.toString());
    });

    it('idempotent: re-registering for session returns 200 with existing engagement', async () => {
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      const r1 = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r1.status).toBe(201);

      const r2 = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r2.status).toBe(200);
      expect(r2.body.data.id).toBe(r1.body.data.id);
    });

    it('capacity enforcement: rejects registration once capacity is full → 409', async () => {
      // Attendee 1 registers
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Attendee 2 registers for expo
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      // Attendee 2 tries to register for sessionA (capacity = 1, already taken)
      const res = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/maximum capacity/i);
    });

    it('time conflict check: prevents double-booking overlapping sessions in same expo → 409', async () => {
      const sessionB = await seedSession(publishedExpoId, {
        title: 'Overlapping Session B',
        startTime: new Date('2027-08-01T09:30:00.000Z'), // Overlaps with sessionA (09:00 - 10:00)
        endTime: new Date('2027-08-01T10:30:00.000Z'),
        capacity: 50,
      });

      // Register for expo
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Register for Session A (09:00 - 10:00)
      const rA = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(rA.status).toBe(201);

      // Attempt to register for Session B (09:30 - 10:30)
      const rB = await request(server)
        .post(`/api/v1/sessions/${sessionB._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(rB.status).toBe(409);
      expect(rB.body.error.message).toMatch(/Time conflict/i);
      expect(rB.body.error.message).toMatch(/Session A/i);
    });

    it('cannot register for a cancelled session → 403', async () => {
      const cancelledSess = await seedSession(publishedExpoId, {
        title: 'Cancelled Keynote',
        status: SESSION_STATUS.CANCELLED,
      });

      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      const res = await request(server)
        .post(`/api/v1/sessions/${cancelledSess._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(403);
    });

    it('unregister from session → 204, seat is freed', async () => {
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Unregister
      const unreg = await request(server)
        .delete(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(unreg.status).toBe(204);

      // Now attendee 2 can take the freed seat!
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);
      const r2 = await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);
      expect(r2.status).toBe(201);
    });

    it('BR-8: session hard delete is blocked if registrations exist → 409', async () => {
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionA._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Admin tries to delete sessionA
      const delRes = await request(server)
        .delete(`/api/v1/sessions/${sessionA._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(409);
      expect(delRes.body.error.message).toMatch(/attendees are already registered/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-6.3: Bookmarks & My Agenda
  // ──────────────────────────────────────────────────────────────────────────

  describe('T-6.3: Bookmarks & My Agenda', () => {
    let sessionX, sessionY;

    beforeEach(async () => {
      sessionX = await seedSession(publishedExpoId, { title: 'Session X' });
      sessionY = await seedSession(publishedExpoId, { title: 'Session Y' });
    });

    it('user bookmarks a session without needing expo registration → 201', async () => {
      const res = await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.kind).toBe(ENGAGEMENT_KIND.BOOKMARK);
      expect(res.body.data.session).toBe(sessionX._id.toString());
    });

    it('idempotent bookmark → 200', async () => {
      const r1 = await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r1.status).toBe(201);

      const r2 = await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(r2.status).toBe(200);
    });

    it('unbookmark session → 204', async () => {
      await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionX._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      expect(res.status).toBe(204);
    });

    it('GET /api/v1/sessions/me returns combined agenda (registrations + bookmarks)', async () => {
      // 1. Register for expo + sessionX
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // 2. Bookmark sessionY
      await request(server)
        .post(`/api/v1/sessions/${sessionY._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // 3. Fetch agenda
      const res = await request(server)
        .get('/api/v1/sessions/me')
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);

      const kinds = res.body.data.map((d) => d.kind);
      expect(kinds).toContain('registered');
      expect(kinds).toContain('bookmark');

      // Populated session
      expect(res.body.data[0].session.title).toBeDefined();
    });

    it('filter agenda by kind', async () => {
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionX._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${sessionY._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      const res = await request(server)
        .get('/api/v1/sessions/me?kind=registered')
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kind).toBe('registered');
      expect(res.body.data[0].session.title).toBe('Session X');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-6.4: Reminder Background Job
  // ──────────────────────────────────────────────────────────────────────────

  describe('T-6.4: Reminder Background Runner', () => {
    it('dispatches reminders for sessions within lead window and stamps reminderSentAt', async () => {
      const now = new Date();
      // Session starting in 10 minutes (within default 15m window)
      const startingSoon = await seedSession(publishedExpoId, {
        title: 'Starting Soon Keynote',
        startTime: new Date(now.getTime() + 10 * 60 * 1000),
        endTime: new Date(now.getTime() + 70 * 60 * 1000),
      });

      // Session starting tomorrow (outside window)
      const startingLater = await seedSession(publishedExpoId, {
        title: 'Starting Later Session',
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 25 * 60 * 60 * 1000),
      });

      // Register for startingSoon
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);
      await request(server)
        .post(`/api/v1/sessions/${startingSoon._id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Bookmark startingLater
      await request(server)
        .post(`/api/v1/sessions/${startingLater._id}/bookmark`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      // Run reminder job
      const result = await attendeeService.runSessionReminders({ leadMinutes: 15 });

      expect(result.matchedSessions).toBe(1);
      expect(result.processedReminders).toBe(1);

      // Verify engagement has reminderSentAt set
      const engagement = await SessionEngagement.findOne({
        user: attendee1Id,
        session: startingSoon._id,
      });
      expect(engagement.reminderSentAt).not.toBeNull();

      // Running job again does NOT re-send already-sent reminders (idempotent)
      const rerun = await attendeeService.runSessionReminders({ leadMinutes: 15 });
      expect(rerun.processedReminders).toBe(0);
    });

    it('admin endpoint triggers reminder run → 200', async () => {
      const res = await request(server)
        .post('/api/v1/admin/reminders/run')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.processedReminders).toBeDefined();
    });
  });
});
