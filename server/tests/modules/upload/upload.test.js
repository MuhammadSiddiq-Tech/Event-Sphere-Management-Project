/**
 * @fileoverview Integration tests for POST /api/v1/upload.
 * T-1.7, Rule 3.7.1.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { requestHandler } from '../../../src/app.js';
import { User } from '../../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { generateAccessToken } from '../../../src/utils/tokens.js';
import { ROLES } from '../../../src/config/constants.js';

describe('POST /api/v1/upload', () => {
  let server;
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    await connectDb();
    server = createServer(requestHandler);

    adminUser = await User.create({
      name: 'Admin Upload Test',
      email: `admin-upload-${Date.now()}@test.local`,
      passwordHash: 'dummy',
      role: ROLES.ADMIN,
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });

    adminToken = generateAccessToken({
      id: adminUser._id.toString(),
      role: adminUser.role,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: adminUser._id });
    await disconnectDb();
  });

  it('rejects unauthenticated upload requests with 401', async () => {
    const res = await request(server)
      .post('/api/v1/upload')
      .attach('file', Buffer.from('fake-image-content'), 'banner.png');

    expect(res.status).toBe(401);
  });

  it('successfully uploads an image and returns public URL', async () => {
    const res = await request(server)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('png-data-stream'), {
        filename: 'test-banner.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^\/uploads\//);
    expect(res.body.data.filename).toBe('test-banner.png');
    expect(res.body.data.mimetype).toBe('image/png');
  });

  it('rejects disallowed file types with 400 validation error', async () => {
    const res = await request(server)
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('#!/bin/bash\necho bad'), {
        filename: 'script.sh',
        contentType: 'text/x-sh',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
