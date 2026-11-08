/**
 * @fileoverview Authentication Context & Provider.
 * Bootstraps session on load via httpOnly refresh token cookie (refresh -> me).
 * Manages reactive user state, access token, login, register, and logout.
 * T-2.11. FR-AUTH-01..05.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setAccessToken, getAccessToken } from '../lib/axios.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network/server errors during logout — client state is cleared regardless
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // Bootstrap session from httpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const response = await apiClient.post('/auth/refresh');
        const token = response.data?.data?.accessToken;
        const currentUser = response.data?.data?.user;

        if (isMounted && token && currentUser) {
          setAccessToken(token);
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    // Handle token expiry broadcast from axios interceptor
    const handleAuthExpired = () => {
      setAccessToken(null);
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // Login handler
  const login = async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken } = response.data.data;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  // Register handler
  const register = async (payload) => {
    const response = await apiClient.post('/auth/register', payload);
    const { user: registeredUser, accessToken } = response.data.data;
    setAccessToken(accessToken);
    setUser(registeredUser);
    return registeredUser;
  };

  // Update profile in memory
  const updateProfile = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const value = {
    user,
    accessToken: getAccessToken(),
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      updateProfile: () => {},
    };
  }
  return context;
}
