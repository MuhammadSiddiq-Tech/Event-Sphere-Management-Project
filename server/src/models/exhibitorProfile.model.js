/**
 * @fileoverview ExhibitorProfile Mongoose Model.
 * T-4.1. Architecture §6.2, FR-EXP-02.
 *
 * One profile per user (unique on `user`).
 * Stores company info, contacts, documents, staff, products, social links.
 * Text-indexed on companyName + description for public search (T-4.2).
 */

import mongoose from 'mongoose';

/** Expo categories — mirrors expo model categories for filter consistency. */
export const EXHIBITOR_CATEGORIES = Object.freeze([
  'technology',
  'healthcare',
  'education',
  'finance',
  'retail',
  'manufacturing',
  'food-beverage',
  'entertainment',
  'automotive',
  'real-estate',
  'other',
]);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    filename: { type: String, trim: true },
    type: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const staffMemberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    title: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    instagram: { type: String, trim: true },
    facebook: { type: String, trim: true },
  },
  { _id: false }
);

const exhibitorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    website: {
      type: String,
      trim: true,
    },

    logo: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    contacts: {
      type: [contactSchema],
      default: [],
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    staff: {
      type: [staffMemberSchema],
      default: [],
    },

    products: {
      type: [String],
      default: [],
    },

    socialLinks: {
      type: socialLinksSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
exhibitorProfileSchema.index(
  { companyName: 'text', description: 'text' },
  { weights: { companyName: 10, description: 1 } }
);

export const ExhibitorProfile = mongoose.model('ExhibitorProfile', exhibitorProfileSchema);
