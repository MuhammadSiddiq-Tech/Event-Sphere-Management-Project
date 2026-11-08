/**
 * @fileoverview Integration tests for Atomic Booth Reservation.
 * T-3.6. FR-EXP-04, Rules BR-3, BR-4, §3.3.5.
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

describe('T-3.6: Atomic Booth Reservation', () => {
  let server;
  let adminId;
  let exhibitorUser1;
  let exhibitorUser1Id;
  let exhibitorToken1;
  let exhibitorUser2;
  let exhibitorUser2Id;
  let exhibitorToken2;
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
      user,
      userId: user.id || user._id,
      token: res.body.data.accessToken,
    };
  }

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);
    adminId = new mongoose.Types.ObjectId();

    await User.deleteMany({});
    const ex1 = await registerUser('Exhibitor One', 'exhibitor1@reserve.test', 'exhibitor');
    exhibitorUser1 = ex1.user;
    exhibitorUser1Id = ex1.userId;
    exhibitorToken1 = ex1.token;

    const ex2 = await registerUser('Exhibitor Two', 'exhibitor2@reserve.test', 'exhibitor');
    exhibitorUser2 = ex2.user;
    exhibitorUser2Id = ex2.userId;
    exhibitorToken2 = ex2.token;

    const att = await registerUser('Attendee User', 'attendee@reserve.test', 'attendee');
    attendeeToken = att.token;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await Expo.deleteMany({});
    await Booth.deleteMany({});
    await Application.deleteMany({});

    // Create a standard published expo for testing reservations
    publishedExpo = await Expo.create({
      title: 'Global Tech Expo 2026',
      slug: `global-tech-${Date.now()}`,
      createdBy: adminId,
      status: EXPO_STATUS.PUBLISHED,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-05'),
      venue: { city: 'Dubai', country: 'UAE' },
    });
  });

  describe('Happy Path Reservation', () => {
    it('approved exhibitor successfully reserves an available booth via /api/v1/booths/:id/reserve', async () => {
      // Setup approved application (Rule BR-3)
      const app = await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'A-101',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BOOTH_STATUS.RESERVED);
      expect(res.body.data.reservedBy).toBe(exhibitorUser1Id);
      expect(res.body.data.reservedAt).toBeDefined();

      // Verify DB state
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.RESERVED);
      expect(dbBooth.reservedBy.toString()).toBe(exhibitorUser1Id);

      // Verify Application assignedBooth is linked
      const updatedApp = await Application.findById(app._id);
      expect(updatedApp.assignedBooth.toString()).toBe(booth._id.toString());
    });

    it('works via nested route /api/v1/expos/:id/booths/:boothId/reserve', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'A-102',
        geometry: { x: 5, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpo._id}/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.RESERVED);
    });
  });

  describe('Rule BR-3: Approved Application Requirement', () => {
    it('returns 403 when exhibitor has NO application for the expo', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'B-101',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/approved application/i);
    });

    it('returns 403 when exhibitor application is still PENDING', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.PENDING,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'B-102',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/approved application/i);
    });

    it('returns 403 when exhibitor application was REJECTED', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.REJECTED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'B-103',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('Rule BR-4: Max 1 Booth Per Exhibitor Per Expo', () => {
    it('returns 409 when exhibitor already holds a reserved booth in the same expo', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      // Existing held booth
      await Booth.create({
        expo: publishedExpo._id,
        code: 'HELD-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitorUser1Id,
      });

      // Attempt to reserve a second booth
      const targetBooth = await Booth.create({
        expo: publishedExpo._id,
        code: 'SECOND-1',
        geometry: { x: 2, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${targetBooth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/already hold a booth/i);
    });

    it('allows exhibitor to hold booths in different expos', async () => {
      const secondExpo = await Expo.create({
        title: 'Second Expo 2026',
        slug: `second-expo-${Date.now()}`,
        createdBy: adminId,
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        venue: { city: 'Riyadh' },
      });

      // Held booth in first expo
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });
      await Booth.create({
        expo: publishedExpo._id,
        code: 'EXPO1-B1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitorUser1Id,
      });

      // Approved application in second expo
      await Application.create({
        expo: secondExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });
      const boothInSecondExpo = await Booth.create({
        expo: secondExpo._id,
        code: 'EXPO2-B1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${boothInSecondExpo._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOTH_STATUS.RESERVED);
    });
  });

  describe('Non-available Booth States & Conflict (409)', () => {
    it('returns 409 when booth is already RESERVED', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser2Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ALREADY-RES',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
        reservedBy: exhibitorUser1Id,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken2}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/no longer available/i);
    });

    it('returns 409 when booth is ALLOCATED or BLOCKED', async () => {
      await Application.create({
        expo: publishedExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const blockedBooth = await Booth.create({
        expo: publishedExpo._id,
        code: 'BLOCKED-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.BLOCKED,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${blockedBooth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(409);
    });
  });

  describe('Expo Status & Role Guards', () => {
    it('returns 403 when expo is in DRAFT status', async () => {
      const draftExpo = await Expo.create({
        title: 'Draft Expo',
        slug: `draft-expo-${Date.now()}`,
        createdBy: adminId,
        status: EXPO_STATUS.DRAFT,
      });

      await Application.create({
        expo: draftExpo._id,
        exhibitor: exhibitorUser1Id,
        status: APPLICATION_STATUS.APPROVED,
      });

      const booth = await Booth.create({
        expo: draftExpo._id,
        code: 'DRAFT-B1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/published or ongoing/i);
    });

    it('returns 401 when Authorization header is missing', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'NOAUTH-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('returns 403 when attendee attempts to reserve a booth', async () => {
      const booth = await Booth.create({
        expo: publishedExpo._id,
        code: 'ATT-1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const res = await request(server)
        .post(`/api/v1/booths/${booth._id}/reserve`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('returns 404 when booth ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .post(`/api/v1/booths/${nonExistentId}/reserve`)
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('returns 400 when booth ID is not a valid ObjectId', async () => {
      const res = await request(server)
        .post('/api/v1/booths/invalid-id/reserve')
        .set('Authorization', `Bearer ${exhibitorToken1}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
