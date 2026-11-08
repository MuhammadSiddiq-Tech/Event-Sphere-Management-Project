/**
 * @fileoverview Pagination helper.
 * Parses page/limit from query, builds meta, provides skip offset.
 * Rules 3.2.4 — every list endpoint must paginate. Invariant #11.
 */

import { PAGINATION } from '../config/constants.js';

/**
 * @typedef {Object} PaginationOptions
 * @property {number} page
 * @property {number} limit
 * @property {number} skip
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} pages
 */

/**
 * Parse pagination query parameters.
 * @param {Record<string, string>} query - ctx.query
 * @returns {PaginationOptions}
 */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const rawLimit = parseInt(query.limit ?? String(PAGINATION.DEFAULT_LIMIT), 10) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(rawLimit, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build the pagination meta object for the response envelope.
 * @param {number} total - total document count
 * @param {PaginationOptions} opts
 * @returns {PaginationMeta}
 */
export function buildPaginationMeta(total, { page, limit }) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}
