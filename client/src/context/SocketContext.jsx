/**
 * @fileoverview Socket.IO Context, Provider & Real-Time Query Invalidation Hooks.
 * Architecture §9, T-7.3, T-7.4, FR-SYS-01, Rules §3.5, §4.2.4.
 *
 * Provides:
 *  - SocketProvider with reconnection & refreshed JWT synchronization
 *  - Non-intrusive reconnection banner with ARIA live region
 *  - useSocket() hook
 *  - useRealtimeExpo(expoId) with query invalidation & visual pulse highlighting
 *  - useRealtimeAdmin(expoId) with application invalidations
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.jsx';
import { getAccessToken } from '../lib/axios.js';

export const SocketContext = createContext(null);

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Track highlighted IDs for visual pulse effect (T-7.4)
  const [highlightedBooths, setHighlightedBooths] = useState(new Set());
  const [highlightedSessions, setHighlightedSessions] = useState(new Set());

  // Screen reader announcement helper (Rule 4.4, Design §8, §9)
  const announce = useCallback((message) => {
    setAnnouncement(message);
    const timer = setTimeout(() => setAnnouncement(''), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize socket instance once
  useEffect(() => {
    const s = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      setHasAttemptedConnect(true);
    });

    s.on('disconnect', (reason) => {
      setIsConnected(false);
      // If server forcibly disconnected due to bad auth, don't spam
      if (reason === 'io server disconnect') {
        s.connect();
      }
    });

    s.on('connect_error', () => {
      setIsConnected(false);
      setHasAttemptedConnect(true);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Sync authentication state with socket
  useEffect(() => {
    if (!socket) return;

    if (isAuthenticated) {
      const token = getAccessToken();
      if (token) {
        socket.auth = { token };
        if (!socket.connected) {
          socket.connect();
        }
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
      setIsConnected(false);
      setHasAttemptedConnect(false);
    }
  }, [socket, isAuthenticated]);

  // Listen for JWT token refresh from axios interceptor (T-7.3)
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const refreshedToken = e.detail?.token;
      if (socket && refreshedToken) {
        socket.auth = { token: refreshedToken };
        if (!socket.connected && isAuthenticated) {
          socket.connect();
        }
      }
    };

    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    return () => {
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
    };
  }, [socket, isAuthenticated]);

  // Global personal room event listeners (T-7.2 / T-7.6 / T-7.8)
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleApplicationReviewed = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      queryClient.invalidateQueries({ queryKey: ['myApplication'] });
      announce(`Your application has been ${payload.status}`);
    };

    const handleNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    };

    const handleGlobalMessageNew = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      announce(`New message from ${payload.sender?.name || 'chat'}`);
    };

    socket.on('application:reviewed', handleApplicationReviewed);
    socket.on('notification:new', handleNotificationNew);
    socket.on('message:new', handleGlobalMessageNew);

    return () => {
      socket.off('application:reviewed', handleApplicationReviewed);
      socket.off('notification:new', handleNotificationNew);
      socket.off('message:new', handleGlobalMessageNew);
    };
  }, [socket, isAuthenticated, queryClient, announce]);

  // Trigger temporary pulse highlight for changed items (T-7.4)
  const pulseBooth = useCallback((boothId) => {
    if (!boothId) return;
    setHighlightedBooths((prev) => new Set(prev).add(boothId));
    setTimeout(() => {
      setHighlightedBooths((prev) => {
        const next = new Set(prev);
        next.delete(boothId);
        return next;
      });
    }, 3500);
  }, []);

  const pulseSession = useCallback((sessionId) => {
    if (!sessionId) return;
    setHighlightedSessions((prev) => new Set(prev).add(sessionId));
    setTimeout(() => {
      setHighlightedSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }, 3500);
  }, []);

  const value = {
    socket,
    isConnected,
    announce,
    highlightedBooths,
    highlightedSessions,
    pulseBooth,
    pulseSession,
  };

  // Show subtle reconnection banner if authenticated and disconnected after first try
  const showReconnectingBanner = isAuthenticated && hasAttemptedConnect && !isConnected;

  return (
    <SocketContext.Provider value={value}>
      {children}

      {/* Screen-reader live region (A11y Rule 4.4, Design §8) */}
      <div
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* Non-intrusive reconnecting pill banner */}
      {showReconnectingBanner && (
        <div
          role="status"
          aria-live="polite"
          className="position-fixed top-0 start-50 translate-middle-x mt-2 px-3 py-1 bg-warning text-dark border border-warning-subtle rounded-pill shadow-sm small z-3 d-flex align-items-center gap-1.5"
          style={{ zIndex: 1090 }}
        >
          <span
            className="spinner-border spinner-border-sm text-dark"
            role="status"
            aria-hidden="true"
          />
          <span className="fw-medium">Reconnecting to live updates…</span>
        </div>
      )}
    </SocketContext.Provider>
  );
}

