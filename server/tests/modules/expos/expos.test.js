/**
 * @fileoverview Integration tests for Expo endpoints.
 * Covers T-3.1 (model), T-3.2 (CRUD + publish/unpublish + public list/detail), T-3.3 (delete rules).
 * FR-EXPO-01/02, BR-2.
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

describe('T-3.1–3.3: Expo Endpoints', () => {
  let server;
  let adminToken;
  let exhibitorToken;
  let adminId;

  /**
   * Register a user and return an access token.
   */
  async function registerAndLogin(role = 'attendee', suffix = '') {
    const email = `${role}${suffix}@expo-test.test`;
    const reg = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: `${role} User`,
        email,
        password: 'Password123!',
        role,
        privacyAccepted: true,
      });

    if (reg.status !== 201) {
      // Try logging in if already registered
      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      return login.body.data.accessToken;
    }
    return reg.body.data.accessToken;
  }

  /**
   * Seed an admin directly into the DB (can't register admin via API — BR-1).
   */
  async function seedAdmin() {
    const bcrypt = (await import('bcryptjs')).default;
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@expo-test.test',
      passwordHash: await bcrypt.hash('Admin@1234!', 12),
      role: 'admin',
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });
    adminId = admin._id.toString();

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@expo-test.test', password: 'Admin@1234!' });

    return login.body.data.accessToken;
  }

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);
    await User.deleteMany({});
    adminToken = await seedAdmin();
    exhibitorToken = await registerAndLogin('exhibitor', '1');
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await Expo.deleteMany({});
    await Booth.deleteMany({});
  });

  // ─── POST /api/v1/expos ───────────────────────────────────────────────────

  describe('POST /api/v1/expos', () => {
    it('admin creates a DRAFT expo successfully', async () => {
      const res = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tech Innovate 2026',
          description: 'The biggest tech expo in Pakistan',
          category: 'Technology',
          startDate: '2026-09-01T09:00:00.000Z',
          endDate: '2026-09-03T18:00:00.000Z',
          venue: { city: 'Karachi', country: 'Pakistan' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Tech Innovate 2026');
      expect(res.body.data.status).toBe(EXPO_STATUS.DRAFT);
      expect(res.body.data.slug).toMatch(/^tech-innovate-2026-/);
      expect(res.body.data.createdBy).toBe(adminId);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(server)
        .post('/api/v1/expos')
        .send({ title: 'Unauthorized Expo' });

      expect(res.status).toBe(401);
    });

    it('returns 403 when exhibitor tries to create an expo', async () => {
      const res = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ title: 'Exhibitor Expo Attempt' });

      expect(res.status).toBe(403);
    });

    it('returns 400 when title is too short', async () => {
      const res = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'AB' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when endDate is before startDate', async () => {
      const res = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bad Date Expo',
          startDate: '2026-09-05T09:00:00.000Z',
          endDate: '2026-09-01T18:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/v1/expos ────────────────────────────────────────────────────

  describe('GET /api/v1/expos', () => {
    it('lists only published/ongoing/completed expos to public', async () => {
      // Create one DRAFT (should not appear) and one PUBLISHED
      const adminRes = await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Draft Expo',
          venue: { city: 'Karachi' },
          startDate: '2026-09-01T09:00:00.000Z',
          endDate: '2026-09-03T18:00:00.000Z',
        });
      const draftId = adminRes.body.data._id;

      // Update directly to published
      await Expo.findByIdAndUpdate(draftId, {
        status: EXPO_STATUS.PUBLISHED,
        publishedAt: new Date(),
      });

      await request(server)
        .post('/api/v1/expos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Still Draft Expo' });

      const res = await request(server).get('/api/v1/expos');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Should only see the published one
      const titles = res.body.data.map((e) => e.title);
      expect(titles).toContain('Draft Expo');
      expect(titles).not.toContain('Still Draft Expo');
    });

    it('returns pagination meta', async () => {
      const res = await request(server).get('/api/v1/expos?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(typeof res.body.meta.total).toBe('number');
    });

    it('filters by category', async () => {
      await Expo.create({
        title: 'Technology Expo 2026',
        slug: 'technology-expo-2026-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        category: 'Technology',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      await Expo.create({
        title: 'Food Expo 2026',
        slug: 'food-expo-2026-xyz',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        category: 'Food',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Lahore' },
      });

      const res = await request(server).get('/api/v1/expos?category=Technology');
      expect(res.status).toBe(200);
      const titles = res.body.data.map((e) => e.title);
      expect(titles).toContain('Technology Expo 2026');
      expect(titles).not.toContain('Food Expo 2026');
    });

    it('returns 400 on invalid sort value', async () => {
      const res = await request(server).get('/api/v1/expos?sort=invalid_field');
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/v1/expos/:id ────────────────────────────────────────────────

  describe('GET /api/v1/expos/:id', () => {
    it('returns a published expo by ID to public', async () => {
      const expo = await Expo.create({
        title: 'Public Expo',
        slug: 'public-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server).get(`/api/v1/expos/${expo._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Public Expo');
    });

    it('returns 404 for a DRAFT expo to public', async () => {
      const expo = await Expo.create({
        title: 'Hidden Draft',
        slug: 'hidden-draft-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
      });

      const res = await request(server).get(`/api/v1/expos/${expo._id}`);
      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid MongoDB ID', async () => {
      const res = await request(server).get('/api/v1/expos/not-a-valid-id');
      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server).get(`/api/v1/expos/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/v1/expos/slug/:slug ────────────────────────────────────────

  describe('GET /api/v1/expos/slug/:slug', () => {
    it('returns a published expo by slug', async () => {
      await Expo.create({
        title: 'Slug Expo',
        slug: 'slug-expo-aaa',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server).get('/api/v1/expos/slug/slug-expo-aaa');
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('slug-expo-aaa');
    });

    it('returns 404 for a draft expo by slug', async () => {
      await Expo.create({
        title: 'Draft Slug Expo',
        slug: 'draft-slug-expo-bbb',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
      });

      const res = await request(server).get('/api/v1/expos/slug/draft-slug-expo-bbb');
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/v1/expos/:id ──────────────────────────────────────────────

  describe('PATCH /api/v1/expos/:id', () => {
    it('admin updates expo metadata successfully', async () => {
      const expo = await Expo.create({
        title: 'Updatable Expo',
        slug: 'updatable-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Expo Title', category: 'Health' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Expo Title');
      expect(res.body.data.category).toBe('Health');
    });

    it('returns 403 when exhibitor tries to update', async () => {
      const expo = await Expo.create({
        title: 'Non-Owner Expo',
        slug: 'non-owner-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
      });

      const res = await request(server)
        .patch(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /api/v1/expos/:id/publish ──────────────────────────────────────

  describe('POST /api/v1/expos/:id/publish', () => {
    it('publishes a DRAFT expo that meets BR-2 requirements', async () => {
      const expo = await Expo.create({
        title: 'Publishable Expo',
        slug: 'publishable-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EXPO_STATUS.PUBLISHED);
      expect(res.body.data.publishedAt).toBeDefined();
    });

    it('returns 409 when publishing an already published expo', async () => {
      const expo = await Expo.create({
        title: 'Already Published Expo',
        slug: 'already-published-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 409 when publishing an expo without dates (BR-2)', async () => {
      const expo = await Expo.create({
        title: 'No Date Expo',
        slug: 'no-date-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 409 when publishing without venue city (BR-2)', async () => {
      const expo = await Expo.create({
        title: 'No Venue Expo',
        slug: 'no-venue-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });
  });

  // ─── POST /api/v1/expos/:id/unpublish ────────────────────────────────────

  describe('POST /api/v1/expos/:id/unpublish', () => {
    it('unpublishes a PUBLISHED expo with no active booths', async () => {
      const expo = await Expo.create({
        title: 'Unpublishable Expo',
        slug: 'unpublishable-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EXPO_STATUS.DRAFT);
    });

    it('returns 409 when unpublishing a DRAFT expo', async () => {
      const expo = await Expo.create({
        title: 'Draft Expo For Unpublish',
        slug: 'draft-expo-unpublish-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 409 when unpublishing with reserved booths', async () => {
      const expo = await Expo.create({
        title: 'Reserved Booths Expo',
        slug: 'reserved-booths-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      await Booth.create({
        expo: expo._id,
        code: 'A1',
        geometry: { x: 0, y: 0, w: 2, h: 2 },
        status: BOOTH_STATUS.RESERVED,
      });

      const res = await request(server)
        .post(`/api/v1/expos/${expo._id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });
  });

  // ─── DELETE /api/v1/expos/:id (T-3.3) ────────────────────────────────────

  describe('DELETE /api/v1/expos/:id — T-3.3 Delete Rules', () => {
    it('hard-deletes a DRAFT expo (and its booths)', async () => {
      const expo = await Expo.create({
        title: 'Draft to Delete',
        slug: 'draft-to-delete-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
      });

      await Booth.create({
        expo: expo._id,
        code: 'D1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const stillExists = await Expo.findById(expo._id);
      expect(stillExists).toBeNull();

      const boothsExist = await Booth.countDocuments({ expo: expo._id });
      expect(boothsExist).toBe(0);
    });

    it('soft-deletes a PUBLISHED expo with no reserved booths', async () => {
      const expo = await Expo.create({
        title: 'Published No Reservations',
        slug: 'published-no-res-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Should still be in DB (soft-delete), just marked isDeleted
      const found = await Expo.findById(expo._id);
      expect(found.isDeleted).toBe(true);
      expect(found.deletedAt).toBeDefined();
    });

    it('returns 409 when deleting a PUBLISHED expo with reserved booths (T-3.3)', async () => {
      const expo = await Expo.create({
        title: 'Published With Reservations',
        slug: 'published-with-res-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      await Booth.create({
        expo: expo._id,
        code: 'R1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: BOOTH_STATUS.RESERVED,
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('returns 403 when deleting an ONGOING expo', async () => {
      const expo = await Expo.create({
        title: 'Ongoing Expo',
        slug: 'ongoing-expo-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.ONGOING,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-03'),
        venue: { city: 'Karachi' },
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent expo', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .delete(`/api/v1/expos/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('returns 403 when exhibitor tries to delete', async () => {
      const expo = await Expo.create({
        title: 'Exhibitor Delete Attempt',
        slug: 'exhibitor-delete-abc',
        createdBy: new mongoose.Types.ObjectId(adminId),
        status: EXPO_STATUS.DRAFT,
      });

      const res = await request(server)
        .delete(`/api/v1/expos/${expo._id}`)
        .set('Authorization', `Bearer ${exhibitorToken}`);

      expect(res.status).toBe(403);
    });
  });
});
