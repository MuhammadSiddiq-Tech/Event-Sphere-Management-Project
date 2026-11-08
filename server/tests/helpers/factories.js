/**
 * @fileoverview Test factories and helpers for test suites.
 * Creates mock entities and deterministic payload generators for users, expos, booths, etc.
 * Satisfies T-1.9. Rules §6.8.
 */

import { ROLES, BOOTH_STATUS, BOOTH_SIZE, EXPO_STATUS } from '../../src/config/constants.js';

let counter = 1;

/**
 * Reset factory counter.
 */
export function resetFactoryCounter() {
  counter = 1;
}

/**
 * Build mock user data for tests.
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function buildUser(overrides = {}) {
  const id = counter++;
  return {
    name: `User ${id}`,
    email: `user${id}@eventsphere.test`,
    password: 'Password123!',
    role: ROLES.ATTENDEE,
    isActive: true,
    consent: {
      privacyAccepted: true,
      acceptedAt: new Date('2026-01-01T00:00:00Z'),
      marketing: false,
    },
    ...overrides,
  };
}

/**
 * Build mock exhibitor user and profile data.
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function buildExhibitor(overrides = {}) {
  const id = counter++;
  return {
    user: buildUser({ role: ROLES.EXHIBITOR, email: `exhibitor${id}@eventsphere.test`, ...overrides.user }),
    profile: {
      companyName: `Company ${id} Inc.`,
      category: 'Technology',
      description: `Description for Company ${id}`,
      productsServices: ['Cloud Software', 'AI Solutions'],
      contact: {
        email: `contact@company${id}.test`,
        phone: '+1234567890',
        address: '100 Tech Blvd',
      },
      ...overrides.profile,
    },
  };
}

/**
 * Build mock expo data.
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function buildExpo(overrides = {}) {
  const id = counter++;
  return {
    title: `Expo Event ${id}`,
    slug: `expo-event-${id}`,
    description: `Description for Expo ${id}`,
    theme: 'Innovations in Technology',
    status: EXPO_STATUS.PUBLISHED,
    startDate: new Date('2026-09-01T09:00:00Z'),
    endDate: new Date('2026-09-03T18:00:00Z'),
    venue: {
      name: 'Convention Center',
      address: '100 Expo Way',
      city: 'Metropolis',
      country: 'USA',
    },
    floorPlan: {
      width: 1000,
      height: 800,
      gridSize: 20,
    },
    ...overrides,
  };
}

/**
 * Build mock booth data.
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function buildBooth(overrides = {}) {
  const id = counter++;
  return {
    code: `A-${String(id).padStart(2, '0')}`,
    x: (id * 40) % 800,
    y: 100,
    w: 60,
    h: 60,
    size: BOOTH_SIZE.MEDIUM,
    price: 1500,
    status: BOOTH_STATUS.AVAILABLE,
    ...overrides,
  };
}
