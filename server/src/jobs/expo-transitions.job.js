/**
 * @fileoverview Expo Status Transition Background Job.
 * Automatically transitions expos along their status lifecycle:
 *   published -> ongoing (when startDate <= now < endDate)
 *   ongoing -> completed (when endDate <= now)
 *   published -> completed (when endDate <= now)
 *
 * Architecture §10. T-3.9. PRD §FR-EXPO-02.
 */

import cron from 'node-cron';
import { Expo } from '../models/expo.model.js';
import { EXPO_STATUS } from '../config/constants.js';
import { logger } from '../config/logger.js';

/**
 * Executes a single status transition cycle using referenceDate.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<{
 *   toOngoingCount: number,
 *   toCompletedCount: number,
 *   referenceDate: Date
 * }>}
 */
export async function runExpoStatusTransitions(referenceDate = new Date()) {
  const ref = new Date(referenceDate);

  logger.debug({ referenceDate: ref.toISOString() }, 'Running expo status transitions check');

  // 1. Transition published -> ongoing (startDate <= ref and endDate > ref)
  const ongoingResult = await Expo.updateMany(
    {
      isDeleted: { $ne: true },
      status: EXPO_STATUS.PUBLISHED,
      startDate: { $lte: ref },
      endDate: { $gt: ref },
    },
    {
      $set: { status: EXPO_STATUS.ONGOING },
    }
  );

  // 2. Transition ongoing -> completed (endDate <= ref)
  const completedResult = await Expo.updateMany(
    {
      isDeleted: { $ne: true },
      status: EXPO_STATUS.ONGOING,
      endDate: { $lte: ref },
    },
    {
      $set: { status: EXPO_STATUS.COMPLETED },
    }
  );

  // 3. Transition published -> completed (if expo was published but is already past endDate)
  const directCompletedResult = await Expo.updateMany(
    {
      isDeleted: { $ne: true },
      status: EXPO_STATUS.PUBLISHED,
      endDate: { $lte: ref },
    },
    {
      $set: { status: EXPO_STATUS.COMPLETED },
    }
  );

  const toOngoingCount = ongoingResult.modifiedCount || 0;
  const toCompletedCount = (completedResult.modifiedCount || 0) + (directCompletedResult.modifiedCount || 0);

  if (toOngoingCount > 0 || toCompletedCount > 0) {
    logger.info(
      {
        toOngoingCount,
        toCompletedCount,
        referenceDate: ref.toISOString(),
      },
      'Expo status transition completed'
    );
  }

  return {
    toOngoingCount,
    toCompletedCount,
    referenceDate: ref,
  };
}

/** @type {cron.ScheduledTask|null} */
let scheduledJob = null;

/**
 * Starts the hourly expo status transition cron job (Architecture §10).
 * Cron schedule: '0 * * * *' (at the start of every hour).
 *
 * @param {string} [cronExpression='0 * * * *']
 * @returns {cron.ScheduledTask}
 */
export function startExpoStatusTransitionJob(cronExpression = '0 * * * *') {
  if (scheduledJob) {
    logger.warn('Expo status transition cron job is already running');
    return scheduledJob;
  }

  scheduledJob = cron.schedule(cronExpression, async () => {
    try {
      await runExpoStatusTransitions();
    } catch (err) {
      logger.error({ err }, 'Error during expo status transition job');
    }
  });

  logger.info({ cronExpression }, 'Expo status transition cron job scheduled');
  return scheduledJob;
}

/**
 * Stops the scheduled cron job if running.
 */
export function stopExpoStatusTransitionJob() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    logger.info('Expo status transition cron job stopped');
  }
}
