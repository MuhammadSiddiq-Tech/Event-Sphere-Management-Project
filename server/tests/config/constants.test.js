/**
 * @fileoverview Unit tests for config/constants.js
 * Verifies all application constants and enums are frozen, valid, and match architecture spec.
 * Rule 1.6, T-1.5.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ROLES,
  BOOTH_SIZE,
  BOOTH_STATUS,
  APPLICATION_STATUS,
  EXPO_STATUS,
  SESSION_TYPE,
  SESSION_STATUS,
  ENGAGEMENT_KIND,
  CONVERSATION_TYPE,
  FEEDBACK_CATEGORY,
  FEEDBACK_STATUS,
  ANALYTICS_EVENT_TYPE,
  NOTIFICATION_TYPE,
  PAGINATION,
  ERROR_CODES,
} from '../../src/config/constants.js';

describe('config/constants.js — Application Constants & Enums', () => {
  it('freezes all enum objects to prevent runtime mutations', () => {
    expect(Object.isFrozen(ROLES)).toBe(true);
    expect(Object.isFrozen(BOOTH_SIZE)).toBe(true);
    expect(Object.isFrozen(BOOTH_STATUS)).toBe(true);
    expect(Object.isFrozen(APPLICATION_STATUS)).toBe(true);
    expect(Object.isFrozen(EXPO_STATUS)).toBe(true);
    expect(Object.isFrozen(SESSION_TYPE)).toBe(true);
    expect(Object.isFrozen(SESSION_STATUS)).toBe(true);
    expect(Object.isFrozen(ENGAGEMENT_KIND)).toBe(true);
    expect(Object.isFrozen(CONVERSATION_TYPE)).toBe(true);
    expect(Object.isFrozen(FEEDBACK_CATEGORY)).toBe(true);
    expect(Object.isFrozen(FEEDBACK_STATUS)).toBe(true);
    expect(Object.isFrozen(ANALYTICS_EVENT_TYPE)).toBe(true);
    expect(Object.isFrozen(NOTIFICATION_TYPE)).toBe(true);
    expect(Object.isFrozen(PAGINATION)).toBe(true);
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });

  it('defines exact expected user roles (Rule BR-1)', () => {
    expect(ROLES).toEqual({
      ADMIN: 'admin',
      EXHIBITOR: 'exhibitor',
      ATTENDEE: 'attendee',
    });
  });

  it('defines booth sizes and statuses according to architecture.md §6.2', () => {
    expect(Object.values(BOOTH_SIZE)).toEqual(
      expect.arrayContaining(['small', 'medium', 'large'])
    );
    expect(Object.values(BOOTH_STATUS)).toEqual(
      expect.arrayContaining(['available', 'reserved', 'allocated', 'blocked'])
    );
  });

  it('defines expo lifecycle states according to prd.md §4.2', () => {
    expect(Object.values(EXPO_STATUS)).toEqual(
      expect.arrayContaining(['draft', 'published', 'ongoing', 'completed', 'cancelled'])
    );
  });

  it('defines pagination boundaries (Invariant #11)', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    expect(PAGINATION.MAX_LIMIT).toBe(100);
  });
});
