/**
 * @fileoverview Zod schemas for Authentication routes.
 * Rules §3.2.5.
 */

import { z } from 'zod';
import { ROLES } from '../../config/constants.js';

export const registerBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum([ROLES.EXHIBITOR, ROLES.ATTENDEE], {
    errorMap: () => ({ message: 'Role must be either exhibitor or attendee' }),
  }),
  phone: z.string().optional(),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the privacy policy' }),
  }),
  marketingConsent: z.boolean().optional(),
});

export const registerSchema = {
  body: registerBodySchema,
};

export const loginBodySchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const loginSchema = {
  body: loginBodySchema,
};
