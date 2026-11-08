/**
 * @fileoverview Unit tests for MongoDB connection and /health endpoint using mocks.
 * Satisfies T-1.1 and NFR-REL-01 without needing to download a 500MB binary in test environments.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { requestHandler } from '../../src/app.js';
import { connectDb, disconnectDb, isDbHealthy } from '../../src/config/db.js';

describe('T-1.1: MongoDB Connection & /health Endpoint', () => {
  let server;

  beforeEach(() => {
    server = createServer(requestHandler);
  });

  describe('connectDb & disconnectDb', () => {
    it('connectDb calls mongoose.connect with configured MONGO_URI', async () => {
      const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValueOnce(mongoose);
      await connectDb();
      expect(connectSpy).toHaveBeenCalled();
      connectSpy.mockRestore();
    });

    it('disconnectDb calls mongoose.disconnect', async () => {
      const disconnectSpy = jest.spyOn(mongoose, 'disconnect').mockResolvedValueOnce();
      await disconnectDb();
      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });
  });

  describe('isDbHealthy', () => {
    it('returns true when readyState is 1 and admin ping succeeds', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      const pingMock = jest.fn().mockResolvedValueOnce({ ok: 1 });
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        admin: () => ({ ping: pingMock }),
      };

      const healthy = await isDbHealthy();
      expect(healthy).toBe(true);
      expect(pingMock).toHaveBeenCalled();

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      mongoose.connection.db = originalDb;
    });

    it('returns false when readyState is not 1', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      const healthy = await isDbHealthy();
      expect(healthy).toBe(false);

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    });

    it('returns false when admin ping throws', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      const pingMock = jest.fn().mockRejectedValueOnce(new Error('Connection failed'));
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        admin: () => ({ ping: pingMock }),
      };

      const healthy = await isDbHealthy();
      expect(healthy).toBe(false);

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      mongoose.connection.db = originalDb;
    });
  });

  describe('GET /health endpoint', () => {
    it('returns 200 with status ok when DB is healthy', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
      const pingMock = jest.fn().mockResolvedValueOnce({ ok: 1 });
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        admin: () => ({ ping: pingMock }),
      };

      const res = await request(server).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.db).toBe('connected');
      expect(res.body.data.version).toBe('1.0.0');
      expect(res.body.data.timestamp).toBeDefined();

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
      mongoose.connection.db = originalDb;
    });

    it('returns 503 degraded when DB is unhealthy', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

      const res = await request(server).get('/health');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('degraded');
      expect(res.body.data.db).toBe('unavailable');

      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    });
  });
});
