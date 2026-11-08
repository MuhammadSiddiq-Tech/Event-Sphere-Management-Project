/**
 * @fileoverview Tests for Expo Status Transition Background Job.
 * T-3.9. Architecture §10, PRD §FR-EXPO-02.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { Expo } from '../../src/models/expo.model.js';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { EXPO_STATUS } from '../../src/config/constants.js';
import {
  runExpoStatusTransitions,
  startExpoStatusTransitionJob,
  stopExpoStatusTransitionJob,
} from '../../src/jobs/expo-transitions.job.js';

describe('T-3.9: Expo Status Transition Job', () => {
  let adminId;

  beforeAll(async () => {
    await connectDb();
    adminId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  beforeEach(async () => {
    await Expo.deleteMany({});
  });

  afterEach(() => {
    stopExpoStatusTransitionJob();
  });

  describe('published -> ongoing transition', () => {
    it('transitions a published expo to ongoing when startDate <= now < endDate', async () => {
      const now = new Date('2026-10-15T12:00:00Z');

      const expo = await Expo.create({
        title: 'Autumn Tech Summit',
        slug: 'autumn-tech-summit-01',
        createdBy: adminId,
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(1);

      const updated = await Expo.findById(expo._id);
      expect(updated.status).toBe(EXPO_STATUS.ONGOING);
    });

    it('does NOT transition a published expo when startDate is in the future', async () => {
      const now = new Date('2026-10-10T12:00:00Z');

      const expo = await Expo.create({
        title: 'Future Tech Summit',
        slug: 'future-tech-summit-01',
        createdBy: adminId,
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(0);

      const dbExpo = await Expo.findById(expo._id);
      expect(dbExpo.status).toBe(EXPO_STATUS.PUBLISHED);
    });
  });

  describe('ongoing -> completed transition', () => {
    it('transitions an ongoing expo to completed when endDate <= now', async () => {
      const now = new Date('2026-10-18T19:00:00Z');

      const expo = await Expo.create({
        title: 'Ending Tech Summit',
        slug: 'ending-tech-summit-01',
        createdBy: adminId,
        status: EXPO_STATUS.ONGOING,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toCompletedCount).toBe(1);

      const updated = await Expo.findById(expo._id);
      expect(updated.status).toBe(EXPO_STATUS.COMPLETED);
    });

    it('does NOT transition an ongoing expo when endDate has not arrived', async () => {
      const now = new Date('2026-10-16T12:00:00Z');

      const expo = await Expo.create({
        title: 'Current Tech Summit',
        slug: 'current-tech-summit-01',
        createdBy: adminId,
        status: EXPO_STATUS.ONGOING,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toCompletedCount).toBe(0);

      const dbExpo = await Expo.findById(expo._id);
      expect(dbExpo.status).toBe(EXPO_STATUS.ONGOING);
    });
  });

  describe('direct published -> completed transition', () => {
    it('transitions a published expo directly to completed if already past endDate', async () => {
      const now = new Date('2026-10-20T12:00:00Z');

      const expo = await Expo.create({
        title: 'Overlooked Expo',
        slug: 'overlooked-expo-01',
        createdBy: adminId,
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-10-10T09:00:00Z'),
        endDate: new Date('2026-10-12T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toCompletedCount).toBe(1);

      const updated = await Expo.findById(expo._id);
      expect(updated.status).toBe(EXPO_STATUS.COMPLETED);
    });
  });

  describe('exclusions & edge cases', () => {
    it('does NOT transition draft expos even if dates match', async () => {
      const now = new Date('2026-10-16T12:00:00Z');

      const expo = await Expo.create({
        title: 'Draft Expo',
        slug: 'draft-expo-01',
        createdBy: adminId,
        status: EXPO_STATUS.DRAFT,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(0);
      expect(result.toCompletedCount).toBe(0);

      const dbExpo = await Expo.findById(expo._id);
      expect(dbExpo.status).toBe(EXPO_STATUS.DRAFT);
    });

    it('does NOT transition cancelled expos even if dates match', async () => {
      const now = new Date('2026-10-16T12:00:00Z');

      const expo = await Expo.create({
        title: 'Cancelled Expo',
        slug: 'cancelled-expo-01',
        createdBy: adminId,
        status: EXPO_STATUS.CANCELLED,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(0);
      expect(result.toCompletedCount).toBe(0);

      const dbExpo = await Expo.findById(expo._id);
      expect(dbExpo.status).toBe(EXPO_STATUS.CANCELLED);
    });

    it('does NOT transition soft-deleted expos', async () => {
      const now = new Date('2026-10-16T12:00:00Z');

      const expo = await Expo.create({
        title: 'Deleted Expo',
        slug: 'deleted-expo-01',
        createdBy: adminId,
        status: EXPO_STATUS.PUBLISHED,
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-18T18:00:00Z'),
        isDeleted: true,
        deletedAt: new Date(),
      });

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(0);
      expect(result.toCompletedCount).toBe(0);

      const dbExpo = await Expo.findById(expo._id);
      expect(dbExpo.status).toBe(EXPO_STATUS.PUBLISHED);
    });

    it('batch handles multiple transitions simultaneously', async () => {
      const now = new Date('2026-10-16T12:00:00Z');

      // 2 published that should become ongoing
      await Expo.create([
        {
          title: 'Expo 1',
          slug: 'expo-batch-1',
          createdBy: adminId,
          status: EXPO_STATUS.PUBLISHED,
          startDate: new Date('2026-10-15T00:00:00Z'),
          endDate: new Date('2026-10-20T00:00:00Z'),
        },
        {
          title: 'Expo 2',
          slug: 'expo-batch-2',
          createdBy: adminId,
          status: EXPO_STATUS.PUBLISHED,
          startDate: new Date('2026-10-16T00:00:00Z'),
          endDate: new Date('2026-10-22T00:00:00Z'),
        },
      ]);

      // 2 ongoing that should become completed
      await Expo.create([
        {
          title: 'Expo 3',
          slug: 'expo-batch-3',
          createdBy: adminId,
          status: EXPO_STATUS.ONGOING,
          startDate: new Date('2026-10-10T00:00:00Z'),
          endDate: new Date('2026-10-15T00:00:00Z'),
        },
        {
          title: 'Expo 4',
          slug: 'expo-batch-4',
          createdBy: adminId,
          status: EXPO_STATUS.ONGOING,
          startDate: new Date('2026-10-11T00:00:00Z'),
          endDate: new Date('2026-10-16T00:00:00Z'),
        },
      ]);

      const result = await runExpoStatusTransitions(now);

      expect(result.toOngoingCount).toBe(2);
      expect(result.toCompletedCount).toBe(2);
    });
  });

  describe('Cron job lifecycle', () => {
    it('starts, rejects duplicate creation, and stops cleanly', () => {
      const job1 = startExpoStatusTransitionJob();
      expect(job1).toBeDefined();

      // Calling start again returns existing job without creating duplicate
      const job2 = startExpoStatusTransitionJob();
      expect(job2).toBe(job1);

      stopExpoStatusTransitionJob();

      // Can start again after stop
      const job3 = startExpoStatusTransitionJob();
      expect(job3).toBeDefined();
    });
  });
});
