/**
 * @fileoverview Unit tests for core UI components.
 * T-2.12. Design §6.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Input,
  PasswordInput,
  calculatePasswordStrength,
  StatusPill,
  EmptyState,
  ConfirmDialog,
} from './index.js';

describe('T-2.12: Core UI Components', () => {
  describe('Button', () => {
    it('renders text and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows spinner and is disabled when loading', () => {
      render(<Button loading>Save</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders label, input, and handles error state with aria attributes', () => {
      render(
        <Input
          label="Email Address"
          name="email"
          error="Email is required"
          helperText="Enter a valid email"
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      const input = screen.getByLabelText(/email address/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('PasswordInput & calculatePasswordStrength', () => {
    it('calculates password strength accurately', () => {
      expect(calculatePasswordStrength('').score).toBe(0);
      expect(calculatePasswordStrength('weak').score).toBeLessThanOrEqual(40);
      expect(calculatePasswordStrength('StrongPassword123!').score).toBeGreaterThanOrEqual(85);
    });

    it('toggles password visibility when button clicked', () => {
      render(<PasswordInput label="Your Password" name="pwd" />);
      const input = screen.getByLabelText(/your password/i);
      const toggleBtn = screen.getByRole('button', { name: /show password/i });

      expect(input).toHaveAttribute('type', 'password');
      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'text');
      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('StatusPill', () => {
    it('renders appropriate status label and icon', () => {
      render(<StatusPill status="approved" />);
      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title, description and triggers action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Expos Available"
          description="Check back soon for new expos."
          actionLabel="Create Expo"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No Expos Available')).toBeInTheDocument();
      expect(screen.getByText('Check back soon for new expos.')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /create expo/i });
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmDialog', () => {
    it('disables confirm button until requiredMatchText is typed', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmDialog
          show={true}
          onHide={vi.fn()}
          onConfirm={handleConfirm}
          title="Delete Expo"
          message="This action is permanent."
          requiredMatchText="CONFIRM"
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      expect(confirmBtn).toBeDisabled();

      const input = screen.getByPlaceholderText('CONFIRM');
      fireEvent.change(input, { target: { value: 'CONFIRM' } });

      expect(confirmBtn).not.toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
