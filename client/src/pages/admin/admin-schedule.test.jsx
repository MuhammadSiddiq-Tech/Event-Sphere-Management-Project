/**
 * @fileoverview Unit tests for Admin Schedule Manager Page (T-5.5).
 * Tests AdminSchedulePage, Grid & List view toggling, Add/Edit Session modal,
 * 409 room overlap error handling, and Cancel Session modal.
 * FR-SCH-01, FR-SCH-02, FR-SCH-03, BR-6.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSchedulePage from './AdminSchedulePage.jsx';
import * as ExposApi from '../../api/expos.js';
import * as SessionsApi from '../../api/sessions.js';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';

function renderWithClient(initialEntry = '/admin/expos/expo-1/schedule') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/admin/schedule" element={<AdminSchedulePage />} />
            <Route path="/admin/expos/:id/schedule" element={<AdminSchedulePage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const mockExpos = [
  {
    id: 'expo-1',
    title: 'Global Tech Summit 2027',
    startDate: '2027-06-01T00:00:00.000Z',
    endDate: '2027-06-03T23:59:59.000Z',
    status: 'published',
    venue: { name: 'Convention Center' },
  },
];

const mockSessions = [
  {
    id: 'sess-1',
    title: 'Opening Keynote',
    type: 'keynote',
    status: 'scheduled',
    startTime: '2027-06-01T09:00:00.000Z',
    endTime: '2027-06-01T10:00:00.000Z',
    room: 'Main Hall',
    track: 'General',
    capacity: 300,
    speakers: [{ name: 'Elena Rostova', org: 'TechCorp' }],
  },
  {
    id: 'sess-2',
    title: 'Cloud Native Workshop',
    type: 'workshop',
    status: 'scheduled',
    startTime: '2027-06-01T10:30:00.000Z',
    endTime: '2027-06-01T12:00:00.000Z',
    room: 'Workshop Lab',
    track: 'Cloud',
    capacity: 50,
    speakers: [{ name: 'Marcus Vance', org: 'CloudWorks' }],
  },
];

describe('T-5.5: Admin Schedule Manager Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
      items: mockExpos,
      meta: { total: 1 },
    });
    vi.spyOn(ExposApi, 'fetchExpoById').mockResolvedValue(mockExpos[0]);
    vi.spyOn(SessionsApi, 'fetchExpoSessions').mockResolvedValue({
      items: mockSessions,
      meta: { total: 2 },
    });
  });

  it('renders schedule manager page with expo header, day tabs, and room columns in grid view', async () => {
    renderWithClient('/admin/expos/expo-1/schedule');

    expect(await screen.findByText('Schedule Manager')).toBeInTheDocument();
    expect(await screen.findByText('Global Tech Summit 2027')).toBeInTheDocument();

    // Day tabs
    expect(screen.getByText(/All Days/)).toBeInTheDocument();

    // Room column headers in grid view
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
    expect(screen.getByText('Workshop Lab')).toBeInTheDocument();

    // Session titles
    expect(screen.getByText('Opening Keynote')).toBeInTheDocument();
    expect(screen.getByText('Cloud Native Workshop')).toBeInTheDocument();
  });

  it('toggles between Grid and List views', async () => {
    renderWithClient('/admin/expos/expo-1/schedule');

    expect(await screen.findByText('Opening Keynote')).toBeInTheDocument();

    // Click List view toggle
    const listBtn = screen.getByRole('button', { name: /List/i });
    fireEvent.click(listBtn);

    // Timeline view rendered with search input
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search title, speaker/i)).toBeInTheDocument();
    });

    // Toggle back to Grid
    const gridBtn = screen.getByRole('button', { name: /Grid/i });
    fireEvent.click(gridBtn);

    await waitFor(() => {
      expect(screen.getByText('Main Hall')).toBeInTheDocument();
    });
  });

  it('opens Add Session modal and successfully creates a session', async () => {
    const createSpy = vi.spyOn(SessionsApi, 'createSession').mockResolvedValue({
      id: 'sess-new',
      title: 'New AI Panel',
      type: 'session',
      status: 'scheduled',
      startTime: '2027-06-01T14:00:00.000Z',
      endTime: '2027-06-01T15:00:00.000Z',
      room: 'Main Hall',
    });

    renderWithClient('/admin/expos/expo-1/schedule');

    await screen.findByText('Schedule Manager');

    // Click Add Session button
    const addBtn = screen.getByRole('button', { name: /Add Session/i });
    fireEvent.click(addBtn);

    // Modal opens
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Session')).toBeInTheDocument();

    // Fill form
    const titleInput = screen.getByLabelText(/Session Title/i);
    fireEvent.change(titleInput, { target: { value: 'New AI Panel' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Create Session/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'expo-1',
        expect.objectContaining({
          title: 'New AI Panel',
          type: 'session',
        })
      );
    });
  });

  it('displays 409 conflict error when room is already booked', async () => {
    vi.spyOn(SessionsApi, 'createSession').mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Room "Main Hall" is already booked for "Opening Keynote" during the requested time slot.',
          },
        },
      },
    });

    renderWithClient('/admin/expos/expo-1/schedule');

    await screen.findByText('Schedule Manager');

    const addBtn = screen.getByRole('button', { name: /Add Session/i });
    fireEvent.click(addBtn);

    const titleInput = await screen.findByLabelText(/Session Title/i);
    fireEvent.change(titleInput, { target: { value: 'Conflicting Keynote' } });

    const submitBtn = screen.getByRole('button', { name: /Create Session/i });
    fireEvent.click(submitBtn);

    // Verify 409 conflict message appears in modal
    expect(
      await screen.findByText(/Room "Main Hall" is already booked for "Opening Keynote"/i)
    ).toBeInTheDocument();
  });

  it('opens cancel modal and confirms cancellation with reason', async () => {
    const cancelSpy = vi.spyOn(SessionsApi, 'cancelSession').mockResolvedValue({
      id: 'sess-1',
      title: 'Opening Keynote',
      status: 'cancelled',
      cancelledReason: 'Keynote speaker unable to travel',
    });

    renderWithClient('/admin/expos/expo-1/schedule');

    expect(await screen.findByText('Opening Keynote')).toBeInTheDocument();

    // Open session action dropdown
    const actionToggle = document.getElementById('session-actions-sess-1');
    fireEvent.click(actionToggle);

    // Click Cancel Session dropdown item
    const cancelItem = await screen.findByText('Cancel Session');
    fireEvent.click(cancelItem);

    // Modal opens
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to cancel the session/i)).toBeInTheDocument();

    // Enter cancellation reason
    const reasonInput = screen.getByLabelText(/Cancellation Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Keynote speaker unable to travel' } });

    // Confirm cancellation
    const confirmBtn = screen.getByRole('button', { name: /Confirm Cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith('sess-1', {
        cancelledReason: 'Keynote speaker unable to travel',
      });
    });
  });
});
