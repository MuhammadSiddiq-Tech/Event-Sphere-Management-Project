/**
 * @fileoverview Unit tests for User Mongoose Model.
 * Verifies role enforcement, bcrypt password hashing, hidden passwordHash, and toJSON transform.
 * T-2.1.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';

describe('T-2.1: User Model', () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('creates and saves a valid attendee user with timestamps and consent', async () => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    const user = new User({
      name: 'Test Attendee',
      email: 'attendee@eventsphere.test',
      passwordHash,
      role: 'attendee',
      consent: {
        privacyAccepted: true,
        acceptedAt: new Date(),
        marketing: false,
      },
    });

    const saved = await user.save();
    expect(saved._id).toBeDefined();
    expect(saved.email).toBe('attendee@eventsphere.test');
    expect(saved.role).toBe('attendee');
    expect(saved.consent.privacyAccepted).toBe(true);
    expect(saved.createdAt).toBeDefined();
  });

  it('rejects duplicate email addresses (unique index)', async () => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    const user1 = new User({
      name: 'User 1',
      email: 'dup@eventsphere.test',
      passwordHash,
      consent: { privacyAccepted: true },
    });
    await user1.save();

    const user2 = new User({
      name: 'User 2',
      email: 'dup@eventsphere.test',
      passwordHash,
      consent: { privacyAccepted: true },
    });

    await expect(user2.save()).rejects.toThrow();
  });

  it('excludes passwordHash and refreshTokens in toJSON output', async () => {
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    const user = new User({
      name: 'Privacy User',
      email: 'privacy@eventsphere.test',
      passwordHash,
      consent: { privacyAccepted: true },
    });
    await user.save();

    const json = user.toJSON();
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.passwordHash).toBeUndefined();
    expect(json.refreshTokens).toBeUndefined();
  });

  it('compares passwords accurately via comparePassword method', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
    const user = new User({
      name: 'Auth User',
      email: 'auth@eventsphere.test',
      passwordHash,
      consent: { privacyAccepted: true },
    });
    await user.save();

    const match = await user.comparePassword('CorrectPassword!');
    const wrong = await user.comparePassword('WrongPassword');

    expect(match).toBe(true);
    expect(wrong).toBe(false);
  });
});
