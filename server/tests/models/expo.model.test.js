/**
 * @fileoverview Unit tests for the Expo model.
 * T-3.1. FR-EXPO-01/02.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb } from '../../src/config/db.js';
import { Expo } from '../../src/models/expo.model.js';
import { EXPO_STATUS } from '../../src/config/constants.js';

describe('T-3.1: Expo Model', () => {
  let adminId;

  beforeAll(async () => {
    await connectDb();
    await Expo.init();
    adminId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Expo.deleteMany({});
  });

  it('creates a valid DRAFT expo with required fields', async () => {
    const expo = await Expo.create({
      title: 'Tech Summit 2026',
      slug: 'tech-summit-2026-abc123',
      createdBy: adminId,
    });

    expect(expo.title).toBe('Tech Summit 2026');
    expect(expo.slug).toBe('tech-summit-2026-abc123');
    expect(expo.status).toBe(EXPO_STATUS.DRAFT);
    expect(expo.isDeleted).toBe(false);
    expect(expo.createdAt).toBeDefined();
    expect(expo.updatedAt).toBeDefined();
  });

  it('enforces slug uniqueness (unique index)', async () => {
    await Expo.create({
      title: 'Expo One',
      slug: 'unique-slug-abc',
      createdBy: adminId,
    });

    await expect(
      Expo.create({ title: 'Expo Two', slug: 'unique-slug-abc', createdBy: adminId })
    ).rejects.toThrow();
  });

  it('rejects an expo with an invalid status value', async () => {
    await expect(
      Expo.create({
        title: 'Bad Status Expo',
        slug: 'bad-status-expo-xyz',
        createdBy: adminId,
        status: 'invalid_status',
      })
    ).rejects.toThrow();
  });

  it('stores venue sub-document correctly', async () => {
    const expo = await Expo.create({
      title: 'Venue Expo',
      slug: 'venue-expo-abc',
      createdBy: adminId,
      venue: {
        name: 'Karachi Expo Centre',
        city: 'Karachi',
        country: 'Pakistan',
      },
    });

    expect(expo.venue.name).toBe('Karachi Expo Centre');
    expect(expo.venue.city).toBe('Karachi');
    expect(expo.venue.country).toBe('Pakistan');
  });

  it('toJSON transform hides isDeleted and __v', async () => {
    const expo = await Expo.create({
      title: 'JSON Expo',
      slug: 'json-expo-aaa',
      createdBy: adminId,
    });

    const json = expo.toJSON();
    expect(json.isDeleted).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.id).toBeDefined();
  });

  it('soft-delete fields (isDeleted, deletedAt) work correctly', async () => {
    const expo = await Expo.create({
      title: 'Soft Delete Expo',
      slug: 'soft-delete-abc',
      createdBy: adminId,
    });

    expo.isDeleted = true;
    expo.deletedAt = new Date();
    await expo.save();

    const found = await Expo.findOne({ slug: 'soft-delete-abc' });
    expect(found.isDeleted).toBe(true);
    expect(found.deletedAt).toBeDefined();
  });
});
