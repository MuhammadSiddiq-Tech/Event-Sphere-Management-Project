/**
 * @fileoverview Integration & Unit tests for Notifications module (T-7.5, T-7.6).
 * FR-SYS-03.
 *
 * Tests:
 *  - notificationsService.notify() persistence + socket event emission
 *  - notificationsService.list() pagination & ?unread=true filter
 *  - notificationsService.unreadCount()
 *  - notificationsService.markRead() idempotent single notification update
 *  - notificationsService.markAllRead() idempotent bulk update
 *  - REST GET /api/v1/notifications (with auth and pagination)
 *  - REST GET /api/v1/notifications/unread-count
 *  - REST PATCH /api/v1/notifications/:id/read
 *  - REST PATCH /api/v1/notifications/read-all
 *  - Authorization / 401 handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';
import { Notification } from '../../../src/models/notification.model.js';
import { notificationsService } from '../../../src/modules/notifications/notifications.service.js';
import { NOTIFICATION_TYPE } from '../../../src/config/constants.js';
import { setIo } from '../../../src/sockets/emitter.js';

let server;
let user1, user1Token, user1Id;
let user2, user2Token, user2Id;
let emittedSocketEvents = [];

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  // Mock Socket.IO instance to track emissions
  setIo({
    to: (room) => ({
      emit: (event, payload) => {
        emittedSocketEvents.push({ room, event, payload });
      },
    }),
  });

  const hash = await bcrypt.hash('Password123!', 12);

  user1 = await User.create({
    name: 'Notification User 1',
    email: 'notif1@test.com',
    passwordHash: hash,
    role: 'attendee',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  user1Id = user1._id.toString();

  user2 = await User.create({
    name: 'Notification User 2',
    email: 'notif2@test.com',
    passwordHash: hash,
    role: 'exhibitor',
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  user2Id = user2._id.toString();

  const res1 = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'notif1@test.com', password: 'Password123!' });
  user1Token = res1.body.data.accessToken;

  const res2 = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'notif2@test.com', password: 'Password123!' });
  user2Token = res2.body.data.accessToken;
});

afterAll(async () => {
  await Notification.deleteMany({});
  await User.deleteMany({ email: { $in: ['notif1@test.com', 'notif2@test.com'] } });
  await disconnectDb();
});

beforeEach(async () => {
  await Notification.deleteMany({});
  emittedSocketEvents = [];
});

describe('T-7.5: Notifications Service (Unit)', () => {
  it('creates notification and emits notification:new event to user room', async () => {
    const notif = await notificationsService.notify(user1Id, NOTIFICATION_TYPE.APPLICATION_RESULT, {
      status: 'approved',
      expoId: 'expo-1',
    });

    expect(notif.id).toBeDefined();
    expect(notif.type).toBe(NOTIFICATION_TYPE.APPLICATION_RESULT);
    expect(notif.isRead).toBe(false);
    expect(notif.payload.status).toBe('approved');

    // Verify DB
    const found = await Notification.findById(notif.id);
    expect(found).not.toBeNull();
    expect(found.user.toString()).toBe(user1Id);

    // Verify Socket emission
    expect(emittedSocketEvents.length).toBe(1);
    expect(emittedSocketEvents[0].room).toBe(`user:${user1Id}`);
    expect(emittedSocketEvents[0].event).toBe('notification:new');
    expect(emittedSocketEvents[0].payload.type).toBe(NOTIFICATION_TYPE.APPLICATION_RESULT);
  });

  it('lists notifications with pagination and unread filter', async () => {
    // Seed 3 notifications (2 unread, 1 read)
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_UPDATED, { title: 'S1' });
    const n2 = await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_REMINDER, { title: 'S2' });
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.BOOTH_CHANGED, { code: 'A1' });

    await notificationsService.markRead(user1Id, n2.id);

    // List all
    const all = await notificationsService.list(user1Id, { page: 1, limit: 10 });
    expect(all.items.length).toBe(3);
    expect(all.meta.total).toBe(3);

    // List unread only
    const unread = await notificationsService.list(user1Id, { page: 1, limit: 10, unread: 'true' });
    expect(unread.items.length).toBe(2);
    expect(unread.items.every((item) => !item.isRead)).toBe(true);

    // Unread count
    const count = await notificationsService.unreadCount(user1Id);
    expect(count.count).toBe(2);
  });

  it('markRead marks notification read idempotently', async () => {
    const notif = await notificationsService.notify(user1Id, NOTIFICATION_TYPE.NEW_MESSAGE, {});
    expect(notif.isRead).toBe(false);

    const updated = await notificationsService.markRead(user1Id, notif.id);
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeDefined();

    // Calling again is idempotent
    const repeat = await notificationsService.markRead(user1Id, notif.id);
    expect(repeat.isRead).toBe(true);
  });

  it('markAllRead marks all notifications read for the user', async () => {
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_UPDATED, {});
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_REMINDER, {});
    await notificationsService.notify(user2Id, NOTIFICATION_TYPE.BOOTH_CHANGED, {}); // Other user

    const res = await notificationsService.markAllRead(user1Id);
    expect(res.modifiedCount).toBe(2);

    const user1Count = await notificationsService.unreadCount(user1Id);
    expect(user1Count.count).toBe(0);

    // User2 count unaffected
    const user2Count = await notificationsService.unreadCount(user2Id);
    expect(user2Count.count).toBe(1);
  });
});

describe('T-7.5: Notifications REST API', () => {
  it('GET /api/v1/notifications requires authentication', async () => {
    const res = await request(server).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/notifications returns paginated list of user notifications', async () => {
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_UPDATED, { title: 'Test Session' });

    const res = await request(server)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe(NOTIFICATION_TYPE.SESSION_UPDATED);
    expect(res.body.meta.total).toBe(1);
  });

  it('GET /api/v1/notifications/unread-count returns unread count', async () => {
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_UPDATED, {});
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.BOOTH_CHANGED, {});

    const res = await request(server)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(2);
  });

  it('PATCH /api/v1/notifications/:id/read marks notification as read', async () => {
    const notif = await notificationsService.notify(user1Id, NOTIFICATION_TYPE.APPLICATION_RESULT, {
      status: 'approved',
    });

    const res = await request(server)
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
  });

  it('PATCH /api/v1/notifications/read-all marks all notifications as read', async () => {
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_UPDATED, {});
    await notificationsService.notify(user1Id, NOTIFICATION_TYPE.SESSION_REMINDER, {});

    const res = await request(server)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modifiedCount).toBe(2);

    const countRes = await request(server)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(countRes.body.data.count).toBe(0);
  });
});
