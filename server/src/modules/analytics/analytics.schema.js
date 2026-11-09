/**
 * @fileoverview Analytics Validation Schemas.
 * T-8.1, T-8.3. FR-ANA-01.
 */

import { z } from 'zod';
import { ANALYTICS_EVENT_TYPE } from '../../config/constants.js';

export const trackEventSchema = z.object({
  type: z.nativeEnum(ANALYTICS_EVENT_TYPE, {
    errorMap: () => ({ message: 'Invalid analytics event type' }),
  }),
  expoId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid expoId format')
    .optional()
    .nullable(),
  target: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid target ID format')
    .optional()
    .nullable(),
  targetModel: z.enum(['Booth', 'Session', 'ExhibitorProfile']).optional().nullable(),
  meta: z.record(z.unknown()).optional(),
});
