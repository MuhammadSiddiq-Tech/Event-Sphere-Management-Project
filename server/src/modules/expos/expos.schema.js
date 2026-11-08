/**
 * @fileoverview Zod validation schemas for Expo routes.
 * T-3.1, T-3.2, T-3.3. FR-EXPO-01/02.
 */

import { z } from 'zod';

// ─── Common sub-schemas ───────────────────────────────────────────────────────

const venueSchema = z
  .object({
    name: z.string().max(120).optional(),
    address: z.string().max(255).optional(),
    city: z.string().max(80).optional(),
    country: z.string().max(80).optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .optional();

// ─── Create Expo body ─────────────────────────────────────────────────────────

export const createExpoBodySchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(120),
    description: z.string().max(5000).optional(),
    bannerUrl: z.string().url('Invalid banner URL').optional(),
    category: z.string().max(80).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    venue: venueSchema,
    startDate: z.string().datetime({ message: 'startDate must be an ISO 8601 date-time' }).optional(),
    endDate: z.string().datetime({ message: 'endDate must be an ISO 8601 date-time' }).optional(),
    maxBooths: z.number().int().min(1).max(5000).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );

export const createExpoSchema = { body: createExpoBodySchema };

// ─── Update Expo body ─────────────────────────────────────────────────────────

export const updateExpoBodySchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().max(5000).optional(),
    bannerUrl: z.string().url('Invalid banner URL').optional().nullable(),
    category: z.string().max(80).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    venue: venueSchema,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    maxBooths: z.number().int().min(1).max(5000).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateExpoSchema = { body: updateExpoBodySchema };

// ─── List expos query params ──────────────────────────────────────────────────

export const listExposQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z
    .enum(['draft', 'published', 'ongoing', 'completed', 'cancelled'])
    .optional(),
  category: z.string().max(80).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  sort: z.enum(['startDate', '-startDate', 'title', '-title', 'createdAt', '-createdAt']).optional(),
});

export const listExposSchema = { query: listExposQuerySchema };

// ─── Expo ID param ────────────────────────────────────────────────────────────

export const expoIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid expo ID'),
});

export const expoIdSchema = { params: expoIdParamsSchema };

// ─── Slug param ───────────────────────────────────────────────────────────────

export const expoSlugParamsSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const expoSlugSchema = { params: expoSlugParamsSchema };
