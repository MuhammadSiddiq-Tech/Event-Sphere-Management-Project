/**
 * @fileoverview Unit tests for upload middleware and storage adapter.
 * Verifies MIME filtering, multipart parsing, and storage adapter lifecycle.
 * Rule 3.7.1, T-1.7.
 */

import { describe, it, expect } from '@jest/globals';
import { storageAdapter } from '../../src/utils/storage.js';
import { upload } from '../../src/middleware/upload.js';
import { UnsupportedMediaError } from '../../src/core/errors.js';

describe('T-1.7: Upload Middleware & Storage Adapter', () => {
  describe('storageAdapter', () => {
    it('generates relative public URL for locally stored uploads', async () => {
      const mockFile = {
        path: './uploads/sample-logo.png',
        filename: 'sample-logo.png',
        mimetype: 'image/png',
      };

      const result = await storageAdapter.save(mockFile);
      expect(result.url).toBe('/uploads/sample-logo.png');
      expect(result.path).toContain('sample-logo.png');
    });

    it('gracefully handles file removal failures', async () => {
      const removed = await storageAdapter.remove('./uploads/non-existent-file-xyz.png');
      expect(removed).toBe(false);
    });
  });

  describe('upload middleware', () => {
    it('rejects requests with non-multipart content-type with UnsupportedMediaError', async () => {
      const middleware = upload();
      const ctx = {
        req: {
          headers: { 'content-type': 'application/json' },
        },
      };

      await expect(middleware(ctx, async () => {})).rejects.toThrow(UnsupportedMediaError);
    });
  });
});
