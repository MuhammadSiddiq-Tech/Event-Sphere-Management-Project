/**
 * @fileoverview Feedback Validation Schemas.
 * T-7.11. FR-SYS-02, FR-ADM-01.
 */

import { z } from 'zod';
import { FEEDBACK_CATEGORY, FEEDBACK_STATUS } from '../../config/constants.js';

export const submitFeedbackSchema = z.object({
  category: z.nativeEnum(FEEDBACK_CATEGORY, {
    errorMap: () => ({ message: 'Invalid feedback category' }),
  }),
  message: z
    .string({ required_error: 'Feedback message is required' })
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(2000, 'Message cannot exceed 2000 characters'),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  expo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid expo ID format')
    .optional()
    .nullable(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z
    .nativeEnum(FEEDBACK_STATUS, {
      errorMap: () => ({ message: 'Invalid feedback status' }),
    })
    .optional(),
  adminNotes: z
    .string()
    .max(2000, 'Admin notes cannot exceed 2000 characters')
    .trim()
    .optional(),
});
