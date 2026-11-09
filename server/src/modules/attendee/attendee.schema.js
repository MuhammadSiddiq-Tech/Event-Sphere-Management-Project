/**
 * @fileoverview Zod validation schemas for Attendee module.
 * T-6.1, T-6.2, T-6.3.
 */

import { z } from 'zod';
import { ENGAGEMENT_KIND } from '../../config/constants.js';

export const expoIdParamSchema = z.object({
  id: z.string().min(1, 'Expo ID is required'),
});

export const sessionIdParamSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
});

export const listRegistrationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listMySessionsSchema = z.object({
  expo: z.string().optional(),
  kind: z.enum(Object.values(ENGAGEMENT_KIND)).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
