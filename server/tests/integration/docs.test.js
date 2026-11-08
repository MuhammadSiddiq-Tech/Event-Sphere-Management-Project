/**
 * @fileoverview Integration tests for OpenAPI scaffold and Swagger UI (/api/docs).
 * Rule 3.2.6, T-1.8.
 */

import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import { requestHandler } from '../../src/app.js';

describe('T-1.8: OpenAPI Scaffold & Swagger UI Docs', () => {
  const server = createServer(requestHandler);

  it('GET /api/openapi.json returns 200 with OpenAPI 3.0 specification', async () => {
    const res = await request(server).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('EventSphere Management API');
    expect(res.body.paths['/health']).toBeDefined();
  });

  it('GET /api/docs returns 200 with HTML Swagger UI interface', async () => {
    const res = await request(server).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger-ui');
    expect(res.text).toContain('/api/openapi.json');
  });
});
