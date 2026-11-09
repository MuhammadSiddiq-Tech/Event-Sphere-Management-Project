/**
 * @fileoverview Zod validation schemas for the Sessions module.
 * T-5.2 — CRUD input validation.
 * T-5.3 — Cancel flow validation.
 */

import { z } from 'zod';
import { SESSION_TYPE, SESSION_STATUS } from '../../config/constants.js';

// ─── Reusable ─────────────────────────────────────────────────────────────────

const sessionIdSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
});

const expoIdParamSchema = z.object({
  id: z.string().min(1, 'Expo ID is required'),
});

// Speaker sub-document
const speakerSchema = z.object({
  name: z.string().min(1).max(120),
  org: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
});

// ─── Create Session ───────────────────────────────────────────────────────────

const createSessionSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(120),
    description: z.string().max(2000).optional(),
    type: z.enum(Object.values(SESSION_TYPE), {
      errorMap: () => ({
        message: `type must be one of: ${Object.values(SESSION_TYPE).join(', ')}`,
      }),
    }),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 datetime' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 datetime' }),
    room: z.string().max(80).optional(),
    track: z.string().max(80).optional(),
    capacity: z.number().int().min(1).optional(),
    speakers: z.array(speakerSchema).optional(),
    tags: z.array(z.string().max(50)).optional(),
  })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

// ─── Update Session ───────────────────────────────────────────────────────────

const updateSessionSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().max(2000).optional(),
    type: z
      .enum(Object.values(SESSION_TYPE), {
        errorMap: () => ({
          message: `type must be one of: ${Object.values(SESSION_TYPE).join(', ')}`,
        }),
      })
      .optional(),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 datetime' }).optional(),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 datetime' }).optional(),
    room: z.string().max(80).optional(),
    track: z.string().max(80).optional(),
    capacity: z.number().int().min(1).optional(),
    speakers: z.array(speakerSchema).optional(),
    tags: z.array(z.string().max(50)).optional(),
    updatedReason: z.string().max(500).optional(),
  })
  .refine(
    (d) => {
      if (d.startTime && d.endTime) {
        return new Date(d.endTime) > new Date(d.startTime);
      }
      return true;
    },
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    }
  );

// ─── Cancel Session ───────────────────────────────────────────────────────────

const cancelSessionSchema = z.object({
  cancelledReason: z.string().min(1, 'Cancellation reason is required').max(500),
});

// ─── List Sessions (public — T-5.4) ──────────────────────────────────────────

const listSessionsSchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'day must be in YYYY-MM-DD format')
    .optional(),
  track: z.string().max(80).optional(),
  type: z.enum(Object.values(SESSION_TYPE)).optional(),
  room: z.string().max(80).optional(),
  status: z.enum(Object.values(SESSION_STATUS)).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export {
  sessionIdSchema,
  expoIdParamSchema,
  createSessionSchema,
  updateSessionSchema,
  cancelSessionSchema,
  listSessionsSchema,
};
