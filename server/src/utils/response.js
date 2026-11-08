/**
 * @fileoverview Standard API response envelope helpers.
 * Ensures consistent output format across all handlers.
 * Architecture §7.1. Rule 3.2.2.
 */

/**
 * Creates a standard success response envelope.
 * @param {unknown} [data] - payload data
 * @param {unknown} [meta] - pagination or extra metadata
 * @returns {{ success: true, data?: unknown, meta?: unknown }}
 */
export function successResponse(data, meta) {
  return {
    success: true,
    ...(data !== undefined && data !== null ? { data } : {}),
    ...(meta != null ? { meta } : {}),
  };
}

/**
 * Creates a standard error response envelope.
 * @param {string} code - machine-readable error code
 * @param {string} message - human-readable error description
 * @param {Array<{path: string, message: string}>} [details] - validation or detailed errors
 * @returns {{ success: false, error: { code: string, message: string, details?: Array<{path: string, message: string}> } }}
 */
export function errorResponse(code, message, details) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
