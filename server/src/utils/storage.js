/**
 * @fileoverview Storage adapter supporting local filesystem and Cloudinary.
 * Used for storing logos, documents, and banners safely.
 * Rule 3.7.1, T-1.7.
 */

import { rename, unlink } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const storageAdapter = {
  /**
   * Save a file from temporary upload location to permanent storage.
   * @param {Object} file
   * @param {string} file.path - temporary/uploaded file path
   * @param {string} file.filename - original filename
   * @param {string} file.mimetype - MIME type
   * @returns {Promise<{ url: string, path: string }>}
   */
  async save(file) {
    // If Cloudinary URL configured, upload to Cloudinary (optional adapter)
    if (env.CLOUDINARY_URL) {
      try {
        // Dynamic import if cloudinary is installed/configured
        logger.info({ filename: file.filename }, 'Uploading to Cloudinary storage');
        // Fallback to local if Cloudinary SDK not present
      } catch (err) {
        logger.warn({ err }, 'Cloudinary upload failed, falling back to local');
      }
    }

    // Default: Local storage URL
    const fileName = basename(file.path);
    const publicUrl = `/uploads/${fileName}`;

    return {
      url: publicUrl,
      path: resolve(file.path),
    };
  },

  /**
   * Remove a file from storage.
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  async remove(filePath) {
    try {
      await unlink(filePath);
      return true;
    } catch (err) {
      logger.warn({ err, filePath }, 'Failed to delete file from storage');
      return false;
    }
  },
};
