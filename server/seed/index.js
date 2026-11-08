/**
 * @fileoverview Seed script — creates default users (idempotent).
 * Run with: npm run seed -w server
 * T-2.9. Rule 3.3.8, BR-1.
 */

import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/user.model.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/config/logger.js';
import { ROLES } from '../src/config/constants.js';

export const SEED_USERS = [
  {
    name: 'System Admin',
    email: 'admin@eventsphere.test',
    password: 'Admin@1234',
    role: ROLES.ADMIN,
    phone: '+1234567890',
    consent: { privacyAccepted: true, acceptedAt: new Date(), marketing: false },
    isActive: true,
  },
  {
    name: 'Acme Robotics Corp',
    email: 'exhibitor@eventsphere.test',
    password: 'Exhibitor@1234',
    role: ROLES.EXHIBITOR,
    phone: '+1234567891',
    consent: { privacyAccepted: true, acceptedAt: new Date(), marketing: true },
    isActive: true,
  },
  {
    name: 'Alice Attendee',
    email: 'attendee@eventsphere.test',
    password: 'Attendee@1234',
    role: ROLES.ATTENDEE,
    phone: '+1234567892',
    consent: { privacyAccepted: true, acceptedAt: new Date(), marketing: false },
    isActive: true,
  },
];

/**
 * Populate database with default accounts idempotently.
 * @returns {Promise<{ createdCount: number, updatedCount: number }>}
 */
export async function seedDatabase() {
  logger.info('🌱 Starting database seed...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const seedUser of SEED_USERS) {
    const existing = await User.findOne({ email: seedUser.email }).select('+passwordHash');
    const passwordHash = await bcrypt.hash(seedUser.password, env.BCRYPT_ROUNDS);

    if (existing) {
      existing.name = seedUser.name;
      existing.role = seedUser.role;
      existing.phone = seedUser.phone;
      existing.passwordHash = passwordHash;
      existing.isActive = seedUser.isActive;
      existing.consent = seedUser.consent;
      await existing.save();
      updatedCount++;
      logger.info({ email: seedUser.email, role: seedUser.role }, 'User already exists — updated');
    } else {
      await User.create({
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        phone: seedUser.phone,
        consent: seedUser.consent,
        isActive: seedUser.isActive,
      });
      createdCount++;
      logger.info({ email: seedUser.email, role: seedUser.role }, 'Created seed user');
    }
  }

  logger.info({ created: createdCount, updated: updatedCount }, '✅ Database seed complete');
  return { createdCount, updatedCount };
}

// Auto-run when executed directly via CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDb();
    await seedDatabase();
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '❌ Database seed failed');
    await disconnectDb().catch(() => {});
    process.exit(1);
  }
}
