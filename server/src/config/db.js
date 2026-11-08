/**
 * @fileoverview MongoDB connection with retry and graceful shutdown.
 * T-1.1. NFR-REL-01.
 */

import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with retry logic.
 * @returns {Promise<void>}
 */
export async function connectDb() {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      attempt++;
      logger.warn({ err, attempt }, `MongoDB connection failed — retrying in ${RETRY_DELAY_MS}ms`);
      if (attempt >= MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

/**
 * Gracefully disconnect from MongoDB.
 * @returns {Promise<void>}
 */
export async function disconnectDb() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

/**
 * Check if the database is reachable (used in /health).
 * @returns {Promise<boolean>}
 */
export async function isDbHealthy() {
  try {
    const state = mongoose.connection.readyState;
    // 1 = connected
    if (state !== 1) return false;
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
