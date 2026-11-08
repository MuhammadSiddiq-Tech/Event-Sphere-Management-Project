/**
 * @fileoverview Zod schemas for Users routes.
 * T-2.8. FR-AUTH-06.
 */

import { z } from 'zod';

export const updateProfileBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field (name, phone, or avatarUrl) must be provided' }
);

export const updateProfileSchema = {
  body: updateProfileBodySchema,
};

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = {
  body: changePasswordBodySchema,
};
