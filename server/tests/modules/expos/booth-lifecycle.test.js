/**
 * @fileoverview Integration tests for Booth Lifecycle: Assign, Unassign, Release, and Details.
 * T-3.7. FR-EXH-03, FR-EXP-05, BR-4, BR-5.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { Booth } from '../../../src/models/booth.model.js';
import { Application } from '../../../src/models/application.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { EXPO_STATUS, BOOTH_STATUS, APPLICATION_STATUS } from '../../../src/config/constants.js';

describe('T-3.7: Booth Lifecycle (Assign, Unassign, Release, Details)', () => {
  let server;
  let adminId;
  let adminToken;
  let exhibitor1Id;
  let exhibitor1Token;
  let exhibitor2Id;
  let exhibitor2Token;
  let attendeeToken;
  let publishedExpo;

  async function registerUser(name, email, role) {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        role,
        privacyAccepted: true,
      });

    const user = res.body.data.user;
    return {
      userId: user.id || user._id,
      token: res.body.data.accessToken,
    };
  }

  async function seedAdmin() {
    const bcrypt = (await import('bcryptjs')).default;
    const admin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@lifecycle.test',
      passwordHash: await bcrypt.hash('Admin@1234!', 12),
      role: 'admin',
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });
    adminId = admin._id.toString();

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@lifecycle.test', password: 'Admin@1234!' });

    return login.body.data.accessToken;
  }

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);

    await User.deleteMany({});
    adminToken = await seedAdmin();

    const ex1 = await registerUser('Exhibitor A', 'exhibitorA@lifecycle.test', 'exhibitor');
    exhibitor1Id = ex1.userId;
    exhibitor1Token = ex1.token;

    const ex2 = await registerUser('Exhibitor B', 'exhibitorB@lifecycle.test', 'exhibitor');
    exhibitor2Id = ex2.userId;
    exhibitor2Token = ex2.token;

    const att = await registerUser('Attendee A', 'attendeeA@lifecycle.test', 'attendee');
    attendeeToken = att.token;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await Expo.deleteMany({});
    await Booth.deleteMany({});
    await Application.deleteMany({});

    publishedExpo = await Expo.create({
      title: 'Expo 2026',
      slug: `expo-${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(adminId),
      status: EXPO_STATUS.PUBLISHED,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-05'),
      venue: { city: 'Berlin', country: 'Germany' },
    });
  });

  // ─── 1. Booth Assign (Admin) ──────────────────────────────────────────────────

  describe('POST /api/v1/booths/:id/assign — Admin Booth Assignment', () => {
    it('admin successfully assigns an available booth to an exhibitor', async () => {
      const app = await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitor1Id,
        status: APPLICATION_STATUS.PENDING,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ASN-1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ exhibitorId: exhibitor1Id });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.ALLOCATED);
      expect(res.body.data.assignedTo).toBe(exhibitor1Id);
      expect(res.body.data.assignedAt).toBeDefined();

      // Check DB booth
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.ALLOCATED);
      expect(dbBooth.assignedTo.toString()).toBe(exhibitor1Id);

      // Check Application synced & approved
      const dbApp = await Application.findById(app._id);
      expect(dbApp.status).toBe(APPLICATION_STATUS.APPROVED);
      expect(dbApp.assignedBooth.toString()).toBe(booth._id.toString());
    });

    it('works via nested route /api/v1/expos/:id/booths/:boothId/assign', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ASN-NEST',
        geometry: { x: 3, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpo._id}/booths/${booth._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ exhibitorId: exhibitor1Id });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.ALLOCATED);
    });

    it('returns 409 when exhibitor already holds a booth in the same expo (Rule BR-4)', async () => {
      // Exhibitor already holds booth 1
      await Booth.create({
        expo: publishedExpo._id,
        code: 'HELD-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.ALLOCATED,
        assignedTo: exhibitor1Id,
      });

      // Try assigning booth 2
      const booth2 = await Booth.create({
        expo: publishedExpo._id,
        code: 'TRY-2',
        geometry: { x: 2, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth2._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ exhibitorId: exhibitor1Id });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already holds a booth/i);
    });

    it('returns 409 when attempting to assign a BLOCKED booth', async () => {
      const blockedBooth = await Booth.create({
        expo: publishedExpo._id,
        code: 'BLK-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.BLOCKED,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${blockedBooth._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ exhibitorId: exhibitor1Id });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/cannot assign a blocked booth/i);
    });

    it('returns 404 when target user is not found or is not an exhibitor', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ASN-BADUSER',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ exhibitorId: fakeId.toString() });

      expect(res.status).toBe(404);
    });

    it('returns 403 when non-admin attempts to assign a booth', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ASN-NOAUTH',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/assign`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({ exhibitorId: exhibitor2Id });

      expect(res.status).toBe(403);
    });
  });

  // ─── 2. Booth Unassign (Admin) ────────────────────────────────────────────────

  describe('POST /api/v1/booths/:id/unassign — Admin Booth Unassignment', () => {
    it('admin successfully unassigns an allocated booth back to available', async () => {
      const app = await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitor1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'UNASN-1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.ALLOCATED,
        assignedTo: exhibitor1Id,
        assignedAt: new Date(),
      });
      app.assignedBooth = booth._id;
      await app.save();

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.AVAILABLE);
      expect(res.body.data.assignedTo).toBeNull();
      expect(res.body.data.assignedAt).toBeNull();

      // Check Application unlinked
      const dbApp = await Application.findById(app._id);
      expect(dbApp.assignedBooth).toBeNull();
    });

    it('returns 409 when booth is already AVAILABLE', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'UNASN-AVAIL',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/not currently allocated or reserved/i);
    });

    it('returns 403 when non-admin attempts to unassign', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'UNASN-NOAUTH',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.ALLOCATED,
        assignedTo: exhibitor1Id,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/unassign`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. Booth Release (Exhibitor-holder or Admin) ──────────────────────────────

  describe('POST /api/v1/booths/:id/release — Booth Release', () => {
    it('exhibitor successfully releases their own reserved booth', async () => {
      const app = await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitor1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'REL-1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
        reservedAt: new Date(),
        details: { showcase: 'Custom showcase', products: ['Product 1'], staff: [] },
      });
      app.assignedBooth = booth._id;
      await app.save();

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/release`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.AVAILABLE);
      expect(res.body.data.reservedBy).toBeNull();
      expect(res.body.data.details.showcase).toBe('');

      // DB verification
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.AVAILABLE);

      // App unlinked
      const dbApp = await Application.findById(app._id);
      expect(dbApp.assignedBooth).toBeNull();
    });

    it('returns 403 when exhibitor attempts to release another exhibitor booth', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'REL-OTHER',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/release`)
        .set('Authorization', `Bearer ${exhibitor2Token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/do not have permission to release/i);
    });

    it('admin can release any booth', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'REL-ADMIN',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/release`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.AVAILABLE);
    });

    it('returns 409 when booth is already AVAILABLE', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'REL-AVAIL',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/release`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already available/i);
    });
  });

  // ─── 4. Booth Detail Edit (Exhibitor-holder) ───────────────────────────────────

  describe('PATCH /api/v1/booths/:id/details — Exhibitor Booth Details (FR-EXP-05)', () => {
    it('exhibitor holder successfully updates showcase, products, and staff info', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'DET-1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const detailsPayload = {
        showcase: 'Showcasing our next-generation cloud AI platform and hardware devices.',
        products: ['AI Cloud Engine', 'Edge TPU Device', 'Neural Accelerator'],
        staff: [
          { name: 'Dr. Jane Smith', email: 'jane@smith.test', title: 'Chief Scientist' },
          { name: 'Bob Johnson', phone: '+1234567890', title: 'Solutions Architect' },
        ],
      };

      const res = await request(server)
        .patch(`/api/v1/booths/${booth._id}/details`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send(detailsPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.details.showcase).toBe(detailsPayload.showcase);
      expect(res.body.data.details.products).toEqual(detailsPayload.products);
      expect(res.body.data.details.staff.length).toBe(2);
      expect(res.body.data.details.staff[0].name).toBe('Dr. Jane Smith');

      // Verify DB persistence
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.details.showcase).toBe(detailsPayload.showcase);
      expect(dbBooth.details.products.length).toBe(3);
      expect(dbBooth.details.staff[0].title).toBe('Chief Scientist');
    });

    it('works via nested route /api/v1/expos/:id/booths/:boothId/details', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'DET-NEST',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.ALLOCATED,
        assignedTo: exhibitor1Id,
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${publishedExpo._id}/booths/${booth._id}/details`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({ showcase: 'Nested route showcase' });

      expect(res.status).toBe(200);
      expect(res.body.data.details.showcase).toBe('Nested route showcase');
    });

    it('returns 403 when another exhibitor tries to edit details (FR-EXP-05)', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'DET-NOAUTH',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const res = await request(server)
        .patch(`/api/v1/booths/${booth._id}/details`)
        .set('Authorization', `Bearer ${exhibitor2Token}`)
        .send({ showcase: 'Malicious modification' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/only the exhibitor who holds this booth/i);
    });

    it('returns 400 when body has no fields', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'DET-EMPTY',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const res = await request(server)
        .patch(`/api/v1/booths/${booth._id}/details`)
        .set('Authorization', `Bearer ${exhibitor1Token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when Authorization header is missing', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'DET-UNAUTH',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitor1Id,
      });

      const res = await request(server)
        .patch(`/api/v1/booths/${booth._id}/details`)
        .send({ showcase: 'No auth' });

      expect(res.status).toBe(401);
    });
  });
});
