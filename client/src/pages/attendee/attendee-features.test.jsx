/**
 * @fileoverview Unit tests for Attendee Features Pages (T-6.5, T-6.9, T-6.10).
 * Tests AttendeeRegistrationsPage, TicketModal, AttendeeAgendaPage,
 * seat releasing, unbookmarking, and calendar .ics export.
 * FR-ATT-02, FR-ATT-08.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AttendeeRegistrationsPage from './AttendeeRegistrationsPage.jsx';
import AttendeeAgendaPage from './AttendeeAgendaPage.jsx';
import * as AttendeeApi from '../../api/attendee.js';
import * as CalendarLib from '../../lib/calendarExport.js';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const mockRegistrations = [
  {
    id: 'reg-1',
    ticketCode: 'TKT-AB12CD-X9Y8',
    checkedInAt: null,
    expo: {
      id: 'expo-1',
      title: 'Global Tech Summit 2027',
      slug: 'global-tech-summit-2027',
      startDate: '2027-08-01T00:00:00.000Z',
      endDate: '2027-08-03T23:59:59.000Z',
      venue: { name: 'Main Convention Hall' },
    },
  },
];

const mockAgendaEngagements = [
  {
    id: 'eng-1',
    kind: 'registered',
    expo: { id: 'expo-1', title: 'Global Tech Summit 2027' },
    session: {
      id: 'sess-1',
      title: 'AI Revolution Keynote',
      type: 'keynote',
      status: 'scheduled',
      startTime: '2027-08-01T09:00:00.000Z',
      endTime: '2027-08-01T10:00:00.000Z',
      room: 'Grand Ballroom',
      speakers: [{ name: 'Dr. Jane Smith' }],
    },
  },
  {
    id: 'eng-2',
    kind: 'bookmark',
    expo: { id: 'expo-1', title: 'Global Tech Summit 2027' },
    session: {
      id: 'sess-2',
      title: 'Web3 & Security Workshop',
      type: 'workshop',
      status: 'updated',
      updatedReason: 'Room changed to Lab B',
      startTime: '2027-08-02T11:00:00.000Z',
      endTime: '2027-08-02T12:30:00.000Z',
      room: 'Lab B',
      speakers: [{ name: 'Bob Wilson' }],
    },
  },
];

describe('T-6.5: AttendeeRegistrationsPage & TicketModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AttendeeApi, 'fetchMyExpoRegistrations').mockResolvedValue({
      items: mockRegistrations,
      meta: { total: 1 },
    });
  });

  it('renders registered event passes with ticket code', async () => {
    renderWithProviders(<AttendeeRegistrationsPage />);

    expect(await screen.findByText('My Event Passes & Tickets')).toBeInTheDocument();
    expect(await screen.findByText('Global Tech Summit 2027')).toBeInTheDocument();
    expect(screen.getByText('TKT-AB12CD-X9Y8')).toBeInTheDocument();
  });

  it('opens TicketModal on clicking View Pass', async () => {
    renderWithProviders(<AttendeeRegistrationsPage />);

    const viewPassBtn = await screen.findByRole('button', { name: /View Pass/i });
    fireEvent.click(viewPassBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Event Entry Pass')).toBeInTheDocument();
    expect(screen.getByText('Official Attendee Pass')).toBeInTheDocument();
  });

  it('shows empty state when user has no registrations', async () => {
    vi.spyOn(AttendeeApi, 'fetchMyExpoRegistrations').mockResolvedValue({
      items: [],
      meta: { total: 0 },
    });

    renderWithProviders(<AttendeeRegistrationsPage />);

    expect(await screen.findByText('No Event Passes Yet')).toBeInTheDocument();
  });
});

describe('T-6.9 & T-6.10: AttendeeAgendaPage & Calendar Export', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AttendeeApi, 'fetchMyAgenda').mockResolvedValue({
      items: mockAgendaEngagements,
      meta: { total: 2 },
    });
  });

  it('renders agenda items grouped by day with session details', async () => {
    renderWithProviders(<AttendeeAgendaPage />);

    expect(await screen.findByText('My Personal Agenda')).toBeInTheDocument();
    expect(await screen.findByText('AI Revolution Keynote')).toBeInTheDocument();
    expect(screen.getByText('Web3 & Security Workshop')).toBeInTheDocument();

    // Badges
    expect(screen.getByText(/Registered Seat/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Bookmarked/i).length).toBeGreaterThan(0);

    // Notice banner on updated session
    expect(screen.getByText(/Room changed to Lab B/)).toBeInTheDocument();
  });

  it('filters agenda by tab', async () => {
    renderWithProviders(<AttendeeAgendaPage />);

    await screen.findByText('AI Revolution Keynote');

    // Switch to Registered tab
    const registeredTab = screen.getByRole('button', { name: /Registered/i });
    fireEvent.click(registeredTab);

    expect(screen.getByText('AI Revolution Keynote')).toBeInTheDocument();
    expect(screen.queryByText('Web3 & Security Workshop')).not.toBeInTheDocument();

    // Switch to Wishlist tab
    const wishlistTab = screen.getByRole('button', { name: /Wishlist/i });
    fireEvent.click(wishlistTab);

    expect(screen.getByText('Web3 & Security Workshop')).toBeInTheDocument();
    expect(screen.queryByText('AI Revolution Keynote')).not.toBeInTheDocument();
  });

  it('releases seat on clicking Release Seat button', async () => {
    const unregSpy = vi.spyOn(AttendeeApi, 'unregisterFromSession').mockResolvedValue();

    renderWithProviders(<AttendeeAgendaPage />);

    const releaseBtn = await screen.findByRole('button', { name: /Release Seat/i });
    fireEvent.click(releaseBtn);

    await waitFor(() => {
      expect(unregSpy).toHaveBeenCalledWith('sess-1');
    });
  });

  it('triggers calendar export download on clicking .ics button', async () => {
    const downloadSpy = vi.spyOn(CalendarLib, 'downloadIcsFile').mockImplementation(() => {});

    renderWithProviders(<AttendeeAgendaPage />);

    const icsButtons = await screen.findAllByRole('button', { name: /\.ics/i });
    fireEvent.click(icsButtons[0]);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\.ics$/),
        expect.stringContaining('BEGIN:VCALENDAR')
      );
    });
  });
});
