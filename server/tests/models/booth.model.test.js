/**
 * @fileoverview Unit tests for the Booth model.
 * T-3.4. FR-EXPO-03.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb } from '../../src/config/db.js';
import { Booth } from '../../src/models/booth.model.js';
import { BOOTH_STATUS } from '../../src/config/constants.js';

describe('T-3.4: Booth Model', () => {
  let expoId;

  beforeAll(async () => {
    await connectDb();
    await Booth.init();
    expoId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Booth.deleteMany({});
  });

  it('creates a valid AVAILABLE booth with required fields', async () => {
    const booth = await Booth.create({
      expo: expoId,
      code: 'A1',
      geometry: { x: 0, y: 0, w: 2, h: 2 },
    });

    expect(booth.code).toBe('A1');
    expect(booth.status).toBe(BOOTH_STATUS.AVAILABLE);
    expect(booth.expo.toString()).toBe(expoId.toString());
    expect(booth.geometry.x).toBe(0);
    expect(booth.geometry.w).toBe(2);
  });

  it('enforces unique {expo, code} compound index', async () => {
    await Booth.create({
      expo: expoId,
      code: 'B1',
      geometry: { x: 0, y: 0, w: 1, h: 1 },
    });

    await expect(
      Booth.create({
        expo: expoId,
        code: 'B1',
        geometry: { x: 5, y: 5, w: 1, h: 1 },
      })
    ).rejects.toThrow();
  });

  it('allows same code in different expos', async () => {
    const expoId2 = new mongoose.Types.ObjectId();

    await Booth.create({ expo: expoId, code: 'C1', geometry: { x: 0, y: 0, w: 1, h: 1 } });
    const booth2 = await Booth.create({ expo: expoId2, code: 'C1', geometry: { x: 0, y: 0, w: 1, h: 1 } });

    expect(booth2.code).toBe('C1');
  });

  it('rejects an invalid status value', async () => {
    await expect(
      Booth.create({
        expo: expoId,
        code: 'D1',
        geometry: { x: 0, y: 0, w: 1, h: 1 },
        status: 'invalid_status',
      })
    ).rejects.toThrow();
  });

  it('requires geometry fields (w and h must be >= 1)', async () => {
    await expect(
      Booth.create({
        expo: expoId,
        code: 'E1',
        geometry: { x: 0, y: 0, w: 0, h: 1 },
      })
    ).rejects.toThrow();
  });

  it('toJSON transform adds id and removes __v', async () => {
    const booth = await Booth.create({
      expo: expoId,
      code: 'F1',
      geometry: { x: 0, y: 0, w: 1, h: 1 },
    });

    const json = booth.toJSON();
    expect(json.id).toBeDefined();
    expect(json.__v).toBeUndefined();
  });
});
