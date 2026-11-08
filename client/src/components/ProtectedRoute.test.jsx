/**
 * @fileoverview Unit tests for ProtectedRoute component.
 * Verifies authentication checks, loading state, role authorization, and redirects.
 * T-2.10.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';

describe('T-2.10: ProtectedRoute', () => {
  it('displays loading spinner while authentication state is resolving', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute allowedRoles={['admin']}><div>Protected Content</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute><p>Secret Data</p></ProtectedRoute>} />
          <Route path="/login" element={<p>Login Page</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Data')).not.toBeInTheDocument();
  });

  it('redirects to /403 when user role is not allowed', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { role: 'attendee', name: 'Alice' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route path="/admin-only" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin Secret</p></ProtectedRoute>} />
          <Route path="/403" element={<p>Access Denied 403</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied 403')).toBeInTheDocument();
    expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated with allowed role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { role: 'admin', name: 'Olivia' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route path="/admin-only" element={<ProtectedRoute allowedRoles={['admin']}><p>Admin Dashboard Content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard Content')).toBeInTheDocument();
  });
});
