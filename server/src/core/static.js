/**
 * @fileoverview Static file server for /uploads.
 * Prevents path traversal attacks by verifying resolved paths stay inside UPLOAD_DIR.
 * Sets nosniff, cache headers, and Content-Disposition for documents.
 * Architecture §5.3. Rule 3.7.1.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { env } from '../config/env.js';

/** MIME type map for allowed file extensions */
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/** Extensions that should be downloaded (not displayed inline) */
const DOWNLOAD_EXTS = new Set(['.pdf']);

/**
 * Serve files from UPLOAD_DIR at /uploads/* paths.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function serveStatic(ctx, next) {
  if (!ctx.path.startsWith('/uploads/')) {
    await next();
    return;
  }

  const uploadDir = resolve(env.UPLOAD_DIR);
  const requestedFile = ctx.path.slice('/uploads/'.length);

  // Prevent path traversal — resolve and check prefix
  const filePath = resolve(join(uploadDir, requestedFile));
  if (!filePath.startsWith(uploadDir + '/') && filePath !== uploadDir) {
    ctx.res.writeHead(403);
    ctx.res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    ctx.res.writeHead(404);
    ctx.res.end('Not Found');
    return;
  }

  const stat = statSync(filePath);
  if (!stat.isFile()) {
    ctx.res.writeHead(403);
    ctx.res.end('Forbidden');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    ctx.res.writeHead(403);
    ctx.res.end('Forbidden');
    return;
  }

  const headers = {
    'Content-Type': mimeType,
    'Content-Length': String(stat.size),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=86400',
  };

  if (DOWNLOAD_EXTS.has(ext)) {
    headers['Content-Disposition'] = `attachment; filename="${requestedFile}"`;
  }

  ctx.res.writeHead(200, headers);
  createReadStream(filePath).pipe(ctx.res);
}
