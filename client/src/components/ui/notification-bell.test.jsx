/**
 * @fileoverview Unit tests for NotificationBell component (T-7.7).
 * FR-SYS-03.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
import * as NotificationsApi from '../../api/notifications.js';

vi.mock('../../api/notifications.js');

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('T-7.7: NotificationBell component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NotificationsApi.fetchUnreadNotificationCount.mockResolvedValue({ count: 3 });
    NotificationsApi.fetchNotifications.mockResolvedValue({
      items: [
        {
          id: 'n-1',
          type: 'application_result',
          payload: { status: 'approved' },
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n-2',
          type: 'booth_changed',
          payload: { action: 'assigned', boothCode: 'B-12' },
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 2 },
    });
    NotificationsApi.markNotificationRead.mockResolvedValue({ id: 'n-1', isRead: true });
    NotificationsApi.markAllNotificationsRead.mockResolvedValue({ modifiedCount: 1 });
  });

  it('renders bell toggle button and displays unread badge count', async () => {
    renderBell();

    const bell = await screen.findByRole('button', { name: /notifications, 3 unread/i });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens dropdown with list of notifications on click', async () => {
    renderBell();

    const bell = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(bell);

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Your application was approved!')).toBeInTheDocument();
    expect(screen.getByText('Booth B-12 was assigned to you.')).toBeInTheDocument();
    expect(screen.getByText(/View all notifications/i)).toBeInTheDocument();
  });

  it('calls markNotificationRead when unread notification is clicked', async () => {
    renderBell();

    const bell = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(bell);

    const unreadItem = await screen.findByText('Your application was approved!');
    fireEvent.click(unreadItem);

    await waitFor(() => {
      expect(NotificationsApi.markNotificationRead).toHaveBeenCalledWith('n-1');
    });
  });

  it('calls markAllNotificationsRead when Mark all read is clicked', async () => {
    renderBell();

    const bell = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(bell);

    const markAllBtn = await screen.findByRole('button', { name: /mark all notifications as read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(NotificationsApi.markAllNotificationsRead).toHaveBeenCalled();
    });
  });
});
