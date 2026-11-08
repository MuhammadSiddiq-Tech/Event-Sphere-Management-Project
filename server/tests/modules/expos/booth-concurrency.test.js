/**
 * @fileoverview Concurrency Integration Tests for Booth Reservation.
 * T-3.8. Rule 6.4 ("MUST include a concurrency test for booth reservation:
 * N parallel requests -> exactly 1 success, rest 409").
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
import { EXPO_STATUS, BOOTH_STATUS, APPLICATION_STATUS, ROLES } from '../../../src/config/constants.js';
import { generateAccessToken } from '../../../src/utils/tokens.js';

describe('T-3.8: Concurrency Tests for Booth Reservation (Rule 6.4)', () => {
  let server;
  let adminId;
  let expo;

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);
    adminId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Expo.deleteMany({});
    await Booth.deleteMany({});
    await Application.deleteMany({});

    expo = await Expo.create({
      title: 'High-Concurrency Tech Expo 2026',
      slug: `conc-expo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdBy: adminId,
      status: EXPO_STATUS.PUBLISHED,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-05'),
      venue: { city: 'Berlin', country: 'Germany' },
    });
  });

  /**
   * Helper to create N exhibitors with valid JWT tokens and approved applications.
   * @param {number} count
   * @param {string} prefix
   * @returns {Promise<Array<{ user: Object, token: string, app: Object }>>}
   */
  async function createExhibitorsWithApprovedApplications(count, prefix = 'conc') {
    const userDocs = [];
    for (let i = 0; i < count; i++) {
      userDocs.push({
        name: `Exhibitor ${prefix} ${i}`,
        email: `${prefix}-exhibitor-${i}-${Date.now()}@test.local`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        role: ROLES.EXHIBITOR,
        consent: {
          privacyAccepted: true,
          acceptedAt: new Date(),
        },
      });
    }

    const insertedUsers = await User.insertMany(userDocs);

    const appDocs = insertedUsers.map((u) => ({
      expo: expo._id,
      exhibitor: u._id,
      status: APPLICATION_STATUS.APPROVED,
    }));
    const insertedApps = await Application.insertMany(appDocs);

    return insertedUsers.map((user, idx) => ({
      user,
      userId: user._id.toString(),
      token: generateAccessToken({ id: user._id.toString(), role: user.role }),
      app: insertedApps[idx],
    }));
  }

  describe('N Parallel Reserves on Single Available Booth', () => {
    it('N = 10 parallel requests -> exactly 1 success (200), 9 conflicts (409) (Rule 6.4)', async () => {
      const N = 10;
      const exhibitors = await createExhibitorsWithApprovedApplications(N, 'n10');

      const booth = await Booth.create({
        expo: expo._id,
        code: 'A-10',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      // Fire N concurrent reservation requests simultaneously
      const parallelRequests = exhibitors.map((ex) =>
        request(server)
          .post(`/api/v1/booths/${booth._id}/reserve`)
          .set('Authorization', `Bearer ${ex.token}`)
          .send({})
      );

      const responses = await Promise.all(parallelRequests);

      // Verify response status codes
      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);
      const errors = responses.filter((r) => r.status !== 200 && r.status !== 409);

      expect(errors).toHaveLength(0);
      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(N - 1);

      // Verify the single winning response
      const winnerResponse = successes[0];
      expect(winnerResponse.body.success).toBe(true);
      expect(winnerResponse.body.data.status).toBe(BOOTH_STATUS.RESERVED);
      expect(winnerResponse.body.data.reservedBy).toBeDefined();
      const winningUserId = winnerResponse.body.data.reservedBy;

      // Verify all losing responses are clean 409 Conflict
      for (const conflictRes of conflicts) {
        expect(conflictRes.body.success).toBe(false);
        expect(conflictRes.body.error).toBeDefined();
        expect(conflictRes.body.error.code).toBe('CONFLICT');
        expect(conflictRes.body.error.message).toMatch(/reserved|no longer available/i);
      }

      // Verify MongoDB Booth document state
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.RESERVED);
      expect(dbBooth.reservedBy.toString()).toBe(winningUserId);
      expect(dbBooth.reservedAt).toBeInstanceOf(Date);

      // Verify MongoDB Application state: exactly 1 application holds assignedBooth
      const assignedApps = await Application.find({
        expo: expo._id,
        assignedBooth: booth._id,
      });
      expect(assignedApps).toHaveLength(1);
      expect(assignedApps[0].exhibitor.toString()).toBe(winningUserId);

      // Remaining N - 1 applications must have no booth assigned
      const unassignedApps = await Application.find({
        expo: expo._id,
        assignedBooth: null,
      });
      expect(unassignedApps).toHaveLength(N - 1);
    });

    it('N = 25 parallel requests under high contention -> exactly 1 success (200), 24 conflicts (409)', async () => {
      const N = 25;
      const exhibitors = await createExhibitorsWithApprovedApplications(N, 'n25');

      const booth = await Booth.create({
        expo: expo._id,
        code: 'A-25',
        geometry: { x: 5, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const parallelRequests = exhibitors.map((ex) =>
        request(server)
          .post(`/api/v1/booths/${booth._id}/reserve`)
          .set('Authorization', `Bearer ${ex.token}`)
          .send({})
      );

      const responses = await Promise.all(parallelRequests);

      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(N - 1);

      const winningUserId = successes[0].body.data.reservedBy;
      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.RESERVED);
      expect(dbBooth.reservedBy.toString()).toBe(winningUserId);
    });
  });

  describe('Parallel Reservations Across Multiple Booths Simultaneously', () => {
    it('simultaneous race on 2 distinct booths (10 competitors each) -> 1 winner per booth, 18 conflicts', async () => {
      const N_PER_BOOTH = 10;
      const exhibitorsBooth1 = await createExhibitorsWithApprovedApplications(N_PER_BOOTH, 'b1');
      const exhibitorsBooth2 = await createExhibitorsWithApprovedApplications(N_PER_BOOTH, 'b2');

      const booth1 = await Booth.create({
        expo: expo._id,
        code: 'MULTI-01',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const booth2 = await Booth.create({
        expo: expo._id,
        code: 'MULTI-02',
        geometry: { x: 3, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      // 20 requests fired simultaneously
      const reqs1 = exhibitorsBooth1.map((ex) =>
        request(server)
          .post(`/api/v1/booths/${booth1._id}/reserve`)
          .set('Authorization', `Bearer ${ex.token}`)
          .send({})
      );

      const reqs2 = exhibitorsBooth2.map((ex) =>
        request(server)
          .post(`/api/v1/booths/${booth2._id}/reserve`)
          .set('Authorization', `Bearer ${ex.token}`)
          .send({})
      );

      const allResponses = await Promise.all([...reqs1, ...reqs2]);

      const successes = allResponses.filter((r) => r.status === 200);
      const conflicts = allResponses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(2);
      expect(conflicts).toHaveLength(18);

      const winnerIds = successes.map((s) => s.body.data.reservedBy);
      // The winners must be distinct exhibitors
      expect(winnerIds[0]).not.toBe(winnerIds[1]);

      // DB check
      const dbB1 = await Booth.findById(booth1._id);
      const dbB2 = await Booth.findById(booth2._id);
      expect(dbB1.status).toBe(BOOTH_STATUS.RESERVED);
      expect(dbB2.status).toBe(BOOTH_STATUS.RESERVED);
      expect(winnerIds).toContain(dbB1.reservedBy.toString());
      expect(winnerIds).toContain(dbB2.reservedBy.toString());
    });
  });

  describe('Nested Route Concurrency', () => {
    it('N = 6 parallel requests via /api/v1/expos/:id/booths/:boothId/reserve -> 1 success, 5 conflicts', async () => {
      const N = 6;
      const exhibitors = await createExhibitorsWithApprovedApplications(N, 'nested');

      const booth = await Booth.create({
        expo: expo._id,
        code: 'NEST-01',
        geometry: { x: 0, y: 4, w: 2, h: 2 },
        status: BOOTH_STATUS.AVAILABLE,
      });

      const parallelRequests = exhibitors.map((ex) =>
        request(server)
          .post(`/api/v1/expos/${expo._id}/booths/${booth._id}/reserve`)
          .set('Authorization', `Bearer ${ex.token}`)
          .send({})
      );

      const responses = await Promise.all(parallelRequests);

      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(N - 1);

      const dbBooth = await Booth.findById(booth._id);
      expect(dbBooth.status).toBe(BOOTH_STATUS.RESERVED);
      expect(dbBooth.reservedBy.toString()).toBe(successes[0].body.data.reservedBy);
    });
  });
});
