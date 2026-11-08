/**
 * @fileoverview Integration tests for Booth endpoints.
 * Covers T-3.4 (model) and T-3.5 (CRUD + bulk replace + overlap validation).
 * FR-EXPO-03.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { Booth } from '../../../src/models/booth.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { EXPO_STATUS, BOOTH_STATUS } from '../../../src/config/constants.js';

describe('T-3.4–3.5: Booth Endpoints', () => {
  let server;
  let adminToken;
  let exhibitorToken;
  let adminId;
  let draftExpoId;

  async function seedAdmin() {
    const bcrypt = (await import('bcryptjs')).default;
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@booth-test.test',
      passwordHash: await bcrypt.hash('Admin@1234!', 12),
      role: 'admin',
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });
    adminId = admin._id.toString();

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@booth-test.test', password: 'Admin@1234!' });

    return login.body.data.accessToken;
  }

  async function registerExhibitor() {
    const reg = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Exhibitor',
        email: 'exhibitor@booth-test.test',
        password: 'Password123!',
        role: 'exhibitor',
        privacyAccepted: true,
      });
    return reg.body.data.accessToken;
  }

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);
    await User.deleteMany({});
    adminToken = await seedAdmin();
    exhibitorToken = await registerExhibitor();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await Expo.deleteMany({});
    await Booth.deleteMany({});

    // Create a fresh DRAFT expo for each test
    const expo = await Expo.create({
      title: 'Test Expo For Booths',
      slug: `test-expo-${Date.now()}`,
      createdBy: new mongoose.Types.ObjectId(adminId),
      status: EXPO_STATUS.DRAFT,
    });
    draftExpoId = expo._id.toString();
  });

  // ─── POST /api/v1/expos/:id/booths ─────────────────────────────────────────

  describe('POST /api/v1/expos/:id/booths', () => {
    it('admin creates a booth in a DRAFT expo', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'A1',
          label: 'Corner Booth',
          size: 'large',
          pricePerDay: 500,
          geometry: { x: 0, y: 0, w: 3, h: 3 },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('A1');
      expect(res.body.data.status).toBe(BOOTH_STATUS.AVAILABLE);
      expect(res.body.data.geometry.w).toBe(3);
    });

    it('returns 409 on duplicate booth code within the same expo', async () => {
      await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'B1', geometry: { x: 0, y: 0, w: 1, h: 1 } });

      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'B1', geometry: { x: 5, y: 5, w: 1, h: 1 } });

      expect(res.status).toBe(409);
    });

    it('returns 409 on overlapping geometry', async () => {
      await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'C1', geometry: { x: 0, y: 0, w: 4, h: 4 } });

      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'C2', geometry: { x: 2, y: 2, w: 2, h: 2 } }); // overlaps C1

      expect(res.status).toBe(409);
    });

    it('returns 403 when adding booth to a non-DRAFT expo', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });

      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'D1', geometry: { x: 0, y: 0, w: 1, h: 1 } });

      expect(res.status).toBe(403);
    });

    it('returns 403 when exhibitor tries to create a booth', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ code: 'E1', geometry: { x: 0, y: 0, w: 1, h: 1 } });

      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid geometry (w = 0)', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'F1', geometry: { x: 0, y: 0, w: 0, h: 1 } });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/v1/expos/:id/booths ──────────────────────────────────────────

  describe('GET /api/v1/expos/:id/booths', () => {
    it('lists booths for a published expo without authentication', async () => {
      // Make expo published
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });

      await Booth.create([
        { expo: draftExpoId, code: 'G1', geometry: { x: 0, y: 0, w: 2, h: 2 } },
        { expo: draftExpoId, code: 'G2', geometry: { x: 3, y: 0, w: 2, h: 2 } },
      ]);

      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('returns 404 for booths on a DRAFT expo to public', async () => {
      // expo is still DRAFT (default from beforeEach)
      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths`);
      expect(res.status).toBe(404);
    });

    it('filters by status', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      await Booth.create([
        { expo: draftExpoId, code: 'H1', geometry: { x: 0, y: 0, w: 1, h: 1 }, status: BOOTH_STATUS.AVAILABLE },
        { expo: draftExpoId, code: 'H2', geometry: { x: 2, y: 0, w: 1, h: 1 }, status: BOOTH_STATUS.RESERVED },
      ]);

      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths?status=available`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((b) => b.status === BOOTH_STATUS.AVAILABLE)).toBe(true);
    });

    it('returns pagination meta', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths?page=1&limit=5`);
      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  // ─── GET /api/v1/expos/:id/booths/:boothId ─────────────────────────────────

  describe('GET /api/v1/expos/:id/booths/:boothId', () => {
    it('returns a single booth by ID for a published expo', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'J1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
      });

      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe('J1');
    });

    it('returns 404 for a non-existent booth', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server).get(`/api/v1/expos/${draftExpoId}/booths/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/v1/expos/:id/booths/:boothId ───────────────────────────────

  describe('PATCH /api/v1/expos/:id/booths/:boothId', () => {
    it('admin updates booth metadata in a DRAFT expo', async () => {
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'K1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Premium Booth', pricePerDay: 999 });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe('Premium Booth');
      expect(res.body.data.pricePerDay).toBe(999);
    });

    it('returns 403 when updating booth geometry on a non-DRAFT expo', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'L1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Modified' });

      expect(res.status).toBe(403);
    });

    it('returns 409 when new geometry overlaps existing booths', async () => {
      await Booth.create({
        expo: draftExpoId,
        code: 'M1',
        geometry: { x: 0, y: 0, w: 4, h: 4 },
      });
      const booth2 = await Booth.create({
        expo: draftExpoId,
        code: 'M2',
        geometry: { x: 5, y: 0, w: 2, h: 2 },
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${draftExpoId}/booths/${booth2._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ geometry: { x: 2, y: 2, w: 2, h: 2 } }); // overlaps M1

      expect(res.status).toBe(409);
    });
  });

  // ─── DELETE /api/v1/expos/:id/booths/:boothId ──────────────────────────────

  describe('DELETE /api/v1/expos/:id/booths/:boothId', () => {
    it('admin deletes an available booth from a DRAFT expo', async () => {
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'N1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
      const gone = await Booth.findById(booth._id);
      expect(gone).toBeNull();
    });

    it('returns 409 when deleting a RESERVED booth', async () => {
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'O1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 403 when deleting booth from non-DRAFT expo', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });
      const booth = await Booth.create({
        expo: draftExpoId,
        code: 'P1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${draftExpoId}/booths/${booth._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── PUT /api/v1/expos/:id/booths — Bulk Replace ───────────────────────────

  describe('PUT /api/v1/expos/:id/booths — T-3.5 Bulk Replace', () => {
    it('atomically replaces all booths with a valid floor plan', async () => {
      // Create some existing booths first
      await Booth.create([
        { expo: draftExpoId, code: 'OLD1', geometry: { x: 0, y: 0, w: 1, h: 1 } },
        { expo: draftExpoId, code: 'OLD2', geometry: { x: 2, y: 0, w: 1, h: 1 } },
      ]);

      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booths: [
            { code: 'NEW1', geometry: { x: 0, y: 0, w: 2, h: 2 }, label: 'First', pricePerDay: 100 },
            { code: 'NEW2', geometry: { x: 3, y: 0, w: 2, h: 2 }, label: 'Second', pricePerDay: 200 },
            { code: 'NEW3', geometry: { x: 0, y: 3, w: 2, h: 2 }, label: 'Third', pricePerDay: 150 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.created).toBe(3);
      expect(res.body.data.booths.length).toBe(3);

      // Old booths should be gone
      const oldBooth = await Booth.findOne({ expo: draftExpoId, code: 'OLD1' });
      expect(oldBooth).toBeNull();

      // New booths should exist
      const newBooth = await Booth.findOne({ expo: draftExpoId, code: 'NEW1' });
      expect(newBooth).not.toBeNull();
      expect(newBooth.pricePerDay).toBe(100);
    });

    it('clears all booths when empty array is provided', async () => {
      await Booth.create([
        { expo: draftExpoId, code: 'CLR1', geometry: { x: 0, y: 0, w: 1, h: 1 } },
      ]);

      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ booths: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.created).toBe(0);

      const count = await Booth.countDocuments({ expo: draftExpoId });
      expect(count).toBe(0);
    });

    it('returns 409 on duplicate booth codes in the same request', async () => {
      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booths: [
            { code: 'DUP1', geometry: { x: 0, y: 0, w: 1, h: 1 } },
            { code: 'DUP1', geometry: { x: 5, y: 5, w: 1, h: 1 } }, // duplicate code
          ],
        });

      expect(res.status).toBe(409);
    });

    it('returns 409 on overlapping booth geometries within the request', async () => {
      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          booths: [
            { code: 'OVL1', geometry: { x: 0, y: 0, w: 4, h: 4 } },
            { code: 'OVL2', geometry: { x: 2, y: 2, w: 4, h: 4 } }, // overlaps OVL1
          ],
        });

      expect(res.status).toBe(409);
    });

    it('returns 403 on non-DRAFT expos', async () => {
      await Expo.findByIdAndUpdate(draftExpoId, { status: EXPO_STATUS.PUBLISHED });

      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ booths: [{ code: 'X1', geometry: { x: 0, y: 0, w: 1, h: 1 } }] });

      expect(res.status).toBe(403);
    });

    it('returns 409 when reserved booths exist and cannot be replaced', async () => {
      await Booth.create({
        expo: draftExpoId,
        code: 'ACTIVE1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
      });

      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ booths: [{ code: 'NEW1', geometry: { x: 5, y: 5, w: 1, h: 1 } }] });

      expect(res.status).toBe(409);
    });

    it('returns 400 when booths is not an array', async () => {
      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ booths: 'not-an-array' });

      expect(res.status).toBe(400);
    });

    it('returns 403 when exhibitor tries bulk replace', async () => {
      const res = await request(server)
        .put(`/api/v1/expos/${draftExpoId}/booths`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ booths: [] });

      expect(res.status).toBe(403);
    });
  });
});
