/**
 * @fileoverview Application-wide constants and enums.
 * Import from this module — never use magic strings in code. Rule 1.6.
 */

/** @enum {string} */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  EXHIBITOR: 'exhibitor',
  ATTENDEE: 'attendee',
});

/** @enum {string} */
export const BOOTH_SIZE = Object.freeze({
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
});

/** @enum {string} */
export const BOOTH_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  ALLOCATED: 'allocated',
  BLOCKED: 'blocked',
});

/** @enum {string} */
export const APPLICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});

/** @enum {string} */
export const EXPO_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

/** @enum {string} */
export const SESSION_TYPE = Object.freeze({
  KEYNOTE: 'keynote',
  SESSION: 'session',
  WORKSHOP: 'workshop',
});

/** @enum {string} */
export const SESSION_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  UPDATED: 'updated',
  CANCELLED: 'cancelled',
});

/** @enum {string} */
export const ENGAGEMENT_KIND = Object.freeze({
  BOOKMARK: 'bookmark',
  REGISTERED: 'registered',
});

/** @enum {string} */
export const CONVERSATION_TYPE = Object.freeze({
  SUPPORT: 'support',
  EXHIBITOR_ATTENDEE: 'exhibitor-attendee',
  EXHIBITOR_EXHIBITOR: 'exhibitor-exhibitor',
});

/** @enum {string} */
export const FEEDBACK_CATEGORY = Object.freeze({
  SUGGESTION: 'suggestion',
  ISSUE: 'issue',
  SUPPORT: 'support',
});

/** @enum {string} */
export const FEEDBACK_STATUS = Object.freeze({
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  RESOLVED: 'resolved',
});

/** @enum {string} */
export const ANALYTICS_EVENT_TYPE = Object.freeze({
  BOOTH_VIEW: 'booth_view',
  PROFILE_VIEW: 'profile_view',
  SESSION_VIEW: 'session_view',
  SESSION_CHECKIN: 'session_checkin',
  SEARCH: 'search',
});

/** @enum {string} */
export const NOTIFICATION_TYPE = Object.freeze({
  APPLICATION_RESULT: 'application_result',
  BOOTH_CHANGED: 'booth_changed',
  SESSION_UPDATED: 'session_updated',
  SESSION_REMINDER: 'session_reminder',
  NEW_MESSAGE: 'new_message',
});

/** Pagination defaults. Rule 3.2.4 */
export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

/** Error codes used in the response envelope. Architecture §7.1 */
export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNSUPPORTED_MEDIA: 'UNSUPPORTED_MEDIA',
});
