/**
 * @fileoverview Unit tests for Axios instance and single-flight token refresh.
 * T-2.11. Invariant #1, Rules §3.4.1.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, setAccessToken, getAccessToken } from './axios.js';

describe('T-2.11: Axios Client & Token Management', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it('manages access token in memory correctly', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('test-jwt-token-xyz');
    expect(getAccessToken()).toBe('test-jwt-token-xyz');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('automatically adds Authorization header to outgoing requests when token exists', async () => {
    setAccessToken('my-secret-access-token');

    // Spy on the internal request interceptor
    let capturedConfig;
    const mockAdapter = vi.fn((config) => {
      capturedConfig = config;
      return Promise.resolve({ data: { success: true }, status: 200, headers: {}, config });
    });

    apiClient.defaults.adapter = mockAdapter;

    await apiClient.get('/test-endpoint');

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig.headers['Authorization']).toBe('Bearer my-secret-access-token');
  });

  it('does not add Authorization header when no token exists', async () => {
    setAccessToken(null);

    let capturedConfig;
    const mockAdapter = vi.fn((config) => {
      capturedConfig = config;
      return Promise.resolve({ data: { success: true }, status: 200, headers: {}, config });
    });

    apiClient.defaults.adapter = mockAdapter;

    await apiClient.get('/test-endpoint');

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig.headers['Authorization']).toBeUndefined();
  });
});
