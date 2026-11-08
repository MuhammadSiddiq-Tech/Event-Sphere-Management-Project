/**
 * @fileoverview ExhibitorProfile Zod Validation Schemas.
 * T-4.1, T-4.2. FR-EXP-02, FR-ATT-03/04.
 */

import { z } from 'zod';

const contactSchema = z
  .object({
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(30).optional(),
    role: z.string().trim().max(80).optional(),
  })
  .strict();

const documentSchema = z
  .object({
    url: z.string().trim().url(),
    filename: z.string().trim().max(200).optional(),
    type: z.string().trim().max(80).optional(),
  })
  .strict();

const staffSchema = z
  .object({
    name: z.string().trim().max(100).optional(),
    title: z.string().trim().max(100).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(30).optional(),
    bio: z.string().trim().max(1000).optional(),
  })
  .strict();

const socialLinksSchema = z
  .object({
    linkedin: z.string().trim().url().optional().or(z.literal('')),
    twitter: z.string().trim().url().optional().or(z.literal('')),
    instagram: z.string().trim().url().optional().or(z.literal('')),
    facebook: z.string().trim().url().optional().or(z.literal('')),
  })
  .strict()
  .optional();

/** PUT /api/v1/exhibitors/me — upsert exhibitor profile */
export const upsertProfileSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional(),
    website: z.string().trim().url().optional().or(z.literal('')),
    logo: z.string().trim().url().optional().or(z.literal('')),
    category: z.string().trim().max(80).optional(),
    contacts: z.array(contactSchema).max(20).optional(),
    documents: z.array(documentSchema).max(50).optional(),
    staff: z.array(staffSchema).max(50).optional(),
    products: z.array(z.string().trim().max(200)).max(100).optional(),
    socialLinks: socialLinksSchema,
  })
  .strict();

/** GET /api/v1/exhibitors — public list query params */
export const listExhibitorsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).optional(),
  expo: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** GET /api/v1/exhibitors/:userId — single exhibitor by user ID */
export const exhibitorUserIdSchema = z.object({
  userId: z.string().trim().min(1),
});
