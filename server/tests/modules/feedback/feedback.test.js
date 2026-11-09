/**
 * @fileoverview Integration & Unit tests for Feedback module (T-7.11).
 * FR-SYS-02, FR-ADM-01.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';
import { Feedback } from '../../../src/models/feedback.model.js';
import { FEEDBACK_CATEGORY, FEEDBACK_STATUS } from '../../../src/config/constants.js';

let server;
let adminUser, adminToken;
let attendeeUser, attendeeToken;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  const hash = await bcrypt.hash('Password123!', 12);

  adminUser = await User.create({
    name: 'Feedback Admin',
    email: 'feedback-admin@test.com',
    passwordHash: hash,
    role: 'admin',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  attendeeUser = await User.create({
    name: 'Feedback Attendee',
    email: 'feedback-attendee@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });

  const resAdmin = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'feedback-admin@test.com', password: 'Password123!' });
  adminToken = resAdmin.body.data.accessToken;

  const resAttendee = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'feedback-attendee@test.com', password: 'Password123!' });
  attendeeToken = resAttendee.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await Feedback.deleteMany({});
  await User.deleteMany({
    email: { $in: ['feedback-admin@test.com', 'feedback-attendee@test.com'] },
  });
  await disconnectDb();
});

beforeEach(async () => {
  await Feedback.deleteMany({});
});

describe('Feedback Module (T-7.11)', () => {
  describe('POST /api/v1/feedback (Submission)', () => {
    it('allows an authenticated user to submit valid feedback', async () => {
      const res = await request(server)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          category: FEEDBACK_CATEGORY.SUGGESTION,
          message: 'It would be great to have more seating in the main expo hall.',
          rating: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.category).toBe(FEEDBACK_CATEGORY.SUGGESTION);
      expect(res.body.data.message).toBe('It would be great to have more seating in the main expo hall.');
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.status).toBe(FEEDBACK_STATUS.OPEN);
      expect(res.body.data.id).toBeDefined();

      const inDb = await Feedback.findById(res.body.data.id);
      expect(inDb).not.toBeNull();
      expect(inDb.user.toString()).toBe(attendeeUser._id.toString());
    });

    it('rejects feedback with message shorter than 5 chars', async () => {
      const res = await request(server)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          category: FEEDBACK_CATEGORY.ISSUE,
          message: 'bad',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects feedback with invalid category', async () => {
      const res = await request(server)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          category: 'invalid_cat',
          message: 'Valid feedback message here.',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated submission with 401', async () => {
      const res = await request(server)
        .post('/api/v1/feedback')
        .send({
          category: FEEDBACK_CATEGORY.SUPPORT,
          message: 'Need help finding my booth tickets.',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/feedback (Admin triage listing)', () => {
    beforeEach(async () => {
      await Feedback.create([
        {
          user: attendeeUser._id,
          category: FEEDBACK_CATEGORY.SUGGESTION,
          message: 'Add dark mode to the application.',
          rating: 5,
          status: FEEDBACK_STATUS.OPEN,
        },
        {
          user: attendeeUser._id,
          category: FEEDBACK_CATEGORY.ISSUE,
          message: 'Floor plan zoom is slightly laggy on mobile.',
          status: FEEDBACK_STATUS.IN_REVIEW,
          adminNotes: 'Investigating Canvas redraws',
        },
        {
          user: attendeeUser._id,
          category: FEEDBACK_CATEGORY.SUPPORT,
          message: 'Cannot reset my notification settings.',
          status: FEEDBACK_STATUS.RESOLVED,
        },
      ]);
    });

    it('allows admin to list all feedback with pagination', async () => {
      const res = await request(server)
        .get('/api/v1/feedback?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(3);
      expect(res.body.data[0].user.name).toBe('Feedback Attendee');
    });

    it('supports filtering by status', async () => {
      const res = await request(server)
        .get(`/api/v1/feedback?status=${FEEDBACK_STATUS.IN_REVIEW}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe(FEEDBACK_STATUS.IN_REVIEW);
      expect(res.body.data[0].adminNotes).toBe('Investigating Canvas redraws');
    });

    it('supports filtering by category', async () => {
      const res = await request(server)
        .get(`/api/v1/feedback?category=${FEEDBACK_CATEGORY.SUGGESTION}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe(FEEDBACK_CATEGORY.SUGGESTION);
    });

    it('denies non-admin users with 403', async () => {
      const res = await request(server)
        .get('/api/v1/feedback')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/feedback/:id (Admin get detail)', () => {
    it('returns feedback detail for admin', async () => {
      const item = await Feedback.create({
        user: attendeeUser._id,
        category: FEEDBACK_CATEGORY.SUPPORT,
        message: 'Where can I find the parking pass info?',
        status: FEEDBACK_STATUS.OPEN,
      });

      const res = await request(server)
        .get(`/api/v1/feedback/${item._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(item._id.toString());
      expect(res.body.data.message).toBe('Where can I find the parking pass info?');
    });

    it('returns 404 for non-existent feedback', async () => {
      const nonExistent = '507f1f77bcf86cd799439011';
      const res = await request(server)
        .get(`/api/v1/feedback/${nonExistent}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/feedback/:id (Admin triage update)', () => {
    it('allows admin to update status and admin notes', async () => {
      const item = await Feedback.create({
        user: attendeeUser._id,
        category: FEEDBACK_CATEGORY.ISSUE,
        message: 'Audio cut out during keynote session.',
        status: FEEDBACK_STATUS.OPEN,
      });

      const res = await request(server)
        .patch(`/api/v1/feedback/${item._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: FEEDBACK_STATUS.RESOLVED,
          adminNotes: 'AV team replaced microphone battery.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(FEEDBACK_STATUS.RESOLVED);
      expect(res.body.data.adminNotes).toBe('AV team replaced microphone battery.');

      const inDb = await Feedback.findById(item._id);
      expect(inDb.status).toBe(FEEDBACK_STATUS.RESOLVED);
      expect(inDb.adminNotes).toBe('AV team replaced microphone battery.');
    });

    it('denies non-admin users with 403', async () => {
      const item = await Feedback.create({
        user: attendeeUser._id,
        category: FEEDBACK_CATEGORY.ISSUE,
        message: 'Something went wrong',
      });

      const res = await request(server)
        .patch(`/api/v1/feedback/${item._id}`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({ status: FEEDBACK_STATUS.RESOLVED });

      expect(res.status).toBe(403);
    });
  });
});
