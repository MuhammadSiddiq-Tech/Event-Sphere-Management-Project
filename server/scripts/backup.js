#!/usr/bin/env node
/**
 * @fileoverview MongoDB backup script using mongodump.
 * T-9.9, NFR-OPS-01, NFR-REL-02.
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Environment variables required (from .env or set directly):
 *   MONGO_URI   — MongoDB connection string
 *   BACKUP_DIR  — Output directory for backup archives (default: ./backups)
 *
 * Output: backups/eventsphere-YYYY-MM-DD-HH-mm.tar.gz
 *
 * Restore procedure (documented in /docs/testing/backup-restore-drill.md):
 *   mongorestore --uri="$MONGO_URI" --archive=backups/<archive>.tar.gz --gzip
 */

import { exec } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventsphere';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('');
}

async function main() {
  const timestamp = getTimestamp();
  const archiveName = `eventsphere-${timestamp}.tar.gz`;
  const archivePath = join(BACKUP_DIR, archiveName);

  // Ensure backup directory exists
  mkdirSync(BACKUP_DIR, { recursive: true });

  console.log(`[backup] Starting MongoDB dump → ${archivePath}`);

  const cmd = `mongodump --uri="${MONGO_URI}" --archive="${archivePath}" --gzip`;

  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    console.log(`[backup] ✅ Backup completed: ${archivePath}`);
  } catch (err) {
    console.error(`[backup] ❌ Backup FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
