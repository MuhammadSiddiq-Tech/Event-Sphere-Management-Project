/**
 * @fileoverview Integration & Unit tests for Conversations & Messaging (T-7.8, T-7.9).
 * Architecture §6.2, BR-9, FR-EXP-06, FR-EXP-07, FR-ATT-05.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { requestHandler } from '../../../src/app.js';
import { connectDb, disconnectDb } from '../../../src/config/db.js';
import { User } from '../../../src/models/user.model.js';
import { Expo } from '../../../src/models/expo.model.js';
import { Application } from '../../../src/models/application.model.js';
import { Conversation } from '../../../src/models/conversation.model.js';
import { Message } from '../../../src/models/message.model.js';
import { conversationsService } from '../../../src/modules/conversations/conversations.service.js';
import { ROLES, CONVERSATION_TYPE, APPLICATION_STATUS, EXPO_STATUS } from '../../../src/config/constants.js';
import { ValidationError } from '../../../src/core/errors.js';
import { setIo } from '../../../src/sockets/emitter.js';

let server;
let admin, adminToken, adminId;
let exhibitor1, exh1Token, exh1Id;
let exhibitor2, exh2Token, exh2Id;
let attendee, attToken, attId;
let testExpo, testExpoId;
let emittedEvents = [];

beforeAll(async () => {
  await connectDb();
  server = createServer(requestHandler);

  setIo({
    to: (room) => ({
      emit: (event, payload) => {
        emittedEvents.push({ room, event, payload });
      },
    }),
  });

  const hash = await bcrypt.hash('Password123!', 10);

  admin = await User.create({
    name: 'Admin User',
    email: 'admin@chat-test.com',
    passwordHash: hash,
    role: ROLES.ADMIN,
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  adminId = admin._id.toString();

  exhibitor1 = await User.create({
    name: 'Exhibitor Alpha',
    email: 'exh1@chat-test.com',
    passwordHash: hash,
    role: ROLES.EXHIBITOR,
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  exh1Id = exhibitor1._id.toString();

  exhibitor2 = await User.create({
    name: 'Exhibitor Beta',
    email: 'exh2@chat-test.com',
    passwordHash: hash,
    role: ROLES.EXHIBITOR,
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  exh2Id = exhibitor2._id.toString();

  attendee = await User.create({
    name: 'Attendee Alice',
    email: 'att@chat-test.com',
    passwordHash: hash,
    role: ROLES.ATTENDEE,
    consent: { privacyAccepted: true, acceptedAt: new Date() },
  });
  attId = attendee._id.toString();

  // Create an expo for testing exhibitor-to-exhibitor
  testExpo = await Expo.create({
    title: 'Chat Test Expo 2026',
    slug: 'chat-test-expo-2026',
    description: 'Expo for chat testing',
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-11-05'),
    status: EXPO_STATUS.PUBLISHED,
    location: { venueName: 'Convention Center' },
    createdBy: adminId,
  });
  testExpoId = testExpo._id.toString();

  // Give exhibitor1 an approved application in testExpo
  await Application.create({
    expo: testExpoId,
    exhibitor: exh1Id,
    status: APPLICATION_STATUS.APPROVED,
    companySnapshot: { companyName: 'Alpha Corp' },
  });

  // Login tokens
  const rAdmin = await request(server).post('/api/v1/auth/login').send({ email: 'admin@chat-test.com', password: 'Password123!' });
  adminToken = rAdmin.body.data.accessToken;

  const rExh1 = await request(server).post('/api/v1/auth/login').send({ email: 'exh1@chat-test.com', password: 'Password123!' });
  exh1Token = rExh1.body.data.accessToken;

  const rExh2 = await request(server).post('/api/v1/auth/login').send({ email: 'exh2@chat-test.com', password: 'Password123!' });
  exh2Token = rExh2.body.data.accessToken;

  const rAtt = await request(server).post('/api/v1/auth/login').send({ email: 'att@chat-test.com', password: 'Password123!' });
  attToken = rAtt.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Application.deleteMany({ expo: testExpoId });
  await Expo.deleteMany({ _id: testExpoId });
  await User.deleteMany({ email: { $in: ['admin@chat-test.com', 'exh1@chat-test.com', 'exh2@chat-test.com', 'att@chat-test.com'] } });
  await disconnectDb();
});

beforeEach(async () => {
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  emittedEvents = [];
});

describe('T-7.8: Role Rules & Conversation Service (Unit)', () => {
  it('allows attendee to start a support conversation with admin', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: adminId,
      type: CONVERSATION_TYPE.SUPPORT,
      initialMessage: 'Hello Admin, I have a question.',
    });

    expect(conv.id).toBeDefined();
    expect(conv.type).toBe(CONVERSATION_TYPE.SUPPORT);
    expect(conv.lastMessage.text).toBe('Hello Admin, I have a question.');
  });

  it('allows attendee to message exhibitor (exhibitor-attendee)', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
    });

    expect(conv.id).toBeDefined();
    expect(conv.type).toBe(CONVERSATION_TYPE.EXHIBITOR_ATTENDEE);
  });

  it('enforces BR-9: rejects exhibitor-to-exhibitor when one has no approved booth/app in the expo', async () => {
    // exhibitor2 does not have an approved application in testExpo
    await expect(
      conversationsService.startConversation(exhibitor1, {
        recipientId: exh2Id,
        type: CONVERSATION_TYPE.EXHIBITOR_EXHIBITOR,
        expoId: testExpoId,
      })
    ).rejects.toThrow(/does not have an approved booth or application/i);
  });

  it('enforces BR-9: permits exhibitor-to-exhibitor once both have approved applications in same expo', async () => {
    // Approve application for exhibitor2 in testExpo
    const app2 = await Application.create({
      expo: testExpoId,
      exhibitor: exh2Id,
      status: APPLICATION_STATUS.APPROVED,
      companySnapshot: { companyName: 'Beta Corp' },
    });

    const conv = await conversationsService.startConversation(exhibitor1, {
      recipientId: exh2Id,
      type: CONVERSATION_TYPE.EXHIBITOR_EXHIBITOR,
      expoId: testExpoId,
    });

    expect(conv.id).toBeDefined();
    expect(conv.type).toBe(CONVERSATION_TYPE.EXHIBITOR_EXHIBITOR);

    // Clean up app2
    await Application.deleteOne({ _id: app2._id });
  });

  it('prevents starting a conversation with oneself', async () => {
    await expect(
      conversationsService.startConversation(attendee, {
        recipientId: attId,
        type: CONVERSATION_TYPE.SUPPORT,
      })
    ).rejects.toThrow(ValidationError);
  });
});

describe('T-7.8 & T-7.9: Messaging Lifecycle & Socket Broadcasts', () => {
  it('sends messages and emits socket events to conversation and user rooms', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
    });

    emittedEvents = [];

    const msg = await conversationsService.sendMessage(attendee, conv.id, {
      body: 'Can I visit your booth tomorrow?',
    });

    expect(msg.id).toBeDefined();
    expect(msg.body).toBe('Can I visit your booth tomorrow?');
    expect(msg.sender.name).toBe('Attendee Alice');

    // Verify Socket emissions
    const convEmit = emittedEvents.find((e) => e.room === `conversation:${conv.id}`);
    expect(convEmit).toBeDefined();
    expect(convEmit.event).toBe('message:new');
    expect(convEmit.payload.body).toBe('Can I visit your booth tomorrow?');

    const userEmit = emittedEvents.find((e) => e.room === `user:${exh1Id}`);
    expect(userEmit).toBeDefined();
    expect(userEmit.event).toBe('message:new');

    // Verify unread count increased for exhibitor1
    const updatedConv = await Conversation.findById(conv.id);
    expect(updatedConv.unreadCounts.get(exh1Id)).toBe(1);
  });

  it('markAsRead resets unread count and marks messages read', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
      initialMessage: 'Hello!',
    });

    const before = await Conversation.findById(conv.id);
    expect(before.unreadCounts.get(exh1Id)).toBe(1);

    emittedEvents = [];
    await conversationsService.markAsRead(exh1Id, conv.id);

    const after = await Conversation.findById(conv.id);
    expect(after.unreadCounts.get(exh1Id)).toBe(0);

    // Verify message:read event emitted to conversation room
    const readEmit = emittedEvents.find((e) => e.room === `conversation:${conv.id}` && e.event === 'message:read');
    expect(readEmit).toBeDefined();
    expect(readEmit.payload.userId).toBe(exh1Id);
  });
});

describe('T-7.8: Conversations & Messages REST API', () => {
  it('POST /api/v1/conversations starts or fetches a conversation', async () => {
    const res = await request(server)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${attToken}`)
      .send({
        recipientId: adminId,
        type: CONVERSATION_TYPE.SUPPORT,
        initialMessage: 'Need help with tickets.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.type).toBe(CONVERSATION_TYPE.SUPPORT);
  });

  it('GET /api/v1/conversations returns user conversation list', async () => {
    await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
      initialMessage: 'Product inquiry.',
    });

    const res = await request(server)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${attToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].lastMessage.text).toBe('Product inquiry.');
  });

  it('POST /api/v1/conversations/:id/messages and GET /messages', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
    });

    // Send via REST
    const postRes = await request(server)
      .post(`/api/v1/conversations/${conv.id}/messages`)
      .set('Authorization', `Bearer ${attToken}`)
      .send({ body: 'What time is your demo?' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.data.body).toBe('What time is your demo?');

    // List messages
    const getRes = await request(server)
      .get(`/api/v1/conversations/${conv.id}/messages`)
      .set('Authorization', `Bearer ${exh1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].body).toBe('What time is your demo?');
  });

  it('PATCH /api/v1/conversations/:id/read marks conversation as read', async () => {
    const conv = await conversationsService.startConversation(attendee, {
      recipientId: exh1Id,
      type: CONVERSATION_TYPE.EXHIBITOR_ATTENDEE,
      initialMessage: 'Unread message.',
    });

    const res = await request(server)
      .patch(`/api/v1/conversations/${conv.id}/read`)
      .set('Authorization', `Bearer ${exh1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
