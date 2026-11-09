/**
 * @fileoverview Unit tests for NotificationsPage (T-7.7).
 * FR-SYS-03.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import NotificationsPage from './NotificationsPage.jsx';
import * as NotificationsApi from '../../api/notifications.js';

vi.mock('../../api/notifications.js');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('T-7.7: NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NotificationsApi.fetchUnreadNotificationCount.mockResolvedValue({ count: 1 });
    NotificationsApi.fetchNotifications.mockResolvedValue({
      items: [
        {
          id: 'n-1',
          type: 'session_reminder',
          payload: { sessionTitle: 'AI in Cloud Keynote' },
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n-2',
          type: 'session_updated',
          payload: { sessionTitle: 'Opening Keynote', action: 'updated' },
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 2, totalPages: 1 },
    });
    NotificationsApi.markNotificationRead.mockResolvedValue({ id: 'n-1', isRead: true });
    NotificationsApi.markAllNotificationsRead.mockResolvedValue({ modifiedCount: 1 });
  });

  it('renders page title and notifications list', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(await screen.findByText(/Reminder: "AI in Cloud Keynote" starts in 15 minutes\./i)).toBeInTheDocument();
    expect(screen.getByText(/Session "Opening Keynote" has been updated\./i)).toBeInTheDocument();
  });

  it('supports filtering by unread tab', async () => {
    renderPage();

    await screen.findByText(/Reminder: "AI in Cloud Keynote"/i);

    const unreadTab = screen.getByRole('tab', { name: /unread/i });
    fireEvent.click(unreadTab);

    await waitFor(() => {
      expect(NotificationsApi.fetchNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ unread: 'true' })
      );
    });
  });

  it('marks single notification read when clicked', async () => {
    renderPage();

    const notifItem = await screen.findByText(/Reminder: "AI in Cloud Keynote"/i);
    fireEvent.click(notifItem);

    await waitFor(() => {
      expect(NotificationsApi.markNotificationRead).toHaveBeenCalledWith('n-1');
    });
  });

  it('marks all read when Mark all read button clicked', async () => {
    renderPage();

    const markAllBtn = await screen.findByRole('button', { name: /mark all notifications as read/i });
    await waitFor(() => {
      expect(markAllBtn).not.toBeDisabled();
    });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(NotificationsApi.markAllNotificationsRead).toHaveBeenCalled();
    });
  });
});
