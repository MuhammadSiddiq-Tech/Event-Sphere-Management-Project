/**
 * @fileoverview Unit tests for utils/pagination.js
 * Tests: parsePagination defaults/bounds, buildPaginationMeta.
 */

import { describe, it, expect } from '@jest/globals';
import { parsePagination, buildPaginationMeta } from '../src/utils/pagination.js';

describe('utils/pagination — parsePagination', () => {
  it('uses defaults when no query params provided', () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.skip).toBe(0);
  });

  it('parses page and limit from query', () => {
    const p = parsePagination({ page: '3', limit: '15' });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(15);
    expect(p.skip).toBe(30);
  });

  it('caps limit at 100', () => {
    const p = parsePagination({ limit: '999' });
    expect(p.limit).toBe(100);
  });

  it('floors page at 1', () => {
    const p = parsePagination({ page: '0' });
    expect(p.page).toBe(1);
  });

  it('handles non-numeric gracefully', () => {
    const p = parsePagination({ page: 'abc', limit: 'xyz' });
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
  });
});

describe('utils/pagination — buildPaginationMeta', () => {
  it('calculates pages correctly', () => {
    const meta = buildPaginationMeta(100, { page: 1, limit: 20 });
    expect(meta.total).toBe(100);
    expect(meta.pages).toBe(5);
  });

  it('rounds up pages', () => {
    const meta = buildPaginationMeta(21, { page: 1, limit: 20 });
    expect(meta.pages).toBe(2);
  });

  it('handles zero total', () => {
    const meta = buildPaginationMeta(0, { page: 1, limit: 20 });
    expect(meta.pages).toBe(0);
    expect(meta.total).toBe(0);
  });
});
