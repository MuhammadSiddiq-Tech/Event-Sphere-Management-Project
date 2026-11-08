/**
 * @fileoverview Applications Zod Validation Schemas.
 * T-4.4 (submit/withdraw), T-4.5 (admin list/filter), T-4.6 (review).
 */

import { z } from 'zod';

const boothPrefSchema = z
  .object({
    size: z.enum(['small', 'medium', 'large']).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

/** POST /api/v1/expos/:id/applications — submit application */
export const submitApplicationSchema = z
  .object({
    boothPreferences: z.array(boothPrefSchema).max(5).optional(),
    documents: z
      .array(
        z
          .object({
            url: z.string().trim().url(),
            filename: z.string().trim().max(200).optional(),
            type: z.string().trim().max(80).optional(),
          })
          .strict()
      )
      .max(20)
      .optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

/** GET /api/v1/expos/:id/applications — admin list/filter query */
export const listApplicationsSchema = z.object({
  status: z
    .enum(['pending', 'approved', 'rejected', 'withdrawn'])
    .optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** GET /api/v1/applications — admin list all (optionally cross-expo) */
export const listAllApplicationsSchema = z.object({
  status: z
    .enum(['pending', 'approved', 'rejected', 'withdrawn'])
    .optional(),
  expo: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** POST /api/v1/applications/:id/approve */
export const approveApplicationSchema = z
  .object({
    boothId: z.string().trim().optional(),
    reviewNote: z.string().trim().max(1000).optional(),
  })
  .strict();

/** POST /api/v1/applications/:id/reject */
export const rejectApplicationSchema = z
  .object({
    reason: z.string().trim().min(1, 'Rejection reason is required').max(1000),
    reviewNote: z.string().trim().max(1000).optional(),
  })
  .strict();

/** :id param validation */
export const applicationIdSchema = z.object({
  id: z.string().trim().min(1),
});

/** :id param for expo */
export const expoIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
