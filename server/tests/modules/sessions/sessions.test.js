/**
 * @fileoverview Integration tests for Sessions endpoints.
 * T-5.1 (Session model), T-5.2 (CRUD + no-overlap), T-5.3 (update/cancel flow),
 * T-5.4 (public schedule with filters). FR-SCH-01/02, BR-6.
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
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { EXPO_STATUS, SESSION_TYPE, SESSION_STATUS } from '../../../src/config/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let server;
let adminToken, adminId;
let attendeeToken;
let expoId;

// Expo date range: sessions must fall within these dates
const EXPO_START = '2027-06-01T00:00:00.000Z';
const EXPO_END   = '2027-06-05T23:59:59.000Z';

async function seedAdmin() {
  const hash = await bcrypt.hash('Admin@1234!', 12);
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@sessions-test.test',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  adminId = admin._id.toString();
  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@sessions-test.test', password: 'Admin@1234!' });
  return login.body.data.accessToken;
}

async function registerAttendee() {
  const res = await request(server)
    .post('/api/v1/auth/register')
    .send({
      name: 'Attendee',
      email: 'attendee@sessions-test.test',
      password: 'Password123!',
      role: 'attendee',
      privacyAccepted: true,
    });
  return res.body.data.accessToken;
}

async function seedExpo(overrides = {}) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  return Expo.create({
    title: `Sessions Expo ${ts}`,
    slug: `sessions-expo-${ts}`,
    description: 'Expo for session tests',
    theme: 'Technology',
    status: EXPO_STATUS.PUBLISHED,
    startDate: new Date(EXPO_START),
    endDate: new Date(EXPO_END),
    venue: { name: 'Hall A', address: '1 Expo Rd', city: 'Testville', country: 'US' },
    floorPlan: { width: 500, height: 400, gridSize: 10 },
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

/** Build a valid create-session payload. */
function sessionPayload(overrides = {}) {
  return {
    title: 'Opening Keynote',
    type: SESSION_TYPE.KEYNOTE,
    startTime: '2027-06-01T09:00:00.000Z',
    endTime: '2027-06-01T10:00:00.000Z',
    room: 'Main Hall',
    track: 'Innovation',
    capacity: 500,
    speakers: [{ name: 'Jane Doe', org: 'TechCorp' }],
    tags: ['ai', 'keynote'],
    ...overrides,
  };
}

// ─── Main suite ───────────────────────────────────────────────────────────────

