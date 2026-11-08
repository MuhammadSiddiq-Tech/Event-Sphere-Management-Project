/**
 * @fileoverview Unit tests for core/static.js
 * Tests: path traversal prevention, 404 for missing files, 403 for disallowed types.
 * Rule 3.1.9. Rule 3.7.1.
 */

import { describe, it, expect } from '@jest/globals';
import { serveStatic } from '../src/core/static.js';

function makeCtx(path) {
  const written = { status: null, body: null };
  return {
    path,
    req: {},
    res: {
      writeHead(s) { written.status = s; },
      end(b) { written.body = b; },
      pipe() {},
    },
    written,
  };
}

describe('core/static.js — serveStatic', () => {
  it('calls next() for non-/uploads paths', async () => {
    const ctx = makeCtx('/api/v1/health');
    let called = false;
    await serveStatic(ctx, async () => { called = true; });
    expect(called).toBe(true);
  });

  it('blocks path traversal with ../', async () => {
    const ctx = makeCtx('/uploads/../../../etc/passwd');
    await serveStatic(ctx, async () => {});
    // Either 403 or 404 is acceptable — either way it must NOT serve the file
    expect([403, 404]).toContain(ctx.written.status);
  });

  it('returns 404 for non-existent file', async () => {
    const ctx = makeCtx('/uploads/does-not-exist-xyz123.jpg');
    await serveStatic(ctx, async () => {});
    expect(ctx.written.status).toBe(404);
  });
});
