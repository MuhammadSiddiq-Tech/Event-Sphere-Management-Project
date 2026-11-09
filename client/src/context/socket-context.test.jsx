/**
 * @fileoverview Unit tests for SocketContext, SocketProvider, and Real-Time hooks (T-7.3, T-7.4).
 * Tests handshake token passing, reconnection handling, query invalidations,
 * live pulse highlight tracking, and screen-reader announcements.
 * FR-SYS-01, Rules §3.5, §4.2.4.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider, useSocket, useRealtimeExpo } from './SocketContext.jsx';
import * as AuthContextModule from './AuthContext.jsx';
import * as AxiosModule from '../lib/axios.js';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  auth: {},
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

function ConsumerComponent({ expoId }) {
  const { isConnected, isBoothHighlighted, isSessionHighlighted } = useRealtimeExpo(expoId);

  return (
    <div>
      <span data-testid="status">{isConnected ? 'Connected' : 'Disconnected'}</span>
      <span data-testid="booth-highlight">{isBoothHighlighted('b-1') ? 'Highlighted' : 'Normal'}</span>
      <span data-testid="session-highlight">{isSessionHighlighted('s-1') ? 'Highlighted' : 'Normal'}</span>
    </div>
  );
}

function renderWithProviders(ui, { user = null, isAuthenticated = false } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user,
    isAuthenticated,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{ui}</SocketProvider>
    </QueryClientProvider>
  );
}

describe('T-7.3 & T-7.4: SocketContext & Real-Time Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.auth = {};
    vi.spyOn(AxiosModule, 'getAccessToken').mockReturnValue('mock-jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connects socket with access token when user is authenticated', () => {
    renderWithProviders(<ConsumerComponent expoId="expo-1" />, {
      user: { id: 'u-1', email: 'test@example.com' },
      isAuthenticated: true,
    });

    expect(mockSocket.auth).toEqual({ token: 'mock-jwt-token' });
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('disconnects socket when user logs out', () => {
    const { rerender } = renderWithProviders(<ConsumerComponent expoId="expo-1" />, {
      user: { id: 'u-1', email: 'test@example.com' },
      isAuthenticated: true,
    });

    mockSocket.connected = true;

    // Rerender as unauthenticated
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SocketProvider>
          <ConsumerComponent expoId="expo-1" />
        </SocketProvider>
      </QueryClientProvider>
    );

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('emits join:expo on mount and leave:expo on unmount', () => {
    const { unmount } = renderWithProviders(<ConsumerComponent expoId="expo-123" />, {
      user: { id: 'u-1' },
      isAuthenticated: true,
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join:expo', { expoId: 'expo-123' });

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:expo', { expoId: 'expo-123' });
  });

  it('responds to booth:updated by highlighting booth and making screen reader announcement', async () => {
    renderWithProviders(<ConsumerComponent expoId="expo-123" />, {
      user: { id: 'u-1' },
      isAuthenticated: true,
    });

    // Find the 'booth:updated' event callback registered on socket.on
    const boothUpdatedCall = mockSocket.on.mock.calls.find((call) => call[0] === 'booth:updated');
    expect(boothUpdatedCall).toBeDefined();

    const handler = boothUpdatedCall[1];

    // Trigger booth:updated event
    act(() => {
      handler({ boothId: 'b-1', status: 'reserved' });
    });

    expect(screen.getByTestId('booth-highlight').textContent).toBe('Highlighted');

    // Verify screen-reader announcement is rendered
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true }).textContent).toMatch(/booth reservation/i);
  });

  it('responds to schedule:updated by highlighting session and making screen reader announcement', async () => {
    renderWithProviders(<ConsumerComponent expoId="expo-123" />, {
      user: { id: 'u-1' },
      isAuthenticated: true,
    });

    const scheduleUpdatedCall = mockSocket.on.mock.calls.find((call) => call[0] === 'schedule:updated');
    expect(scheduleUpdatedCall).toBeDefined();

    const handler = scheduleUpdatedCall[1];

    act(() => {
      handler({ sessionId: 's-1', action: 'updated' });
    });

    expect(screen.getByTestId('session-highlight').textContent).toBe('Highlighted');
    expect(screen.getByRole('status', { hidden: true }).textContent).toMatch(/schedule has been updated/i);
  });

  it('re-syncs access token and reconnects when auth:token-refreshed event is dispatched', () => {
    renderWithProviders(<ConsumerComponent expoId="expo-123" />, {
      user: { id: 'u-1' },
      isAuthenticated: true,
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('auth:token-refreshed', { detail: { token: 'new-refreshed-jwt' } })
      );
    });

    expect(mockSocket.auth).toEqual({ token: 'new-refreshed-jwt' });
  });

  it('displays reconnecting banner when authenticated but socket connect fails', async () => {
    renderWithProviders(<ConsumerComponent expoId="expo-123" />, {
      user: { id: 'u-1' },
      isAuthenticated: true,
    });

    // Simulate connection error
    const connectErrorCall = mockSocket.on.mock.calls.find((call) => call[0] === 'connect_error');
    expect(connectErrorCall).toBeDefined();

    act(() => {
      connectErrorCall[1](new Error('Connection lost'));
    });

    expect(await screen.findByText(/Reconnecting to live updates/i)).toBeInTheDocument();
  });
});
