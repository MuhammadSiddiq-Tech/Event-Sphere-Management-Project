/**
 * @fileoverview Unit and integration tests for Admin Applications Management Page (T-4.11).
 * Tests AdminApplicationsPage, review drawer, approval with booth allocation,
 * and rejection with mandatory reason.
 * FR-EXH-01, FR-EXH-02, FR-EXH-03.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminApplicationsPage from './AdminApplicationsPage.jsx';
import * as ApplicationsApi from '../../api/applications.js';
import * as ExposApi from '../../api/expos.js';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
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

const mockApplications = [
  {
    id: 'app-1',
    status: 'pending',
    createdAt: '2026-11-05T00:00:00.000Z',
    expo: { id: 'expo-1', title: 'AI Expo 2026' },
    exhibitor: { name: 'John Doe', email: 'john@quantum.test' },
    companySnapshot: {
      companyName: 'Quantum AI Labs',
      category: 'technology',
      website: 'https://quantum.test',
      description: 'Quantum machine learning chips.',
    },
    boothPreferences: [{ size: 'large', notes: 'Need 3-phase power' }],
    documents: [{ filename: 'CompanyRegistration.pdf', url: 'https://cdn.test/doc.pdf' }],
  },
  {
    id: 'app-2',
    status: 'approved',
    createdAt: '2026-10-20T00:00:00.000Z',
    expo: { id: 'expo-1', title: 'AI Expo 2026' },
    exhibitor: { name: 'Jane Smith', email: 'jane@biorobotics.test' },
    companySnapshot: {
      companyName: 'BioRobotics Inc',
      category: 'healthcare',
    },
    assignedBooth: { code: 'A-05' },
    boothPreferences: [{ size: 'medium' }],
  },
];

describe('T-4.11: Admin Applications Management & Review Drawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ApplicationsApi, 'fetchAdminApplications').mockResolvedValue({
      items: mockApplications,
      meta: { total: 2 },
    });
    vi.spyOn(ExposApi, 'fetchExpoBooths').mockResolvedValue([
      { id: 'booth-avail-1', code: 'C-01', size: 'large', status: 'available', pricePerDay: 500 },
    ]);
  });

  it('renders applications table with companies, expos, status pills, and action buttons', async () => {
    renderWithClient(<AdminApplicationsPage />);

    expect(await screen.findByText('Quantum AI Labs')).toBeInTheDocument();
    expect(screen.getByText('BioRobotics Inc')).toBeInTheDocument();
    expect(screen.getByText('Booth A-05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('opens review drawer on click and approves application with booth assignment', async () => {
    const approveSpy = vi
      .spyOn(ApplicationsApi, 'approveApplication')
      .mockResolvedValue({ id: 'app-1', status: 'approved' });

    renderWithClient(<AdminApplicationsPage />);

    // Click Review button
    const reviewBtn = await screen.findByRole('button', { name: 'Review' });
    fireEvent.click(reviewBtn);

    // Drawer should show details
    expect(await screen.findByText(/Need 3-phase power/i)).toBeInTheDocument();
    expect(screen.getByText('CompanyRegistration.pdf')).toBeInTheDocument();

    // Select booth from dropdown
    const boothSelect = screen.getByRole('combobox');
    fireEvent.change(boothSelect, { target: { value: 'booth-avail-1' } });

    // Submit approval
    const confirmApproveBtn = screen.getByRole('button', { name: /confirm approval/i });
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ boothId: 'booth-avail-1' })
      );
    });
  });

  it('rejects application requiring rejection reason and validates empty input', async () => {
    const rejectSpy = vi
      .spyOn(ApplicationsApi, 'rejectApplication')
      .mockResolvedValue({ id: 'app-1', status: 'rejected' });

    renderWithClient(<AdminApplicationsPage />);

    // Click Review button
    const reviewBtn = await screen.findByRole('button', { name: 'Review' });
    fireEvent.click(reviewBtn);

    // Switch to Reject tab
    const rejectTabBtn = await screen.findByRole('button', { name: /^reject$/i });
    fireEvent.click(rejectTabBtn);

    // Click Confirm Rejection without typing reason
    const confirmRejectBtn = screen.getByRole('button', { name: /confirm rejection/i });
    fireEvent.click(confirmRejectBtn);

    // Should not call API when reason is empty
    expect(rejectSpy).not.toHaveBeenCalled();

    // Fill in reason
    const reasonInput = screen.getByPlaceholderText(/state the reason for rejection/i);
    fireEvent.change(reasonInput, { target: { value: 'Company scope mismatch with expo theme' } });

    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ reason: 'Company scope mismatch with expo theme' })
      );
    });
  });
});