const fallbackSocketContext = {
  socket: null,
  isConnected: false,
  announce: () => {},
  highlightedBooths: new Set(),
  highlightedSessions: new Set(),
  pulseBooth: () => {},
  pulseSession: () => {},
};

/**
 * Access the primary Socket.IO context.
 */
export function useSocket() {
  const ctx = useContext(SocketContext);
  return ctx || fallbackSocketContext;
}

/**
 * Hook for subscribing a page or view to real-time expo updates.
 * Invariants (Rule 4.2.4): Socket events invalidate TanStack Query keys;
 * they do not manually patch cache.
 *
 * @param {string} expoId - ID of the active expo
 */
export function useRealtimeExpo(expoId) {
  const { socket, isConnected, announce, pulseBooth, pulseSession, highlightedBooths, highlightedSessions } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !expoId) return;

    // Join expo room
    socket.emit('join:expo', { expoId });

    // Handle expo updates
    const handleExpoUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['expo', expoId] });
      queryClient.invalidateQueries({ queryKey: ['expos'] });
      announce('The expo details have been updated live.');
    };

    // Handle booth updates
    const handleBoothUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['booths', expoId] });
      queryClient.invalidateQueries({ queryKey: ['expo', expoId] });
      if (payload.boothId) {
        pulseBooth(payload.boothId);
      }
      announce('A booth reservation status has changed.');
    };

    // Handle session updates
    const handleScheduleUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', expoId] });
      queryClient.invalidateQueries({ queryKey: ['myAgenda'] });
      queryClient.invalidateQueries({ queryKey: ['myAgendaFull'] });
      if (payload.sessionId) {
        pulseSession(payload.sessionId);
      }
      announce(`The schedule has been updated (${payload.action || 'changed'}).`);
    };

    socket.on('expo:updated', handleExpoUpdated);
    socket.on('booth:updated', handleBoothUpdated);
    socket.on('schedule:updated', handleScheduleUpdated);

    return () => {
      socket.emit('leave:expo', { expoId });
      socket.off('expo:updated', handleExpoUpdated);
      socket.off('booth:updated', handleBoothUpdated);
      socket.off('schedule:updated', handleScheduleUpdated);
    };
  }, [socket, expoId, queryClient, announce, pulseBooth, pulseSession]);

  return {
    isConnected,
    highlightedBooths,
    highlightedSessions,
    isBoothHighlighted: (id) => highlightedBooths.has(id),
    isSessionHighlighted: (id) => highlightedSessions.has(id),
  };
}

/**
 * Hook for admin views to subscribe to real-time administrative expo events.
 *
 * @param {string} expoId
 */
export function useRealtimeAdmin(expoId) {
  const { socket, isConnected, announce } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !expoId) return;

    socket.emit('join:admin', { expoId });

    const handleApplicationNew = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['adminApplications', expoId] });
      announce('A new exhibitor application has been submitted.');
    };

    socket.on('application:new', handleApplicationNew);

    return () => {
      socket.emit('leave:admin', { expoId });
      socket.off('application:new', handleApplicationNew);
    };
  }, [socket, expoId, queryClient, announce]);

  return { isConnected };
}

/**
 * Hook for chat views to subscribe to conversation room events, typing indicators, and message events.
 * Architecture §6.2, T-7.9, T-7.10.
 *
 * @param {string} conversationId
 */
export function useConversationChat(conversationId) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState(new Map());
  const typingTimeoutRef = useRef(new Map());

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join:conversation', { conversationId });

    const handleMessageNew = () => {
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleMessageRead = () => {
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleTyping = ({ userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) {
          next.set(userId, userName);
        } else {
          next.delete(userId);
        }
        return next;
      });

      if (isTyping) {
        if (typingTimeoutRef.current.has(userId)) {
          clearTimeout(typingTimeoutRef.current.get(userId));
        }
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }, 3000);
        typingTimeoutRef.current.set(userId, timeout);
      }
    };

    socket.on('message:new', handleMessageNew);
    socket.on('message:read', handleMessageRead);
    socket.on('message:typing', handleTyping);

    return () => {
      socket.emit('leave:conversation', { conversationId });
      socket.off('message:new', handleMessageNew);
      socket.off('message:read', handleMessageRead);
      socket.off('message:typing', handleTyping);
      typingTimeoutRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutRef.current.clear();
    };
  }, [socket, conversationId, queryClient]);

  const sendTyping = useCallback(
    (isTyping) => {
      if (socket && conversationId) {
        socket.emit('message:typing', { conversationId, isTyping });
      }
    },
    [socket, conversationId]
  );

  return {
    isConnected,
    typingUsers: Array.from(typingUsers.values()),
    sendTyping,
  };
}
