/**
 * @fileoverview Upload Abuse & Path Traversal Security Test Suite (T-9.3).
 * NFR-SEC-05.
 * Tests:
 *  - Malicious / disallowed extensions and MIME types (.exe, .sh, .html, .zip)
 *  - Filename path traversal sanitization (../../evil.png)
 *  - Static file server path traversal prevention (/uploads/../../package.json)
 *  - Static file extension allowlist enforcement (.exe rejected with 403)
 *  - File size limit enforcement (> 5MB image limit)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { requestHandler } from '../../src/app.js';
import { User } from '../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { ROLES } from '../../src/config/constants.js';
import { env } from '../../src/config/env.js';

let server;
let testUser, testToken;
let testDummyFilePath;

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  testUser = await User.create({
    name: 'Security Upload Tester',
    email: `sec-upload-${Date.now()}@test.local`,
    passwordHash: 'dummy-sec',
    role: ROLES.EXHIBITOR,
    consent: { privacyAccepted: true },
  });

  testToken = generateAccessToken({
    id: testUser._id.toString(),
    role: testUser.role,
  });

  // Create a harmless test file in uploads dir to test static serve & extension restrictions
  testDummyFilePath = join(env.UPLOAD_DIR, 'test-sec-probe.exe');
  writeFileSync(testDummyFilePath, 'dummy binary executable');
});

afterAll(async () => {
  if (testDummyFilePath && existsSync(testDummyFilePath)) {
    try {
      unlinkSync(testDummyFilePath);
    } catch {}
  }
  if (testUser?._id) {
    await User.deleteOne({ _id: testUser._id });
  }
  await disconnectDb();
});

describe('Upload Abuse & Boundary Protections (T-9.3, NFR-SEC-05)', () => {
  describe('Disallowed File Types & Executables', () => {
    it('rejects executable file upload (.exe)', async () => {
      const res = await request(server)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), {
          filename: 'payload.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects shell script upload (.sh)', async () => {
      const res = await request(server)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('#!/bin/bash\nrm -rf /'), {
          filename: 'attack.sh',
          contentType: 'application/x-sh',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects HTML/SVG file disguised to attempt stored XSS', async () => {
      const res = await request(server)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), {
          filename: 'xss.svg',
          contentType: 'image/svg+xml',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Filename Path Traversal in Upload', () => {
    it('sanitizes filename and prevents directory traversal outside upload dir', async () => {
      const traversalName = '../../../../etc/malicious.png';
      const res = await request(server)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('safe-png-binary-stream'), {
          filename: traversalName,
          contentType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Stored URL must be within /uploads/ and contain no traversal dots
      expect(res.body.data.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/i);
      expect(res.body.data.url).not.toContain('..');
    });
  });

  describe('Static File Server Traversal & MIME Protection', () => {
    it('blocks directory traversal attempts via /uploads/..', async () => {
      const res = await request(server).get('/uploads/../../package.json');
      // Must be 403 Forbidden or 404 Not Found, never 200 with sensitive files
      expect([403, 404]).toContain(res.status);
    });

    it('blocks encoded directory traversal attempts via %2e%2e', async () => {
      const res = await request(server).get('/uploads/%2e%2e%2fpackage.json');
      expect([403, 404]).toContain(res.status);
    });

    it('refuses to serve disallowed file extensions even if present in uploads dir', async () => {
      // test-sec-probe.exe exists in uploads dir
      const res = await request(server).get('/uploads/test-sec-probe.exe');
      expect(res.status).toBe(403);
    });
  });

  describe('Oversized File Handling', () => {
    it('rejects images exceeding size limit (5MB)', async () => {
      // 5.5 MB buffer
      const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'a');
      const res = await request(server)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', largeBuffer, {
          filename: 'giant.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
