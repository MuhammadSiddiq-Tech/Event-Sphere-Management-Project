/**
 * @fileoverview Unit tests for Profile & Account Settings Page.
 * Covers profile info updates and password change flow.
 * T-2.14. FR-AUTH-06.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage.jsx';
import * as AuthContextModule from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../components/ui/index.js';
import { apiClient } from '../../lib/axios.js';

describe('T-2.14: ProfilePage', () => {
  const mockUser = {
    _id: 'usr_123',
    name: 'Jane Doe',
    email: 'jane@eventsphere.test',
    role: 'attendee',
    phone: '+1 234 567 8900',
    avatarUrl: 'https://example.com/avatar.jpg',
    isEmailVerified: true,
  };

  const mockUpdateProfile = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      updateProfile: mockUpdateProfile,
      logout: mockLogout,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  const renderProfilePage = () => {
    return render(
      <ToastProvider>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </ToastProvider>
    );
  };

  it('renders prefilled user information and read-only email', () => {
    renderProfilePage();

    expect(screen.getByRole('heading', { name: /account settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Role: attendee/i)).toBeInTheDocument();

    const emailInput = screen.getByDisplayValue('jane@eventsphere.test');
    expect(emailInput).toBeDisabled();

    const nameInput = screen.getByDisplayValue('Jane Doe');
    expect(nameInput).toBeInTheDocument();

    const phoneInput = screen.getByDisplayValue('+1 234 567 8900');
    expect(phoneInput).toBeInTheDocument();
  });

  it('submits updated profile details to PATCH /users/me', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: {
        success: true,
        data: {
          ...mockUser,
          name: 'Jane Smith',
          phone: '+1 987 654 3210',
        },
      },
    });

    renderProfilePage();

    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const saveBtn = screen.getByRole('button', { name: /save changes/i });

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.change(phoneInput, { target: { value: '+1 987 654 3210' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/users/me', {
        name: 'Jane Smith',
        phone: '+1 987 654 3210',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Smith' })
      );
      expect(screen.getByRole('status')).toHaveTextContent(/profile updated successfully/i);
    });
  });

  it('displays error alert when profile update fails', async () => {
    vi.spyOn(apiClient, 'patch').mockRejectedValue({
      response: { data: { error: { message: 'Invalid phone format' } } },
    });

    renderProfilePage();

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Modified' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Invalid phone format');
    });
  });

  it('validates password mismatch in change password form', async () => {
    renderProfilePage();

    const currentPwdInput = screen.getByLabelText(/current password/i);
    const newPwdInput = screen.getByLabelText(/^new password/i);
    const confirmPwdInput = screen.getByLabelText(/confirm new password/i);
    const updatePwdBtn = screen.getByRole('button', { name: /update password/i });

    fireEvent.change(currentPwdInput, { target: { value: 'OldPassword1!' } });
    fireEvent.change(newPwdInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'DifferentPassword123!' } });
    fireEvent.click(updatePwdBtn);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('successfully submits password change to PATCH /users/me/password', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({
      data: {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      },
    });

    renderProfilePage();

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPassword1!' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/users/me/password', {
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword123!',
      });
      expect(
        screen.getByRole('status')
      ).toHaveTextContent(/password changed successfully/i);
    });
  });
});
