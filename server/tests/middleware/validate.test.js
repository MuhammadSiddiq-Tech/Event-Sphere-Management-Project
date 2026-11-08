/**
 * @fileoverview Unit tests for Zod validation middleware.
 * Verifies validation against schemas for body, query, and params.
 * Ensures invalid data throws ValidationError with details, and valid data passes.
 * Rule 3.2.5.
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { ValidationError } from '../../src/core/errors.js';

function makeCtx(data = {}) {
  return {
    body: data.body,
    query: data.query || {},
    params: data.params || {},
  };
}

describe('middleware/validate.js — Zod Validation Middleware', () => {
  const sampleBodySchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
  });

  const sampleQuerySchema = z.object({
    page: z.coerce.number().int().min(1),
  });

  const sampleParamsSchema = z.object({
    id: z.string().min(1),
  });

  it('passes and attaches validated data when input matches schema', async () => {
    const middleware = validate({
      body: sampleBodySchema,
      query: sampleQuerySchema,
      params: sampleParamsSchema,
    });

    const ctx = makeCtx({
      body: { name: 'John Doe', email: 'john@example.com' },
      query: { page: '2' },
      params: { id: 'expo-1' },
    });

    let nextCalled = false;
    await middleware(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(ctx.body).toEqual({ name: 'John Doe', email: 'john@example.com' });
    expect(ctx.query.page).toBe(2);
    expect(ctx.params.id).toBe('expo-1');
  });

  it('throws ValidationError when body fails validation', async () => {
    const middleware = validate({ body: sampleBodySchema });
    const ctx = makeCtx({
      body: { name: 'J', email: 'not-an-email' },
    });

    await expect(middleware(ctx, async () => {})).rejects.toThrow(ValidationError);

    try {
      await middleware(ctx, async () => {});
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'body.name' }),
          expect.objectContaining({ path: 'body.email' }),
        ])
      );
    }
  });

  it('throws ValidationError when query fails validation', async () => {
    const middleware = validate({ query: sampleQuerySchema });
    const ctx = makeCtx({ query: { page: '-5' } });

    await expect(middleware(ctx, async () => {})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when params fail validation', async () => {
    const middleware = validate({ params: sampleParamsSchema });
    const ctx = makeCtx({ params: { id: '' } });

    await expect(middleware(ctx, async () => {})).rejects.toThrow(ValidationError);
  });
});