describe('T-5.1–5.4: Sessions', () => {
  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);

    // Clean slate
    await User.deleteMany({ email: /@sessions-test\.test$/ });
    await Expo.deleteMany({});
    await Session.deleteMany({});

    adminToken = await seedAdmin();
    attendeeToken = await registerAttendee();

    const expo = await seedExpo();
    expoId = expo._id.toString();
  });

  beforeEach(async () => {
    // Clear sessions between tests for isolation
    await Session.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@sessions-test\.test$/ });
    await Expo.deleteMany({});
    await Session.deleteMany({});
    await disconnectDb();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.2: Create
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/expos/:id/sessions', () => {
    it('admin creates a session → 201 with correct shape', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload());

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: 'Opening Keynote',
        type: SESSION_TYPE.KEYNOTE,
        status: SESSION_STATUS.SCHEDULED,
        room: 'Main Hall',
        track: 'Innovation',
        capacity: 500,
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.expo).toBeDefined();
      expect(res.body.data.speakers).toHaveLength(1);
    });

    it('requires admin role — attendee gets 403', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send(sessionPayload());

      expect(res.status).toBe(403);
    });

    it('requires auth — unauthenticated gets 401', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .send(sessionPayload());

      expect(res.status).toBe(401);
    });

    it('endTime <= startTime → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            startTime: '2027-06-01T10:00:00.000Z',
            endTime: '2027-06-01T09:00:00.000Z',
          })
        );

      expect(res.status).toBe(400);
    });

    it('endTime = startTime → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T09:00:00.000Z',
          })
        );

      expect(res.status).toBe(400);
    });

    it('startTime before expo start → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            startTime: '2027-05-31T09:00:00.000Z',
            endTime: '2027-05-31T10:00:00.000Z',
          })
        );

      expect(res.status).toBe(400);
    });

    it('endTime after expo end → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            startTime: '2027-06-05T22:00:00.000Z',
            endTime: '2027-06-06T01:00:00.000Z',
          })
        );

      expect(res.status).toBe(400);
    });

    it('expo not found → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/v1/expos/${fakeId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload());

      expect(res.status).toBe(404);
    });

    it('missing required field (title) → 400', async () => {
      const payload = sessionPayload();
      delete payload.title;
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('invalid type enum → 400', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ type: 'concert' }));

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.2: Room overlap validation (BR-6)
  // ──────────────────────────────────────────────────────────────────────────

  describe('Room overlap check (BR-6)', () => {
    it('same room, overlapping times → 409 with conflict message', async () => {
      // Create first session
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'First Session',
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:30:00.000Z',
            room: 'Room A',
          })
        );

      // Try to create overlapping session in same room
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Overlapping Session',
            startTime: '2027-06-01T10:00:00.000Z',
            endTime: '2027-06-01T11:00:00.000Z',
            room: 'Room A',
          })
        );

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/Room A/);
      expect(res.body.error.message).toMatch(/First Session/);
    });

    it('same room, non-overlapping times → 201', async () => {
      // Create first session: 09:00–10:00
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Morning Session',
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:00:00.000Z',
            room: 'Room B',
          })
        );

      // Create back-to-back session: 10:00–11:00 (starts exactly when first ends)
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Afternoon Session',
            startTime: '2027-06-01T10:00:00.000Z',
            endTime: '2027-06-01T11:00:00.000Z',
            room: 'Room B',
          })
        );

      expect(res.status).toBe(201);
    });

    it('different rooms, overlapping times → 201 (no conflict)', async () => {
      // Session in Room C
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session in C',
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:30:00.000Z',
            room: 'Room C',
          })
        );

      // Session in Room D (same time, different room)
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session in D',
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:30:00.000Z',
            room: 'Room D',
          })
        );

      expect(res.status).toBe(201);
    });

    it('cancelled session does not block same room slot', async () => {
      // Create and then cancel a session
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session to Cancel',
            startTime: '2027-06-02T09:00:00.000Z',
            endTime: '2027-06-02T10:00:00.000Z',
            room: 'Room E',
          })
        );
      const sessionId = created.body.data.id;

      await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'Speaker cancelled' });

      // Now create another session in the same room+time — should succeed
      const res = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Replacement Session',
            startTime: '2027-06-02T09:00:00.000Z',
            endTime: '2027-06-02T10:00:00.000Z',
            room: 'Room E',
          })
        );

      expect(res.status).toBe(201);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.2: Get single session
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/sessions/:id', () => {
    it('returns a session by ID (public)', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload());
      const sessionId = created.body.data.id;

      const res = await request(server).get(`/api/v1/sessions/${sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(sessionId);
      expect(res.body.data.title).toBe('Opening Keynote');
    });

    it('non-existent session → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server).get(`/api/v1/sessions/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.4: Public list with filters
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/expos/:id/sessions (public, T-5.4)', () => {
    beforeEach(async () => {
      // Seed three sessions
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Keynote Day 1',
            type: SESSION_TYPE.KEYNOTE,
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:00:00.000Z',
            room: 'Main Hall',
            track: 'AI',
          })
        );
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Workshop Day 1',
            type: SESSION_TYPE.WORKSHOP,
            startTime: '2027-06-01T11:00:00.000Z',
            endTime: '2027-06-01T12:00:00.000Z',
            room: 'Lab 1',
            track: 'Hands-on',
          })
        );
      await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session Day 2',
            type: SESSION_TYPE.SESSION,
            startTime: '2027-06-02T09:00:00.000Z',
            endTime: '2027-06-02T10:00:00.000Z',
            room: 'Main Hall',
            track: 'AI',
          })
        );
    });

    it('lists all sessions (no filter) sorted by startTime ASC', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      // Verify ascending order
      const times = res.body.data.map((s) => new Date(s.startTime).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('no auth required (public endpoint)', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions`);
      expect(res.status).toBe(200);
    });

    it('filter by day', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions?day=2027-06-01`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((s) => {
        expect(s.startTime).toMatch(/2027-06-01/);
      });
    });

    it('filter by type', async () => {
      const res = await request(server).get(
        `/api/v1/expos/${expoId}/sessions?type=${SESSION_TYPE.WORKSHOP}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Workshop Day 1');
    });

    it('filter by room', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions?room=Lab+1`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].room).toBe('Lab 1');
    });

    it('filter by track', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions?track=AI`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('filter by status (default scheduled)', async () => {
      const res = await request(server).get(
        `/api/v1/expos/${expoId}/sessions?status=${SESSION_STATUS.SCHEDULED}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('pagination works', async () => {
      const res = await request(server).get(`/api/v1/expos/${expoId}/sessions?page=1&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pages).toBe(2);
    });

    it('expo not found → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server).get(`/api/v1/expos/${fakeId}/sessions`);
      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.3: Update flow
  // ──────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/sessions/:id', () => {
    it('admin updates a session → status becomes updated, reason stored', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'Original Title', room: 'Room F' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .patch(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', updatedReason: 'Speaker change' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.status).toBe(SESSION_STATUS.UPDATED);
      expect(res.body.data.updatedReason).toBe('Speaker change');
    });

    it('update with endTime <= startTime → 400', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ room: 'Room G' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .patch(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startTime: '2027-06-01T10:00:00.000Z',
          endTime: '2027-06-01T09:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });

    it('update would cause room overlap → 409', async () => {
      // Create two sessions in different rooms
      const s1 = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session H1',
            startTime: '2027-06-01T09:00:00.000Z',
            endTime: '2027-06-01T10:00:00.000Z',
            room: 'Room H',
          })
        );
      const s2 = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          sessionPayload({
            title: 'Session H2',
            startTime: '2027-06-01T10:30:00.000Z',
            endTime: '2027-06-01T11:30:00.000Z',
            room: 'Room I',
          })
        );

      // Try to move s2 into Room H overlapping s1
      const res = await request(server)
        .patch(`/api/v1/sessions/${s2.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          room: 'Room H',
          startTime: '2027-06-01T09:30:00.000Z',
          endTime: '2027-06-01T10:30:00.000Z',
        });

      expect(res.status).toBe(409);
    });

    it('cancelled session cannot be updated → 403', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'To Be Cancelled', room: 'Room J' }));
      const sessionId = created.body.data.id;

      await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'Cancelled' });

      const res = await request(server)
        .patch(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Should Fail' });

      expect(res.status).toBe(403);
    });

    it('non-admin cannot update → 403', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ room: 'Room K' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .patch(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ title: 'Should Fail' });

      expect(res.status).toBe(403);
    });

    it('non-existent session → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .patch(`/api/v1/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.3: Cancel flow
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/sessions/:id/cancel', () => {
    it('admin cancels a session → status = cancelled, reason stored', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'To Cancel' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'Venue unavailable' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SESSION_STATUS.CANCELLED);
      expect(res.body.data.cancelledReason).toBe('Venue unavailable');
    });

    it('cancelling an already cancelled session → 403', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'Double Cancel' }));
      const sessionId = created.body.data.id;

      await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'First cancel' });

      const res = await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'Second cancel' });

      expect(res.status).toBe(403);
    });

    it('missing cancelledReason → 400', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'No Reason' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('non-admin cannot cancel → 403', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'Protected Cancel' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ cancelledReason: 'Nope' });

      expect(res.status).toBe(403);
    });

    it('non-existent session → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/v1/sessions/${fakeId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-5.2: Delete
  // ──────────────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/sessions/:id', () => {
    it('admin deletes a scheduled session → 204', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'To Delete' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Confirm gone
      const getRes = await request(server).get(`/api/v1/sessions/${sessionId}`);
      expect(getRes.status).toBe(404);
    });

    it('admin deletes a cancelled session → 204 (allowed, no registrations)', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'Cancelled Then Deleted' }));
      const sessionId = created.body.data.id;

      await request(server)
        .post(`/api/v1/sessions/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelledReason: 'No speakers' });

      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });

    it('non-admin cannot delete → 403', async () => {
      const created = await request(server)
        .post(`/api/v1/expos/${expoId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sessionPayload({ title: 'Protected Delete' }));
      const sessionId = created.body.data.id;

      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
    });

    it('non-existent session → 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .delete(`/api/v1/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
