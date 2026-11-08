/**
 * @fileoverview Unit and integration tests for Admin Expos Management Page (T-3.11).
 * Tests AdminExposPage, ExpoFormModal, and typed-title delete confirmation.
 * FR-EXPO-01, FR-EXPO-02, Rules 6.5.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminExposPage from './AdminExposPage.jsx';
import { ExpoFormModal } from '../../components/admin/ExpoFormModal.jsx';
import * as ExposApi from '../../api/expos.js';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const mockDraftExpo = {
  id: 'expo-draft-1',
  slug: 'draft-expo-2026',
  title: 'Draft Expo 2026',
  category: 'Innovation',
  status: 'draft',
  startDate: '2026-11-10T00:00:00.000Z',
  endDate: '2026-11-12T00:00:00.000Z',
  venue: { city: 'Paris', country: 'France' },
  maxBooths: 80,
};

const mockPublishedExpo = {
  id: 'expo-pub-1',
  slug: 'published-expo-2026',
  title: 'Published Expo 2026',
  category: 'Technology',
  status: 'published',
  startDate: '2026-12-01T00:00:00.000Z',
  endDate: '2026-12-05T00:00:00.000Z',
  venue: { city: 'Tokyo', country: 'Japan' },
  maxBooths: 120,
};

describe('T-3.11: Admin Expos Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AdminExposPage', () => {
    it('renders admin expos list with titles, status pills, and action buttons', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [mockDraftExpo, mockPublishedExpo],
        meta: { page: 1, limit: 50, total: 2, pages: 1 },
      });

      renderWithClient(<AdminExposPage />);

      await waitFor(() => {
        expect(screen.getByText('Draft Expo 2026')).toBeInTheDocument();
        expect(screen.getByText('Published Expo 2026')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /create expo/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    });

    it('triggers publish mutation when Publish button is clicked', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [mockDraftExpo],
        meta: { page: 1, limit: 50, total: 1, pages: 1 },
      });
      const publishSpy = vi.spyOn(ExposApi, 'publishExpo').mockResolvedValue({
        ...mockDraftExpo,
        status: 'published',
      });

      renderWithClient(<AdminExposPage />);

      await waitFor(() => {
        expect(screen.getByText('Draft Expo 2026')).toBeInTheDocument();
      });

      const publishBtn = screen.getByRole('button', { name: /publish/i });
      fireEvent.click(publishBtn);

      await waitFor(() => {
        expect(publishSpy).toHaveBeenCalledWith('expo-draft-1');
      });
    });

    it('triggers unpublish mutation when Unpublish button is clicked', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [mockPublishedExpo],
        meta: { page: 1, limit: 50, total: 1, pages: 1 },
      });
      const unpublishSpy = vi.spyOn(ExposApi, 'unpublishExpo').mockResolvedValue({
        ...mockPublishedExpo,
        status: 'draft',
      });

      renderWithClient(<AdminExposPage />);

      await waitFor(() => {
        expect(screen.getByText('Published Expo 2026')).toBeInTheDocument();
      });

      const unpublishBtn = screen.getByRole('button', { name: /unpublish/i });
      fireEvent.click(unpublishBtn);

      await waitFor(() => {
        expect(unpublishSpy).toHaveBeenCalledWith('expo-pub-1');
      });
    });

    it('requires typing exact expo title before delete confirm activates', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [mockDraftExpo],
        meta: { page: 1, limit: 50, total: 1, pages: 1 },
      });
      const deleteSpy = vi.spyOn(ExposApi, 'deleteExpo').mockResolvedValue({});

      renderWithClient(<AdminExposPage />);

      await waitFor(() => {
        expect(screen.getByText('Draft Expo 2026')).toBeInTheDocument();
      });

      // Open action dropdown
      const actionDropdown = screen.getByRole('button', { name: '' });
      fireEvent.click(actionDropdown);

      // Click delete
      const deleteItem = screen.getByText(/delete expo/i);
      fireEvent.click(deleteItem);

      // Verify modal opened
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/warning: this action cannot be undone/i)).toBeInTheDocument();

      // Confirm button is disabled initially
      const confirmDeleteBtn = within(dialog).getByRole('button', { name: 'Delete Expo' });
      expect(confirmDeleteBtn).toBeDisabled();

      // Type partial or wrong text -> still disabled
      const typedInput = within(dialog).getByPlaceholderText('Draft Expo 2026');
      fireEvent.change(typedInput, { target: { value: 'Wrong Title' } });
      expect(confirmDeleteBtn).toBeDisabled();

      // Type exact title -> enables button
      fireEvent.change(typedInput, { target: { value: 'Draft Expo 2026' } });
      expect(confirmDeleteBtn).not.toBeDisabled();

      // Click delete confirm
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('expo-draft-1');
      });
    });
  });

  describe('ExpoFormModal', () => {
    it('validates required title and date logic', async () => {
      render(
        <ExpoFormModal show={true} onHide={vi.fn()} onSuccess={vi.fn()} />
      );

      const submitBtn = screen.getByRole('button', { name: /create expo/i });
      fireEvent.click(submitBtn);

      // Title validation error
      expect(
        screen.getByText(/title must be at least 3 characters/i)
      ).toBeInTheDocument();

      // Fill title, but invalid dates (endDate < startDate)
      const titleInput = screen.getByLabelText(/expo title/i);
      const startInput = screen.getByLabelText(/start date/i);
      const endInput = screen.getByLabelText(/end date/i);

      fireEvent.change(titleInput, { target: { value: 'Valid Expo Title' } });
      fireEvent.change(startInput, { target: { value: '2026-10-15' } });
      fireEvent.change(endInput, { target: { value: '2026-10-10' } });

      fireEvent.click(submitBtn);

      expect(
        screen.getByText(/end date cannot be earlier than start date/i)
      ).toBeInTheDocument();
    });

    it('submits valid form data to createExpo', async () => {
      const createSpy = vi.spyOn(ExposApi, 'createExpo').mockResolvedValue({
        id: 'new-expo-id',
        title: 'Future Tech Expo 2027',
      });
      const onSuccess = vi.fn();
      const onHide = vi.fn();

      render(
        <ExpoFormModal show={true} onHide={onHide} onSuccess={onSuccess} />
      );

      fireEvent.change(screen.getByLabelText(/expo title/i), {
        target: { value: 'Future Tech Expo 2027' },
      });
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: 'Robotics' },
      });
      fireEvent.change(screen.getByLabelText(/city/i), {
        target: { value: 'Berlin' },
      });

      const submitBtn = screen.getByRole('button', { name: /create expo/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
        expect(onHide).toHaveBeenCalled();
      });
    });

    it('prefills fields and calls updateExpo in edit mode', async () => {
      const updateSpy = vi.spyOn(ExposApi, 'updateExpo').mockResolvedValue({
        ...mockDraftExpo,
        title: 'Updated Expo Title',
      });
      const onSuccess = vi.fn();

      render(
        <ExpoFormModal
          show={true}
          expo={mockDraftExpo}
          onHide={vi.fn()}
          onSuccess={onSuccess}
        />
      );

      const titleInput = screen.getByLabelText(/expo title/i);
      expect(titleInput.value).toBe('Draft Expo 2026');

      fireEvent.change(titleInput, { target: { value: 'Updated Expo Title' } });

      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          'expo-draft-1',
          expect.objectContaining({ title: 'Updated Expo Title' })
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
