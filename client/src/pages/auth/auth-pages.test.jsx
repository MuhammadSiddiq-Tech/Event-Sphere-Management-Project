/**
 * @fileoverview Unit and integration tests for Authentication Pages.
 * Covers Login, Register, Forgot Password, and Reset Password.
 * T-2.13. FR-AUTH-01, FR-AUTH-02, FR-AUTH-04.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ForgotPasswordPage from './ForgotPasswordPage.jsx';
import ResetPasswordPage from './ResetPasswordPage.jsx';
import * as AuthContextModule from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/axios.js';

describe('T-2.13: Authentication Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('LoginPage', () => {
    it('renders login form and submits credentials to login handler', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ role: 'attendee' });
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@eventsphere.test' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@eventsphere.test',
          password: 'Password123!',
        });
      });
    });

    it('displays error alert when login fails', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: { data: { error: { message: 'Invalid email or password' } } },
      });
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bad@test.com' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Wrong!' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
      });
    });
  });

  describe('RegisterPage', () => {
    it('switches role between Attendee and Exhibitor', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        register: vi.fn(),
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      const exhibitorBtn = screen.getByRole('button', { name: /exhibitor \/ company/i });
      fireEvent.click(exhibitorBtn);

      expect(screen.getByRole('button', { name: /create exhibitor account/i })).toBeInTheDocument();
    });

    it('requires privacy consent before form submission', async () => {
      const mockRegister = vi.fn();
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        register: mockRegister,
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@test.com' } });
      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123!' } });
      // Do not check privacy checkbox

      fireEvent.click(screen.getByRole('button', { name: /create attendee account/i }));

      await waitFor(() => {
        expect(screen.getByText(/you must accept the privacy policy/i)).toBeInTheDocument();
        expect(mockRegister).not.toHaveBeenCalled();
      });
    });
  });

  describe('ForgotPasswordPage', () => {
    it('posts email to endpoint and shows confirmation notice', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });

      render(
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@test.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('shows warning when token is missing from URL query string', () => {
      render(
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPasswordPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/no password reset token was found/i)).toBeInTheDocument();
    });

    it('submits new password when token is present in URL', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });

      render(
        <MemoryRouter initialEntries={['/reset-password?token=secret123']}>
          <ResetPasswordPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'NewPassword123!' } });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPassword123!' } });
      fireEvent.click(screen.getByRole('button', { name: /update password/i }));

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'secret123',
          password: 'NewPassword123!',
        });
        expect(screen.getByText(/password updated!/i)).toBeInTheDocument();
      });
    });
  });
});
