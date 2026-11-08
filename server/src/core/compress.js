/**
 * @fileoverview Response compression — gzip/brotli via node:zlib.
 * Compresses JSON responses > 1 KB when Accept-Encoding allows.
 * Architecture §5.3.
 */

import { createGzip, createBrotliCompress } from 'node:zlib';

const COMPRESS_THRESHOLD = 1024; // bytes

/**
 * Wrap the response write methods to transparently compress the body.
 * Must be applied before the response is written.
 * @param {import('./context.js').Ctx} ctx
 * @param {() => Promise<void>} next
 */
export async function compress(ctx, next) {
  const acceptEncoding = ctx.req.headers['accept-encoding'] ?? '';
  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');

  if (!supportsBrotli && !supportsGzip) {
    await next();
    return;
  }

  // Monkey-patch ctx.json to compress large bodies
  const originalJson = ctx.json.bind(ctx);
  ctx.json = function compressedJson(status, data, meta, raw) {
    const payload = raw ?? {
      success: true,
      ...(data !== undefined && data !== null ? { data } : {}),
      ...(meta != null ? { meta } : {}),
    };
    const body = Buffer.from(JSON.stringify(payload), 'utf8');

    if (body.length < COMPRESS_THRESHOLD) {
      // Small payload — skip compression
      ctx.res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length });
      ctx.res.end(body);
      return;
    }

    const encoding = supportsBrotli ? 'br' : 'gzip';
    const compressor = supportsBrotli ? createBrotliCompress() : createGzip();

    ctx.res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': encoding,
      'Vary': 'Accept-Encoding',
    });

    compressor.pipe(ctx.res);
    compressor.end(body);
  };

  await next();
}
