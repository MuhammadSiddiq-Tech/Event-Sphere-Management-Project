/**
 * @fileoverview Unit tests for AdminUsersPage (T-8.7).
 * FR-ADM-01.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AdminUsersPage from './AdminUsersPage.jsx';
import * as AdminApi from '../../api/admin.js';

vi.mock('../../api/admin.js');
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'admin-current-id', name: 'Master Admin', role: 'admin' },
  }),
}));

const MOCK_USERS = [
  {
    id: 'u-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'attendee',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u-2',
    name: 'Jane Exhibitor',
    email: 'jane@company.com',
    role: 'exhibitor',
    isActive: false,
    createdAt: new Date().toISOString(),
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminUsersPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('T-8.7: AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminApi.fetchAdminUsers.mockResolvedValue({
      items: MOCK_USERS,
      meta: { page: 1, limit: 15, total: 2, pages: 1 },
    });
  });

  it('renders user management title and users table', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /User Management/i })).toBeDefined();
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('jane@company.com')).toBeDefined();
      expect(screen.getByText('Deactivate')).toBeDefined();
      expect(screen.getByText('Reactivate')).toBeDefined();
    });
  });

  it('filters users by search query', async () => {
    renderPage();

    await waitFor(() => {
      expect(AdminApi.fetchAdminUsers).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(AdminApi.fetchAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Jane' })
      );
    });
  });

  it('opens deactivation dialog and confirms deactivation', async () => {
    AdminApi.deactivateUser.mockResolvedValueOnce({
      ...MOCK_USERS[0],
      isActive: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate/i });
    fireEvent.click(deactivateBtn);

    // Confirm dialog title
    await waitFor(() => {
      expect(screen.getByText('Deactivate User Account')).toBeDefined();
    });

    // Click confirm in dialog
    const confirmButtons = screen.getAllByRole('button', { name: 'Deactivate' });
    // Pick the one inside the modal footer
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(AdminApi.deactivateUser).toHaveBeenCalledWith('u-1');
    });
  });

  it('opens reactivation dialog and confirms reactivation', async () => {
    AdminApi.reactivateUser.mockResolvedValueOnce({
      ...MOCK_USERS[1],
      isActive: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Exhibitor')).toBeDefined();
    });

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(screen.getByText('Reactivate User Account')).toBeDefined();
    });

    const confirmButtons = screen.getAllByRole('button', { name: 'Reactivate' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(AdminApi.reactivateUser).toHaveBeenCalledWith('u-2');
    });
  });
});
