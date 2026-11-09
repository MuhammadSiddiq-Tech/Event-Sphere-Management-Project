/**
 * @fileoverview Integration tests for Privacy, Consent, Data Export & Deletion (T-9.1).
 * FR-SYS-05, NFR-PRIV-01, NFR-PRIV-02, NFR-PRIV-03.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';
import { ExhibitorProfile } from '../../../src/models/exhibitorProfile.model.js';
import { Application } from '../../../src/models/application.model.js';

let server;
let testUser, testToken, testUserId;
let exhibitorUser, exhibitorToken, exhibitorUserId;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  await User.deleteMany({
    email: { $in: ['privacy-test@test.com', 'privacy-exhibitor@test.com'] },
  });

  const hash = await bcrypt.hash('Password123!', 12);

  testUser = await User.create({
    name: 'Privacy Attendee',
    email: 'privacy-test@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: {
      privacyAccepted: true,
      acceptedAt: new Date('2026-01-01'),
      marketing: false,
      analytics: true,
    },
  });
  testUserId = testUser._id.toString();

  exhibitorUser = await User.create({
    name: 'Privacy Exhibitor',
    email: 'privacy-exhibitor@test.com',
    passwordHash: hash,
    role: 'exhibitor',
    consent: {
      privacyAccepted: true,
      acceptedAt: new Date('2026-01-01'),
      marketing: true,
      analytics: true,
    },
  });
  exhibitorUserId = exhibitorUser._id.toString();

  await ExhibitorProfile.create({
    user: exhibitorUserId,
    companyName: 'Privacy Corp',
    description: 'We care about privacy.',
    contacts: [{ name: 'Agent', email: 'contact@privacycorp.test' }],
  });

  const res1 = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'privacy-test@test.com', password: 'Password123!' });
  testToken = res1.body.data.accessToken;

  const res2 = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'privacy-exhibitor@test.com', password: 'Password123!' });
  exhibitorToken = res2.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await User.deleteMany({
    email: {
      $in: [
        'privacy-test@test.com',
        'privacy-exhibitor@test.com',
        `anonymized-${testUserId}@deleted.local`,
        `anonymized-${exhibitorUserId}@deleted.local`,
      ],
    },
  });
  await ExhibitorProfile.deleteMany({ user: { $in: [testUserId, exhibitorUserId] } });
  await disconnectDb();
});

describe('Privacy Module (T-9.1)', () => {
  describe('GET /api/v1/users/me/export (Data Portability)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(server).get('/api/v1/users/me/export');
      expect(res.status).toBe(401);
    });

    it('exports all personal data as JSON for authenticated user', async () => {
      const res = await request(server)
        .get('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { profile, exportMetadata, sessionEngagements, notifications, feedback } = res.body.data;
      expect(exportMetadata.userId).toBe(testUserId);
      expect(profile.email).toBe('privacy-test@test.com');
      expect(profile.consent.privacyAccepted).toBe(true);
      expect(Array.isArray(sessionEngagements)).toBe(true);
      expect(Array.isArray(notifications)).toBe(true);
      expect(Array.isArray(feedback)).toBe(true);
    });
  });

  describe('PATCH /api/v1/users/me/consent (Consent Management)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(server)
        .patch('/api/v1/users/me/consent')
        .send({ marketing: true });

      expect(res.status).toBe(401);
    });

    it('updates marketing consent and analytics consent with timestamp', async () => {
      const res = await request(server)
        .patch('/api/v1/users/me/consent')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ marketing: true, analytics: false });

      expect(res.status).toBe(200);
      expect(res.body.data.consent.marketing).toBe(true);
      expect(res.body.data.consent.analytics).toBe(false);
      expect(res.body.data.consent.updatedAt).toBeDefined();

      const inDb = await User.findById(testUserId);
      expect(inDb.consent.marketing).toBe(true);
      expect(inDb.consent.analytics).toBe(false);
    });

    it('rejects empty consent update with 400', async () => {
      const res = await request(server)
        .patch('/api/v1/users/me/consent')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/users/me (Account Anonymization & Deletion)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(server)
        .delete('/api/v1/users/me')
        .send({ password: 'Password123!' });

      expect(res.status).toBe(401);
    });

    it('returns 401 when password confirmation is incorrect', async () => {
      const res = await request(server)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ password: 'WrongPassword!' });

      expect(res.status).toBe(401);
    });

    it('anonymizes and deactivates account on valid password confirmation', async () => {
      const res = await request(server)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${exhibitorToken}`)
        .send({ password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user document in DB
      const anonymizedUser = await User.findById(exhibitorUserId);
      expect(anonymizedUser.isActive).toBe(false);
      expect(anonymizedUser.name).toBe('Anonymized User');
      expect(anonymizedUser.email).toBe(`anonymized-${exhibitorUserId}@deleted.local`);
      expect(anonymizedUser.phone).toBe('');
      expect(anonymizedUser.avatarUrl).toBe('');
      expect(anonymizedUser.refreshTokens).toHaveLength(0);
      expect(anonymizedUser.consent.withdrawnAt).toBeDefined();

      // Verify exhibitor profile is anonymized
      const profile = await ExhibitorProfile.findOne({ user: exhibitorUserId });
      expect(profile.companyName).toBe('[Deleted Exhibitor]');
      expect(profile.contacts).toHaveLength(0);

      // Verify future login attempts fail
      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'privacy-exhibitor@test.com', password: 'Password123!' });
      expect(loginRes.status).toBe(401);
    });
  });
});
