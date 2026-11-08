/**
 * @fileoverview Generic File Upload Route.
 * Handles authenticated file uploads (images, banners, logos, documents) via multipart/form-data.
 * Architecture §5.3, §7.1. Rule 3.7.1, T-1.7.
 */

import { router } from '../../core/router.js';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { storageAdapter } from '../../utils/storage.js';
import { ValidationError } from '../../core/errors.js';

router.post(
  '/api/v1/upload',
  requireAuth,
  upload({ imageFields: ['file', 'banner', 'logo', 'image'], docFields: ['document', 'doc'] }),
  async (ctx) => {
    const file = ctx.files?.[0];
    if (!file) {
      throw new ValidationError('No file uploaded', [
        { path: 'file', message: 'File is required' },
      ]);
    }

    const saved = await storageAdapter.save(file);

    ctx.json(200, {
      url: saved.url,
      path: saved.path,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    });
  }
);
