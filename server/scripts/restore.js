#!/usr/bin/env node
/**
 * @fileoverview MongoDB restore script using mongorestore.
 * T-9.9, NFR-OPS-01, NFR-REL-02.
 *
 * Usage:
 *   node scripts/restore.js <archive-path>
 *   node scripts/restore.js backups/eventsphere-2026-11-09-16-30.tar.gz
 *
 * Environment variables:
 *   MONGO_URI — MongoDB connection string (default: mongodb://localhost:27017/eventsphere)
 *
 * WARNING: This will MERGE/OVERWRITE existing collections.
 * Pass --drop flag to drop collections before restore:
 *   node scripts/restore.js <archive> --drop
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventsphere';
const archivePath = process.argv[2];
const dropFlag = process.argv.includes('--drop') ? '--drop' : '';

if (!archivePath) {
  console.error('[restore] Usage: node scripts/restore.js <archive-path> [--drop]');
  process.exit(1);
}

if (!existsSync(archivePath)) {
  console.error(`[restore] Archive not found: ${archivePath}`);
  process.exit(1);
}

async function main() {
  console.log(`[restore] Restoring from ${archivePath}…`);
  if (dropFlag) console.log('[restore] --drop: existing collections will be dropped first');

  const cmd = `mongorestore --uri="${MONGO_URI}" --archive="${archivePath}" --gzip ${dropFlag}`;

  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    console.log(`[restore] ✅ Restore completed from ${archivePath}`);
  } catch (err) {
    console.error(`[restore] ❌ Restore FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
