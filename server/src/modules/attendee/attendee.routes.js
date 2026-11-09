/**
 * @fileoverview Attendee Route Definitions.
 * T-6.1 — Expo registrations (register, list mine).
 * T-6.2 — Session registrations (register, unregister).
 * T-6.3 — Session bookmarks & My agenda (bookmark, unbookmark, GET /sessions/me).
 * T-6.4 — Session reminder runner trigger.
 *
 * NOTE: Static routes MUST be registered before dynamic routes!
 *   /api/v1/expos/me/registrations BEFORE /api/v1/expos/:id
 *   /api/v1/sessions/me BEFORE /api/v1/sessions/:id
 */

import { router } from '../../core/router.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  expoIdParamSchema,
  sessionIdParamSchema,
  listRegistrationsSchema,
  listMySessionsSchema,
} from './attendee.schema.js';
import { attendeeController } from './attendee.controller.js';

// ─── T-6.1: Expo Registrations ───────────────────────────────────────────────

// GET /api/v1/expos/me/registrations — My registered expos (STATIC before /:id)
router.get(
  '/api/v1/expos/me/registrations',
  requireAuth,
  validate({ query: listRegistrationsSchema }),
  attendeeController.listMyExpoRegistrations
);

// GET /api/v1/registrations/mine — Alias for convenience
router.get(
  '/api/v1/registrations/mine',
  requireAuth,
  validate({ query: listRegistrationsSchema }),
  attendeeController.listMyExpoRegistrations
);

// GET /api/v1/expos/:id/registration — Check my registration for an expo
router.get(
  '/api/v1/expos/:id/registration',
  requireAuth,
  validate({ params: expoIdParamSchema }),
  attendeeController.getMyExpoRegistration
);

// POST /api/v1/expos/:id/register — Register for an expo
router.post(
  '/api/v1/expos/:id/register',
  requireAuth,
  validate({ params: expoIdParamSchema }),
  attendeeController.registerForExpo
);

// ─── T-6.3: My Agenda is registered in sessions.routes.js before /api/v1/sessions/:id

// ─── T-6.2: Session Registration ─────────────────────────────────────────────

// POST /api/v1/sessions/:id/register — Register for a session
router.post(
  '/api/v1/sessions/:id/register',
  requireAuth,
  validate({ params: sessionIdParamSchema }),
  attendeeController.registerForSession
);

// DELETE /api/v1/sessions/:id/register — Unregister from a session
router.delete(
  '/api/v1/sessions/:id/register',
  requireAuth,
  validate({ params: sessionIdParamSchema }),
  attendeeController.unregisterFromSession
);

// ─── T-6.3: Session Bookmarks ────────────────────────────────────────────────

// POST /api/v1/sessions/:id/bookmark — Bookmark a session
router.post(
  '/api/v1/sessions/:id/bookmark',
  requireAuth,
  validate({ params: sessionIdParamSchema }),
  attendeeController.bookmarkSession
);

// DELETE /api/v1/sessions/:id/bookmark — Unbookmark a session
router.delete(
  '/api/v1/sessions/:id/bookmark',
  requireAuth,
  validate({ params: sessionIdParamSchema }),
  attendeeController.unbookmarkSession
);

// ─── T-6.4: Reminder Job Trigger ─────────────────────────────────────────────

// POST /api/v1/admin/reminders/run — Trigger reminder background job (Admin only)
router.post(
  '/api/v1/admin/reminders/run',
  requireAuth,
  requireRole('admin'),
  attendeeController.triggerReminders
);
