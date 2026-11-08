/**
 * @fileoverview Unit tests for test harness and entity factories.
 * Verifies factories output deterministic test entities and the test harness initializes properly.
 * Rules §6.8, T-1.9.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  buildUser,
  buildExhibitor,
  buildExpo,
  buildBooth,
  resetFactoryCounter,
} from './factories.js';
import { getTestServer, createAgent } from './harness.js';

describe('T-1.9: Test Harness & Factories', () => {
  beforeEach(() => {
    resetFactoryCounter();
  });

  describe('factories', () => {
    it('generates predictable user data with default role and consent', () => {
      const user = buildUser();
      expect(user.email).toBe('user1@eventsphere.test');
      expect(user.role).toBe('attendee');
      expect(user.consent.privacyAccepted).toBe(true);
    });

    it('allows overriding user attributes', () => {
      const admin = buildUser({ role: 'admin', email: 'custom-admin@eventsphere.test' });
      expect(admin.role).toBe('admin');
      expect(admin.email).toBe('custom-admin@eventsphere.test');
    });

    it('generates exhibitor with linked profile details', () => {
      const exhibitor = buildExhibitor();
      expect(exhibitor.user.role).toBe('exhibitor');
      expect(exhibitor.profile.companyName).toBe('Company 1 Inc.');
      expect(exhibitor.profile.category).toBe('Technology');
    });

    it('generates expo with valid dates and floorPlan dimensions', () => {
      const expo = buildExpo();
      expect(expo.title).toBe('Expo Event 1');
      expect(expo.slug).toBe('expo-event-1');
      expect(expo.floorPlan.gridSize).toBe(20);
      expect(expo.endDate.getTime()).toBeGreaterThan(expo.startDate.getTime());
    });

    it('generates booth with sequential code and available status', () => {
      const booth1 = buildBooth();
      const booth2 = buildBooth();
      expect(booth1.code).toBe('A-01');
      expect(booth2.code).toBe('A-02');
      expect(booth1.status).toBe('available');
    });
  });

  describe('test harness', () => {
    it('initializes HTTP test server instance without throwing', () => {
      const server = getTestServer();
      expect(server).toBeDefined();
    });

    it('creates Supertest agent capable of probing endpoints', async () => {
      const agent = createAgent();
      const res = await agent.get('/health');
      expect([200, 503]).toContain(res.status);
    });
  });
});
