/**
 * @fileoverview Background Jobs Manager.
 * Architecture §10.
 */

import {
  startExpoStatusTransitionJob,
  stopExpoStatusTransitionJob,
  runExpoStatusTransitions,
} from './expo-transitions.job.js';
import { logger } from '../config/logger.js';

/**
 * Initializes and starts all background jobs.
 */
export function startAllJobs() {
  logger.info('Initializing background jobs...');
  startExpoStatusTransitionJob();
}

/**
 * Gracefully stops all background jobs.
 */
export function stopAllJobs() {
  logger.info('Stopping all background jobs...');
  stopExpoStatusTransitionJob();
}

export {
  startExpoStatusTransitionJob,
  stopExpoStatusTransitionJob,
  runExpoStatusTransitions,
};
