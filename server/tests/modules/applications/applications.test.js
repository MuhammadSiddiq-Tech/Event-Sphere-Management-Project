/**
 * @fileoverview Integration tests for Applications & ExhibitorProfile endpoints.
 * T-4.1 (ExhibitorProfile CRUD), T-4.2 (public search), T-4.3 (Application model),
 * T-4.4 (submit/list/withdraw), T-4.5 (admin list/filter), T-4.6 (approve/reject in tx).
 * FR-EXP-01/02/08, FR-ATT-03/04, FR-EXH-01/02.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { Booth } from '../../../src/models/booth.model.js';
import { Application } from '../../../src/models/application.model.js';
import { ExhibitorProfile } from '../../../src/models/exhibitorProfile.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { APPLICATION_STATUS, EXPO_STATUS, BOOTH_STATUS } from '../../../src/config/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let server;
let adminToken, adminId;
let exhibitorToken, exhibitorId;
let exhibitor2Token, exhibitor2Id;
let publishedExpoId;
let draftExpoId;
let availableBoothId;

async function seedAdmin() {
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@app-test.test',
    passwordHash: await bcrypt.hash('Admin@1234!', 12),
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  adminId = admin._id.toString();
  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@app-test.test', password: 'Admin@1234!' });
  return login.body.data.accessToken;
}

async function registerExhibitor(suffix = '1') {
  const email = `exhibitor${suffix}@app-test.test`;
  const reg = await request(server)
    .post('/api/v1/auth/register')
    .send({
      name: `Exhibitor ${suffix}`,
      email,
      password: 'Password123!',
      role: 'exhibitor',
      privacyAccepted: true,
    });
  if (reg.status === 201) {
    return { token: reg.body.data.accessToken, userId: reg.body.data.user.id };
  }
  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email, password: 'Password123!' });
  return { token: login.body.data.accessToken, userId: login.body.data.user.id };
}

async function seedExpo(overrides = {}) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  return Expo.create({
    title: `Test Expo ${ts}`,
    slug: `test-expo-${ts}`,
    description: 'Test expo for applications',
    theme: 'Technology',
    status: EXPO_STATUS.PUBLISHED,
    startDate: new Date('2027-01-10'),
    endDate: new Date('2027-01-12'),
    venue: { name: 'Hall A', address: '1 Expo Rd', city: 'Testville', country: 'US' },
    floorPlan: { width: 500, height: 400, gridSize: 10 },
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

async function seedBooth(expoId, overrides = {}) {
  return Booth.create({
    expo: expoId,
    code: `B-${Date.now()}`,
    size: 'medium',
    price: 1000,
    status: BOOTH_STATUS.AVAILABLE,
    geometry: { x: 10, y: 10, w: 50, h: 50 },
    ...overrides,
  });
}

// ─── Main test suite ──────────────────────────────────────────────────────────

describe('T-4.1–4.6: ExhibitorProfile & Applications', () => {
  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);

    // Clean slate
    await User.deleteMany({ email: /@app-test\.test$/ });
    await ExhibitorProfile.deleteMany({});
    await Application.deleteMany({});
    await Expo.deleteMany({});
    await Booth.deleteMany({});

    // Seed users
    adminToken = await seedAdmin();
    const e1 = await registerExhibitor('1');
    exhibitorToken = e1.token;
    exhibitorId = e1.userId;
    const e2 = await registerExhibitor('2');
    exhibitor2Token = e2.token;
    exhibitor2Id = e2.userId;

    // Seed expos
    const pubExpo = await seedExpo({ status: EXPO_STATUS.PUBLISHED });
    publishedExpoId = pubExpo._id.toString();
    const draftExpo = await seedExpo({ status: EXPO_STATUS.DRAFT });
    draftExpoId = draftExpo._id.toString();

    // Seed a booth for approve-with-booth tests
    const booth = await seedBooth(publishedExpoId);
    availableBoothId = booth._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@app-test\.test$/ });
    await ExhibitorProfile.deleteMany({});
    await Application.deleteMany({});
    await Expo.deleteMany({});
    await Booth.deleteMany({});
    await disconnectDb();
  });

  beforeEach(async () => {
    // Clean applications between tests that need a fresh state
    await Application.deleteMany({});
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T-4.1: ExhibitorProfile CRUD
  // ─────────────────────────────────────────────────────────────────────────────
  describe('T-4.1: ExhibitorProfile CRUD', () => {
    afterEach(async () => {
      await ExhibitorProfile.deleteMany({});
    });

    it('GET /api/v1/exhibitors/me → 404 when no profile exists', async () => {
      const res = await request(server)
        .get('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /api/v1/exhibitors/me → 401 without auth', async () => {
      const res = await request(server).get('/api/v1/exhibitors/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/exhibitors/me → 403 for non-exhibitor (admin)', async () => {
      const res = await request(server)
        .get('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('PUT /api/v1/exhibitors/me → creates profile (upsert)', async () => {
      const payload = {
        companyName: 'Acme Corp',
        description: 'Leading tech company',
        website: 'https://acme.example.com',
        category: 'technology',
        products: ['Product A', 'Product B'],
        socialLinks: { linkedin: 'https://linkedin.com/company/acme' },
      };

      const res = await request(server)
        .put('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Acme Corp');
      expect(res.body.data.category).toBe('technology');
      expect(res.body.data.products).toEqual(['Product A', 'Product B']);
    });

    it('PUT /api/v1/exhibitors/me → updates existing profile', async () => {
      // Create first
      await request(server)
        .put('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ companyName: 'Old Name' });

      // Update
      const res = await request(server)
        .put('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ companyName: 'New Name', description: 'Updated desc' });

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('New Name');
    });

    it('GET /api/v1/exhibitors/me → returns created profile', async () => {
      await request(server)
        .put('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ companyName: 'Visible Corp' });

      const res = await request(server)
        .get('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Visible Corp');
    });

    it('PUT /api/v1/exhibitors/me → 400 when companyName missing', async () => {
      const res = await request(server)
        .put('/api/v1/exhibitors/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ description: 'No name provided' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T-4.2: Public Exhibitor Search
  // ─────────────────────────────────────────────────────────────────────────────
  describe('T-4.2: Public exhibitor search', () => {
    beforeAll(async () => {
      await ExhibitorProfile.deleteMany({});
      // Create profiles for search tests
      await ExhibitorProfile.create([
        { user: new mongoose.Types.ObjectId(), companyName: 'TechVision Ltd', category: 'technology', description: 'AI and ML solutions' },
        { user: new mongoose.Types.ObjectId(), companyName: 'HealthFirst Inc', category: 'healthcare', description: 'Healthcare innovations' },
        { user: new mongoose.Types.ObjectId(), companyName: 'RetailPro Corp', category: 'retail', description: 'Retail solutions provider' },
      ]);
    });

    afterAll(async () => {
      await ExhibitorProfile.deleteMany({});
    });

    it('GET /api/v1/exhibitors → returns paginated list (public, no auth)', async () => {
      const res = await request(server).get('/api/v1/exhibitors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/v1/exhibitors?category=technology → filters by category', async () => {
      const res = await request(server).get('/api/v1/exhibitors?category=technology');
      expect(res.status).toBe(200);
      expect(res.body.data.every((p) => p.category === 'technology')).toBe(true);
    });

    it('GET /api/v1/exhibitors → public DTO strips sensitive fields', async () => {
      const res = await request(server).get('/api/v1/exhibitors');
      expect(res.status).toBe(200);
      // Public DTO should not include documents
      res.body.data.forEach((p) => {
        expect(p.documents).toBeUndefined();
      });
    });

    it('GET /api/v1/exhibitors/:userId → returns public profile', async () => {
      const profile = await ExhibitorProfile.findOne({ companyName: 'TechVision Ltd' });
      const res = await request(server).get(`/api/v1/exhibitors/${profile.user}`);
      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('TechVision Ltd');
    });

    it('GET /api/v1/exhibitors/:userId → 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server).get(`/api/v1/exhibitors/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T-4.4: Application Submit / List / Withdraw
  // ─────────────────────────────────────────────────────────────────────────────
  describe('T-4.4: Application submit / list / withdraw', () => {
    it('POST /api/v1/expos/:id/applications → 201 submit to published expo', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ boothPreferences: [{ size: 'medium', notes: 'Corner booth preferred' }] });

      expect(res.status).toBe(201);
      expect(res.body.data.expo).toBe(publishedExpoId);
      expect(res.body.data.status).toBe(APPLICATION_STATUS.PENDING);
    });

    it('POST /api/v1/expos/:id/applications → 409 on duplicate application', async () => {
      // First application
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});

      // Second attempt — same exhibitor, same expo
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/expos/:id/applications → 403 for draft expo', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${draftExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/expos/:id/applications → 401 without auth', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .send({});
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/expos/:id/applications → 403 for non-exhibitor (admin)', async () => {
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/applications/mine → lists own applications', async () => {
      // Submit an application first
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});

      const res = await request(server)
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
    });

    it('GET /api/v1/expos/:id/applications/mine → returns specific expo application', async () => {
      // Submit first
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});

      const res = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/applications/mine`)
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.expo).toBeDefined();
    });

    it('GET /api/v1/expos/:id/applications/mine → 404 when no application exists', async () => {
      const res = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/applications/mine`)
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(404);
    });

    it('DELETE /api/v1/applications/:id → 200 withdraw pending application', async () => {
      // Submit
      const submit = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});
      const appId = submit.body.data.id ?? submit.body.data._id;

      const res = await request(server)
        .delete(`/api/v1/applications/${appId}`)
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(APPLICATION_STATUS.WITHDRAWN);
    });

    it('DELETE /api/v1/applications/:id → 403 when withdrawing another exhibitor\'s application', async () => {
      // Exhibitor 1 submits
      const submit = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});
      const appId = submit.body.data.id ?? submit.body.data._id;

      // Exhibitor 2 tries to withdraw
      const res = await request(server)
        .delete(`/api/v1/applications/${appId}`)
        .set('Authorization', `Bearer ${exhibitor2Token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T-4.5: Admin List/Filter Applications
  // ─────────────────────────────────────────────────────────────────────────────
  describe('T-4.5: Admin list/filter applications', () => {
    beforeEach(async () => {
      // Submit applications for both exhibitors
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});
      await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitor2Token}`)
        .send({});
    });

    it('GET /api/v1/expos/:id/applications → admin lists all for expo', async () => {
      const res = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('GET /api/v1/expos/:id/applications?status=pending → filters by status', async () => {
      const res = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/applications?status=pending`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((a) => a.status === 'pending')).toBe(true);
    });

    it('GET /api/v1/expos/:id/applications → 403 for non-admin (exhibitor)', async () => {
      const res = await request(server)
        .get(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/applications → admin lists all applications across expos', async () => {
      const res = await request(server)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('GET /api/v1/applications → 403 for non-admin', async () => {
      const res = await request(server)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${exhibitorToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/expos/:id/applications → 404 for non-existent expo', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .get(`/api/v1/expos/${fakeId}/applications`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // T-4.6: Review Endpoints (Approve / Reject — transactional)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('T-4.6: Admin review — approve/reject', () => {
    let applicationId;

    beforeEach(async () => {
      // Submit a fresh application
      const res = await request(server)
        .post(`/api/v1/expos/${publishedExpoId}/applications`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});
      applicationId = res.body.data.id ?? res.body.data._id;
    });

    it('POST /api/v1/applications/:id/approve → 200 approves pending application', async () => {
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reviewNote: 'Welcome aboard!' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(APPLICATION_STATUS.APPROVED);
      expect(res.body.data.reviewedBy).toBeDefined();
      expect(res.body.data.reviewedAt).toBeDefined();
    });

    it('POST /api/v1/applications/:id/approve → assigns booth and marks allocated', async () => {
      // Reset the booth
      await Booth.findByIdAndUpdate(availableBoothId, { status: BOOTH_STATUS.AVAILABLE, assignedTo: null });

      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ boothId: availableBoothId });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(APPLICATION_STATUS.APPROVED);
      expect(res.body.data.assignedBooth).toBeTruthy();

      // Verify booth is now allocated in DB
      const booth = await Booth.findById(availableBoothId);
      expect(booth.status).toBe(BOOTH_STATUS.ALLOCATED);
    });

    it('POST /api/v1/applications/:id/approve → 403 on already-approved application', async () => {
      // First approval
      await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Second approval attempt
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/applications/:id/approve → 403 for non-admin', async () => {
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('POST /api/v1/applications/:id/reject → 200 rejects with reason', async () => {
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Application incomplete' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(APPLICATION_STATUS.REJECTED);
      expect(res.body.data.rejectionReason).toBe('Application incomplete');
      expect(res.body.data.reviewedBy).toBeDefined();
    });

    it('POST /api/v1/applications/:id/reject → 400 without reason', async () => {
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/applications/:id/reject → 403 on already-rejected application', async () => {
      // First rejection
      await request(server)
        .post(`/api/v1/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'First rejection' });

      // Second rejection attempt
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Another rejection' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/applications/:id/reject → 403 for non-admin', async () => {
      const res = await request(server)
        .post(`/api/v1/applications/${applicationId}/reject`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ reason: 'Trying to self-reject' });
      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/applications/:id → 403 when withdrawing non-pending (approved)', async () => {
      // Approve first
      await request(server)
        .post(`/api/v1/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Try to withdraw
      const res = await request(server)
        .delete(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/applications/:id/approve → 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/v1/applications/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(404);
    });

    it('POST /api/v1/applications/:id/reject → 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(server)
        .post(`/api/v1/applications/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Does not exist' });
      expect(res.status).toBe(404);
    });
  });
});
