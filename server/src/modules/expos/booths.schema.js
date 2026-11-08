/**
 * @fileoverview Zod validation schemas for Booth routes.
 * T-3.4, T-3.5. FR-EXPO-03.
 */

import { z } from 'zod';

// ─── Geometry sub-schema ──────────────────────────────────────────────────────

const geometrySchema = z.object({
  x: z.number().int().min(0, 'x must be >= 0'),
  y: z.number().int().min(0, 'y must be >= 0'),
  w: z.number().int().min(1, 'w must be >= 1'),
  h: z.number().int().min(1, 'h must be >= 1'),
});

// ─── Single booth body ────────────────────────────────────────────────────────

export const createBoothBodySchema = z.object({
  code: z
    .string()
    .min(1, 'Booth code is required')
    .max(20, 'Booth code cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9\-_]+$/, 'Booth code may only contain letters, digits, hyphens, and underscores'),
  label: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  pricePerDay: z.number().min(0).optional(),
  geometry: geometrySchema,
});

export const createBoothSchema = { body: createBoothBodySchema };

// ─── Update single booth body ─────────────────────────────────────────────────

export const updateBoothBodySchema = z
  .object({
    label: z.string().max(80).optional(),
    description: z.string().max(1000).optional(),
    size: z.enum(['small', 'medium', 'large']).optional(),
    pricePerDay: z.number().min(0).optional(),
    geometry: geometrySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateBoothSchema = { body: updateBoothBodySchema };

// ─── Bulk replace booths body ─────────────────────────────────────────────────

export const bulkBoothItemSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9\-_]+$/, 'Booth code may only contain letters, digits, hyphens, and underscores'),
  label: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  pricePerDay: z.number().min(0).optional(),
  geometry: geometrySchema,
});

export const bulkReplaceboothsBodySchema = z.object({
  booths: z
    .array(bulkBoothItemSchema)
    .min(0, 'booths must be an array')
    .max(500, 'Cannot define more than 500 booths in a single request'),
});

export const bulkReplaceBoothsSchema = { body: bulkReplaceboothsBodySchema };

// ─── List booths query ────────────────────────────────────────────────────────

export const listBoothsQuerySchema = z.object({
  status: z.enum(['available', 'reserved', 'allocated', 'blocked']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const listBoothsSchema = { query: listBoothsQuerySchema };

// ─── Path params ──────────────────────────────────────────────────────────────

export const expoIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid expo ID'),
});

export const boothIdParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid expo ID'),
  boothId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booth ID'),
});

export const reserveBoothParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid booth ID'),
});

export const expoIdSchema = { params: expoIdParamsSchema };
export const boothIdSchema = { params: boothIdParamsSchema };
export const reserveBoothSchema = { params: reserveBoothParamsSchema };

// ─── Assign / Details schemas (T-3.7) ─────────────────────────────────────────

export const assignBoothBodySchema = z.object({
  exhibitorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid exhibitor ID'),
});

export const assignBoothSchema = {
  body: assignBoothBodySchema,
};

export const updateBoothDetailsBodySchema = z
  .object({
    showcase: z.string().max(2000).optional(),
    products: z.array(z.string().min(1).max(100)).max(50).optional(),
    staff: z
      .array(
        z.object({
          name: z.string().min(1, 'Staff name is required').max(80),
          email: z.string().email('Invalid staff email').optional().or(z.literal('')),
          phone: z.string().max(30).optional().or(z.literal('')),
          title: z.string().max(80).optional().or(z.literal('')),
        })
      )
      .max(20)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (showcase, products, or staff) must be provided',
  });

export const updateBoothDetailsSchema = {
  body: updateBoothDetailsBodySchema,
};
