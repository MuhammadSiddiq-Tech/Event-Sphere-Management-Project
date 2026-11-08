/**
 * @fileoverview Body parser — JSON (with size limit) and multipart via busboy.
 * Sets ctx.body for JSON; ctx.body + ctx.files for multipart.
 * Architecture §5.3. Rule 3.7.1 (file limits).
 */

import busboy from 'busboy';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UnsupportedMediaError, ValidationError } from './errors.js';
import { env } from '../config/env.js';

const JSON_LIMIT_BYTES = 1 * 1024 * 1024; // 1 MB
const IMG_LIMIT_BYTES = 5 * 1024 * 1024;  // 5 MB
const DOC_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME types allowed for image uploads */
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
/** MIME types allowed for document uploads */
const DOC_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/**
 * Parse a JSON request body.
 * Rejects non-JSON content-type with 415.
 * @param {import('./context.js').Ctx} ctx
 * @returns {Promise<void>}
 */
export async function parseJson(ctx) {
  const contentType = ctx.req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    throw new UnsupportedMediaError();
  }

  const raw = await readStream(ctx.req, JSON_LIMIT_BYTES);
  if (raw.length === 0) {
    ctx.body = {};
    return;
  }

  try {
    ctx.body = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new UnsupportedMediaError();
  }
}

/**
 * Parse a multipart/form-data body.
 * Populates ctx.body (text fields) and ctx.files (file fields).
 * @param {import('./context.js').Ctx} ctx
 * @param {{ imageFields?: string[], docFields?: string[] }} [opts]
 * @returns {Promise<void>}
 */
export async function parseMultipart(ctx, opts = {}) {
  const contentType = ctx.req.headers['content-type'] ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new UnsupportedMediaError();
  }

  const uploadDir = env.UPLOAD_DIR;
  await mkdir(uploadDir, { recursive: true });

  const { imageFields = [], docFields = [] } = opts;

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: ctx.req.headers, limits: { fileSize: DOC_LIMIT_BYTES, files: 5 } });
    const fields = {};
    const files = [];
    const filePromises = [];

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (fieldname, stream, info) => {
      const { filename, mimeType } = info;
      const isImage = imageFields.includes(fieldname);
      const isDoc = docFields.includes(fieldname);
      const allowedMimes = isImage ? IMAGE_MIMES : isDoc ? DOC_MIMES : IMAGE_MIMES;
      const sizeLimit = isImage ? IMG_LIMIT_BYTES : DOC_LIMIT_BYTES;

      if (!allowedMimes.has(mimeType)) {
        stream.resume();
        return reject(
          new ValidationError([{ path: fieldname, message: `File type '${mimeType}' not allowed` }])
        );
      }

      const ext = extname(filename) || '.bin';
      const savedName = `${randomUUID()}${ext}`;
      const savePath = join(uploadDir, savedName);
      const ws = createWriteStream(savePath);
      let size = 0;

      const filePromise = new Promise((resFile, rejFile) => {
        stream.on('data', (chunk) => {
          size += chunk.length;
          if (size > sizeLimit) {
            stream.destroy();
            ws.destroy();
            rejFile(
              new ValidationError([
                { path: fieldname, message: `File size exceeds limit of ${sizeLimit / (1024 * 1024)} MB` },
              ])
            );
          }
        });

        stream.pipe(ws);
        ws.on('finish', () => {
          files.push({ fieldname, filename, path: savePath, mimetype: mimeType, size });
          resFile();
        });
        ws.on('error', rejFile);
      });

      filePromises.push(filePromise);
    });

    bb.on('finish', async () => {
      try {
        await Promise.all(filePromises);
        ctx.body = fields;
        ctx.files = files;
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    bb.on('error', reject);
    ctx.req.pipe(bb);
  });
}

/**
 * Read a stream into a Buffer up to maxBytes.
 * @param {import('node:stream').Readable} stream
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
function readStream(stream, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    stream.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        stream.destroy();
        reject(Object.assign(new Error('Payload too large'), { status: 413, code: 'VALIDATION_ERROR' }));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
