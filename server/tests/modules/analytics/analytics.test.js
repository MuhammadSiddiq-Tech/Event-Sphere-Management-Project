/**
 * @fileoverview Integration tests for Analytics module (T-8.1, T-8.3).
 * FR-ANA-01.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { AnalyticsEvent } from '../../../src/models/analyticsEvent.model.js';
import { ANALYTICS_EVENT_TYPE } from '../../../src/config/constants.js';
import { setIo } from '../../../src/sockets/emitter.js';

let server;
let adminUser, adminToken;
let attendeeUser, attendeeToken;
let testExpo;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);
  setIo({ to: () => ({ emit: () => {} }) });

  try { await AnalyticsEvent.collection.drop(); } catch {}
  await AnalyticsEvent.syncIndexes();
  await Expo.deleteMany({ slug: 'analytics-test-expo' });
  await User.deleteMany({
    email: { $in: ['analytics-admin@test.com', 'analytics-attendee@test.com'] },
  });

  const hash = await bcrypt.hash('Password123!', 12);

  adminUser = await User.create({
    name: 'Analytics Admin',
    email: 'analytics-admin@test.com',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  attendeeUser = await User.create({
    name: 'Analytics Attendee',
    email: 'analytics-attendee@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  testExpo = await Expo.create({
    title: 'Analytics Test Expo',
    slug: 'analytics-test-expo',
    description: 'Test expo for analytics',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-05'),
    status: 'published',
    createdBy: adminUser._id,
  });

  const resAdmin = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'analytics-admin@test.com', password: 'Password123!' });
  adminToken = resAdmin.body.data.accessToken;

  const resAttendee = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'analytics-attendee@test.com', password: 'Password123!' });
  attendeeToken = resAttendee.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await AnalyticsEvent.deleteMany({});
  if (testExpo?._id) {
    await Expo.deleteOne({ _id: testExpo._id });
  }
  await User.deleteMany({
    email: { $in: ['analytics-admin@test.com', 'analytics-attendee@test.com'] },
  });
  await disconnectDb();
});

beforeEach(async () => {
  await AnalyticsEvent.deleteMany({});
});

describe('Analytics Module (T-8.1, T-8.3)', () => {
  describe('POST /api/v1/analytics/events (Track Event)', () => {
    it('tracks a valid booth_view event', async () => {
      const boothId = new mongoose.Types.ObjectId().toString();

      const res = await request(server)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW,
          expoId: testExpo._id.toString(),
          target: boothId,
          targetModel: 'Booth',
        });

      expect(res.status).toBe(202);
      expect(res.body.data.tracked).toBe(true);

      const inDb = await AnalyticsEvent.findOne({ type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW });
      expect(inDb).not.toBeNull();
      expect(inDb.user.toString()).toBe(attendeeUser._id.toString());
    });

    it('deduplicates events in the same 10-minute window', async () => {
      const boothId = new mongoose.Types.ObjectId().toString();
      const payload = {
        type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW,
        expoId: testExpo._id.toString(),
        target: boothId,
        targetModel: 'Booth',
      };

      await request(server)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send(payload);

      // Second call same user+type+target in same window — should deduplicate silently
      const res = await request(server)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send(payload);

      expect(res.status).toBe(202);

      // Only 1 record in DB despite 2 calls
      const count = await AnalyticsEvent.countDocuments({ type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW });
      expect(count).toBe(1);
    });

    it('tracks a search event without target', async () => {
      const res = await request(server)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          type: ANALYTICS_EVENT_TYPE.SEARCH,
          expoId: testExpo._id.toString(),
          meta: { query: 'AI booths' },
        });

      expect(res.status).toBe(202);
    });

    it('rejects unauthenticated tracking with 401', async () => {
      const res = await request(server)
        .post('/api/v1/analytics/events')
        .send({ type: ANALYTICS_EVENT_TYPE.SEARCH });

      expect(res.status).toBe(401);
    });

    it('rejects invalid event type with 400', async () => {
      const res = await request(server)
        .post('/api/v1/analytics/events')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ type: 'invalid_type' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/expos/:expoId/kpis', () => {
    beforeEach(async () => {
      await AnalyticsEvent.insertMany([
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: attendeeUser._id, expo: testExpo._id },
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: adminUser._id, expo: testExpo._id },
        { type: ANALYTICS_EVENT_TYPE.SESSION_VIEW, user: attendeeUser._id, expo: testExpo._id },
        { type: ANALYTICS_EVENT_TYPE.SEARCH, user: attendeeUser._id, expo: testExpo._id },
      ]);
    });

    it('returns KPI summary for admin', async () => {
      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/kpis`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.boothViews).toBe(2);
      expect(res.body.data.sessionViews).toBe(1);
      expect(res.body.data.searches).toBe(1);
      expect(res.body.data.uniqueVisitors).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalEvents).toBe(4);
    });

    it('denies non-admin with 403', async () => {
      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/kpis`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/expos/:expoId/engagement', () => {
    it('returns engagement over time grouped by day and type', async () => {
      await AnalyticsEvent.insertMany([
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: attendeeUser._id, expo: testExpo._id },
        { type: ANALYTICS_EVENT_TYPE.SESSION_VIEW, user: attendeeUser._id, expo: testExpo._id },
      ]);

      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/engagement?days=7`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Each entry has date, type, count
      expect(res.body.data[0]).toHaveProperty('date');
      expect(res.body.data[0]).toHaveProperty('type');
      expect(res.body.data[0]).toHaveProperty('count');
    });
  });

  describe('GET /api/v1/analytics/expos/:expoId/booth-traffic', () => {
    it('returns top booths ranked by views', async () => {
      const boothIdA = new mongoose.Types.ObjectId();
      const boothIdB = new mongoose.Types.ObjectId();

      await AnalyticsEvent.insertMany([
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: attendeeUser._id, expo: testExpo._id, target: boothIdA, targetModel: 'Booth' },
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: adminUser._id, expo: testExpo._id, target: boothIdA, targetModel: 'Booth' },
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: attendeeUser._id, expo: testExpo._id, target: boothIdB, targetModel: 'Booth' },
      ]);

      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/booth-traffic?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // boothIdA has 2 views and should be first
      expect(res.body.data[0].views).toBeGreaterThanOrEqual(res.body.data[res.body.data.length - 1].views);
    });
  });

  describe('GET /api/v1/analytics/expos/:expoId/session-popularity', () => {
    it('returns sessions ranked by combined views + checkins', async () => {
      const sessionId = new mongoose.Types.ObjectId();

      await AnalyticsEvent.insertMany([
        { type: ANALYTICS_EVENT_TYPE.SESSION_VIEW, user: attendeeUser._id, expo: testExpo._id, target: sessionId, targetModel: 'Session' },
        { type: ANALYTICS_EVENT_TYPE.SESSION_CHECKIN, user: attendeeUser._id, expo: testExpo._id, target: sessionId, targetModel: 'Session' },
      ]);

      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/session-popularity`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('sessionId');
      expect(res.body.data[0]).toHaveProperty('views');
      expect(res.body.data[0]).toHaveProperty('checkins');
    });
  });

  describe('GET /api/v1/analytics/expos/:expoId/export.csv (T-8.6)', () => {
    it('exports analytics events as CSV', async () => {
      await AnalyticsEvent.insertMany([
        { type: ANALYTICS_EVENT_TYPE.SEARCH, user: attendeeUser._id, expo: testExpo._id, meta: { query: 'robotics' } },
        { type: ANALYTICS_EVENT_TYPE.BOOTH_VIEW, user: attendeeUser._id, expo: testExpo._id },
      ]);

      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/export.csv`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('id,type,user_id,user_email,expo_id,target_id,created_at');
      expect(res.text).toContain(ANALYTICS_EVENT_TYPE.SEARCH);
    });

    it('rejects non-admin with 403', async () => {
      const res = await request(server)
        .get(`/api/v1/analytics/expos/${testExpo._id}/export.csv`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
