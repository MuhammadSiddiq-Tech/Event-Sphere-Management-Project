/**
 * @fileoverview Integration tests for the database seed script.
 * Verifies idempotent seeding of Admin, Exhibitor, and Attendee accounts.
 * T-2.9. Rule 3.3.8, BR-1.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { seedDatabase, SEED_USERS } from '../../seed/index.js';
import { User } from '../../src/models/user.model.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { ROLES } from '../../src/config/constants.js';

describe('T-2.9: Database Seed Script', () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('creates admin, exhibitor, and attendee seed accounts on first run', async () => {
    const result = await seedDatabase();

    expect(result.createdCount).toBe(3);
    expect(result.updatedCount).toBe(0);

    const users = await User.find({});
    expect(users).toHaveLength(3);

    const admin = await User.findOne({ email: 'admin@eventsphere.test' }).select('+passwordHash');
    expect(admin).not.toBeNull();
    expect(admin.role).toBe(ROLES.ADMIN);
    expect(admin.name).toBe('System Admin');
    const isPasswordValid = await admin.comparePassword('Admin@1234');
    expect(isPasswordValid).toBe(true);

    const exhibitor = await User.findOne({ email: 'exhibitor@eventsphere.test' });
    expect(exhibitor.role).toBe(ROLES.EXHIBITOR);

    const attendee = await User.findOne({ email: 'attendee@eventsphere.test' });
    expect(attendee.role).toBe(ROLES.ATTENDEE);
  }, 20000);

  it('is completely idempotent when run multiple times', async () => {
    // First run creates
    const firstRun = await seedDatabase();
    expect(firstRun.createdCount).toBe(3);

    // Second run updates without duplicating
    const secondRun = await seedDatabase();
    expect(secondRun.createdCount).toBe(0);
    expect(secondRun.updatedCount).toBe(3);

    const count = await User.countDocuments({});
    expect(count).toBe(3);
  }, 20000);
});
