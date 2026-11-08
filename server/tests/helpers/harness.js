/**
 * @fileoverview Test harness utilities and server runner for integration tests.
 * Simplifies Supertest integration and test lifecycle.
 * T-1.9.
 */

import request from 'supertest';
import { createServer } from 'node:http';
import { requestHandler } from '../../src/app.js';

let appServer;

/**
 * Returns a persistent test server instance.
 * @returns {import('node:http').Server}
 */
export function getTestServer() {
  if (!appServer) {
    appServer = createServer(requestHandler);
  }
  return appServer;
}

/**
 * Supertest request wrapper against the test server.
 * @returns {request.SuperTest<request.Test>}
 */
export function createAgent() {
  return request(getTestServer());
}
