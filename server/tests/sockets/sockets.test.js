/**
 * @fileoverview Integration and unit tests for Socket.IO Bootstrap, Auth & Rooms (T-7.1, T-7.2).
 * Tests handshake authentication, room join rules, and service emitter integration.
 * FR-SYS-01, Rules §3.5.1, §3.5.2, §3.5.3.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { User } from '../../src/models/user.model.js';
import { Expo } from '../../src/models/expo.model.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { initSockets, socketAuthMiddleware } from '../../src/sockets/index.js';
import {
  setIo,
  emitToExpo,
  emitToUser,
  emitToAdmin,
  emitToConversation,
} from '../../src/sockets/emitter.js';
import { ROLES, EXPO_STATUS } from '../../src/config/constants.js';

describe('T-7.1 & T-7.2: Real-time Socket.IO Auth, Rooms & Emitter', () => {
  let httpServer;
  let ioServer;
  let port;
  let adminUser;
  let exhibitorUser;
  let attendeeUser;
  let adminToken;
  let exhibitorToken;
  let attendeeToken;
  let publishedExpo;
  let draftExpo;

  beforeAll(async () => {
    await connectDb();

    // Create test HTTP & Socket server
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });
    initSockets(ioServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });

    // Create test users
    adminUser = await User.create({
      name: 'Socket Admin',
      email: 'socket-admin@test.com',
      passwordHash: 'hash-abc',
      role: ROLES.ADMIN,
      isActive: true,
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });

    exhibitorUser = await User.create({
      name: 'Socket Exhibitor',
      email: 'socket-exhibitor@test.com',
      passwordHash: 'hash-abc',
      role: ROLES.EXHIBITOR,
      isActive: true,
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });

    attendeeUser = await User.create({
      name: 'Socket Attendee',
      email: 'socket-attendee@test.com',
      passwordHash: 'hash-abc',
      role: ROLES.ATTENDEE,
      isActive: true,
      consent: { privacyAccepted: true, acceptedAt: new Date() },
    });

    adminToken = generateAccessToken(adminUser);
    exhibitorToken = generateAccessToken(exhibitorUser);
    attendeeToken = generateAccessToken(attendeeUser);

    // Create expos
    publishedExpo = await Expo.create({
      title: 'Realtime Live Expo',
      slug: 'realtime-live-expo',
      description: 'A live expo for socket tests',
      status: EXPO_STATUS.PUBLISHED,
      startDate: new Date('2027-01-01'),
      endDate: new Date('2027-01-05'),
      venue: { city: 'Neo Tokyo' },
      createdBy: adminUser._id,
    });

    draftExpo = await Expo.create({
      title: 'Secret Draft Expo',
      slug: 'secret-draft-expo',
      description: 'Draft only',
      status: EXPO_STATUS.DRAFT,
      startDate: new Date('2027-02-01'),
      endDate: new Date('2027-02-05'),
      venue: { city: 'Secret City' },
      createdBy: exhibitorUser._id,
    });
  });

  afterAll(async () => {
    if (ioServer) {
      await new Promise((resolve) => ioServer.close(resolve));
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await User.deleteMany({ _id: { $in: [adminUser._id, exhibitorUser._id, attendeeUser._id] } });
    await Expo.deleteMany({ _id: { $in: [publishedExpo._id, draftExpo._id] } });
    await disconnectDb();
  });

  function createClientSocket(token) {
    return Client(`http://localhost:${port}`, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
  }

  // ─── Handshake Authentication Tests ───────────────────────────────────────

  it('rejects connection when token is missing', (done) => {
    const socket = createClientSocket(null);

    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication required/i);
      socket.disconnect();
      done();
    });
  });

  it('rejects connection when token is invalid or corrupted', (done) => {
    const socket = createClientSocket('invalid.jwt.token');

    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication failed/i);
      socket.disconnect();
      done();
    });
  });

  it('connects successfully with valid access token and joins user room', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', async () => {
      expect(socket.connected).toBe(true);

      // Verify the server placed socket in user room
      const ioSocket = ioServer.sockets.sockets.get(socket.id);
      expect(ioSocket).toBeDefined();
      expect(ioSocket.rooms.has(`user:${attendeeUser._id}`)).toBe(true);
      expect(ioSocket.user.id).toBe(attendeeUser._id.toString());
      expect(ioSocket.user.role).toBe(ROLES.ATTENDEE);

      socket.disconnect();
      done();
    });
  });

  // ─── Room Authorization Tests ─────────────────────────────────────────────

  it('allows attendee to join published expo room', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: publishedExpo._id.toString() }, (res) => {
        expect(res.success).toBe(true);
        expect(res.room).toBe(`expo:${publishedExpo._id}`);

        const ioSocket = ioServer.sockets.sockets.get(socket.id);
        expect(ioSocket.rooms.has(`expo:${publishedExpo._id}`)).toBe(true);

        socket.disconnect();
        done();
      });
    });
  });

  it('forbids attendee from joining draft expo room', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: draftExpo._id.toString() }, (res) => {
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Forbidden/i);

        const ioSocket = ioServer.sockets.sockets.get(socket.id);
        expect(ioSocket.rooms.has(`expo:${draftExpo._id}`)).toBe(false);

        socket.disconnect();
        done();
      });
    });
  });

  it('allows admin to join draft expo room', (done) => {
    const socket = createClientSocket(adminToken);

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: draftExpo._id.toString() }, (res) => {
        expect(res.success).toBe(true);

        const ioSocket = ioServer.sockets.sockets.get(socket.id);
        expect(ioSocket.rooms.has(`expo:${draftExpo._id}`)).toBe(true);

        socket.disconnect();
        done();
      });
    });
  });

  it('allows creator to join draft expo room', (done) => {
    const socket = createClientSocket(exhibitorToken); // creator of draftExpo

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: draftExpo._id.toString() }, (res) => {
        expect(res.success).toBe(true);

        const ioSocket = ioServer.sockets.sockets.get(socket.id);
        expect(ioSocket.rooms.has(`expo:${draftExpo._id}`)).toBe(true);

        socket.disconnect();
        done();
      });
    });
  });

  it('leaves expo room when requested', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: publishedExpo._id.toString() }, () => {
        socket.emit('leave:expo', { expoId: publishedExpo._id.toString() }, (leaveRes) => {
          expect(leaveRes.success).toBe(true);

          const ioSocket = ioServer.sockets.sockets.get(socket.id);
          expect(ioSocket.rooms.has(`expo:${publishedExpo._id}`)).toBe(false);

          socket.disconnect();
          done();
        });
      });
    });
  });

  it('enforces admin role on join:admin', (done) => {
    const nonAdminSocket = createClientSocket(attendeeToken);

    nonAdminSocket.on('connect', () => {
      nonAdminSocket.emit('join:admin', { expoId: publishedExpo._id.toString() }, (res) => {
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Admin role required/i);

        nonAdminSocket.disconnect();

        // Now test with admin token
        const adminSocket = createClientSocket(adminToken);
        adminSocket.on('connect', () => {
          adminSocket.emit('join:admin', { expoId: publishedExpo._id.toString() }, (adminRes) => {
            expect(adminRes.success).toBe(true);
            expect(adminRes.room).toBe(`admin:${publishedExpo._id}`);

            adminSocket.disconnect();
            done();
          });
        });
      });
    });
  });

  // ─── Emitter Integration Tests (T-7.2) ─────────────────────────────────────

  it('receives booth:updated event via emitToExpo', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', () => {
      socket.emit('join:expo', { expoId: publishedExpo._id.toString() }, () => {
        socket.on('booth:updated', (payload) => {
          expect(payload.expoId).toBe(publishedExpo._id.toString());
          expect(payload.boothId).toBe('booth-123');
          expect(payload.status).toBe('reserved');

          socket.disconnect();
          done();
        });

        emitToExpo(publishedExpo._id.toString(), 'booth:updated', {
          expoId: publishedExpo._id.toString(),
          boothId: 'booth-123',
          status: 'reserved',
        });
      });
    });
  });

  it('receives personal event via emitToUser', (done) => {
    const socket = createClientSocket(attendeeToken);

    socket.on('connect', () => {
      socket.on('application:reviewed', (payload) => {
        expect(payload.status).toBe('approved');
        expect(payload.assignedBooth).toBe('booth-A1');

        socket.disconnect();
        done();
      });

      emitToUser(attendeeUser._id.toString(), 'application:reviewed', {
        status: 'approved',
        assignedBooth: 'booth-A1',
      });
    });
  });

  it('receives admin notifications via emitToAdmin', (done) => {
    const socket = createClientSocket(adminToken);

    socket.on('connect', () => {
      socket.emit('join:admin', { expoId: publishedExpo._id.toString() }, () => {
        socket.on('application:new', (payload) => {
          expect(payload.applicationId).toBe('app-999');

          socket.disconnect();
          done();
        });

        emitToAdmin(publishedExpo._id.toString(), 'application:new', {
          applicationId: 'app-999',
        });
      });
    });
  });
});
