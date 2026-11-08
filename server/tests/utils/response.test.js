/**
 * @fileoverview Unit tests for utils/response.js helpers.
 * Tests successResponse and errorResponse shaping.
 */

import { describe, it, expect } from '@jest/globals';
import { successResponse, errorResponse } from '../../src/utils/response.js';

describe('utils/response.js — Response Envelope Helpers', () => {
  describe('successResponse', () => {
    it('creates standard success envelope with data', () => {
      const res = successResponse({ id: 1, name: 'Expo' });
      expect(res).toEqual({
        success: true,
        data: { id: 1, name: 'Expo' },
      });
    });

    it('creates standard success envelope with data and meta', () => {
      const res = successResponse(['item1', 'item2'], { page: 1, total: 2 });
      expect(res).toEqual({
        success: true,
        data: ['item1', 'item2'],
        meta: { page: 1, total: 2 },
      });
    });

    it('handles empty/undefined data without adding empty field', () => {
      const res = successResponse();
      expect(res).toEqual({ success: true });
    });
  });

  describe('errorResponse', () => {
    it('creates standard error envelope without details', () => {
      const res = errorResponse('NOT_FOUND', 'Expo not found');
      expect(res).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Expo not found',
        },
      });
    });

    it('creates standard error envelope with validation details', () => {
      const details = [{ path: 'email', message: 'Required' }];
      const res = errorResponse('VALIDATION_ERROR', 'Validation failed', details);
      expect(res).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
    });
  });
});
