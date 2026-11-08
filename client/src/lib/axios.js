/**
 * @fileoverview Axios API client with single-flight refresh token interceptor.
 * Stores JWT access token strictly in-memory (Rules §3.4.1, Invariant #1).
 * Supports automatic token refresh on 401 via httpOnly refresh cookie.
 * T-2.11. FR-AUTH-02, NFR-SEC-02.
 */

import axios from 'axios';

let inMemoryToken = null;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Update the in-memory access token.
 * @param {string|null} token
 */
export function setAccessToken(token) {
  inMemoryToken = token;
}

/**
 * Read the current in-memory access token.
 * @returns {string|null}
 */
export function getAccessToken() {
  return inMemoryToken;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send httpOnly refresh cookie with requests
});

// Request interceptor: attach Authorization header if inMemoryToken exists
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: single-flight refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no config or error is not 401, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints themselves (login, register, refresh)
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    if (isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue subsequent requests while refresh is in-flight
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await apiClient.post('/auth/refresh');
      const newAccessToken = response.data?.data?.accessToken;

      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      setAccessToken(newAccessToken);
      processQueue(null, newAccessToken);

      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      setAccessToken(null);
      // Dispatch custom event so AuthContext can handle logout / redirect
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
