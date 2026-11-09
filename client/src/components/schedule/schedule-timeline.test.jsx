/**
 * @fileoverview Unit tests for Public/Attendee ScheduleTimeline component.
 * T-5.6. FR-ATT-06.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScheduleTimeline from './ScheduleTimeline.jsx';
import * as SessionsApi from '../../api/sessions.js';
import { ToastProvider } from '../ui/ToastProvider.jsx';

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

const mockExpo = {
  id: 'expo-123',
  title: 'Future Tech Expo 2027',
  startDate: '2027-06-01T00:00:00.000Z',
  endDate: '2027-06-03T23:59:59.000Z',
};

const mockSessions = [
  {
    id: 'sess-1',
    title: 'Opening Keynote: Generative AI',
    type: 'keynote',
    status: 'scheduled',
    startTime: '2027-06-01T09:00:00.000Z',
    endTime: '2027-06-01T10:30:00.000Z',
    room: 'Grand Ballroom',
    track: 'AI & Data',
    capacity: 500,
    description: 'A deep dive into frontier foundational models and their impact on enterprise software.',
    speakers: [{ name: 'Dr. Sarah Connor', org: 'Cyberdyne AI' }],
    tags: ['ai', 'keynote'],
  },
  {
    id: 'sess-2',
    title: 'Hands-on WebAssembly Workshop',
    type: 'workshop',
    status: 'updated',
    updatedReason: 'Room changed to Lab 3',
    startTime: '2027-06-01T11:00:00.000Z',
    endTime: '2027-06-01T13:00:00.000Z',
    room: 'Lab 3',
    track: 'Engineering',
    capacity: 40,
    description: 'Build high-performance browser modules using Rust and WASM.',
    speakers: [{ name: 'Alex Rivera', org: 'WebAssembly Org' }],
    tags: ['wasm', 'rust'],
  },
  {
    id: 'sess-3',
    title: 'Quantum Computing Realities',
    type: 'session',
    status: 'cancelled',
    cancelledReason: 'Speaker flight delayed',
    startTime: '2027-06-02T14:00:00.000Z',
    endTime: '2027-06-02T15:00:00.000Z',
    room: 'Room B',
    track: 'Quantum',
    capacity: 100,
    description: 'Hardware challenges in qubit coherence and error mitigation.',
    speakers: [{ name: 'Prof. David Hilbert', org: 'Max Planck' }],
    tags: ['quantum'],
  },
];

describe('T-5.6: ScheduleTimeline Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(SessionsApi, 'fetchExpoSessions').mockResolvedValue({
      items: mockSessions,
      meta: { total: 3 },
    });
  });

  it('renders day tabs derived from expo dates and filter bar', async () => {
    renderWithClient(<ScheduleTimeline expoId="expo-123" expo={mockExpo} />);

    // Day tabs
    expect(await screen.findByText('All Days')).toBeInTheDocument();
    expect(screen.getByText(/Day 1/)).toBeInTheDocument();
    expect(screen.getByText(/Day 2/)).toBeInTheDocument();
    expect(screen.getByText(/Day 3/)).toBeInTheDocument();

    // Filter bar
    expect(screen.getByPlaceholderText(/Search title, speaker/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by session type/i)).toBeInTheDocument();
  });

  it('renders sessions with time ranges, types, and speaker details', async () => {
    renderWithClient(<ScheduleTimeline expoId="expo-123" expo={mockExpo} />);

    expect(await screen.findByText('Opening Keynote: Generative AI')).toBeInTheDocument();
    expect(screen.getByText('Hands-on WebAssembly Workshop')).toBeInTheDocument();
    expect(screen.getByText('Quantum Computing Realities')).toBeInTheDocument();

    // Speakers
    expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();

    // Rooms
    expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    expect(screen.getByText('Lab 3')).toBeInTheDocument();
  });

  it('displays status notices for updated and cancelled sessions', async () => {
    renderWithClient(<ScheduleTimeline expoId="expo-123" expo={mockExpo} />);

    // Updated notice
    expect(await screen.findByText(/Room changed to Lab 3/)).toBeInTheDocument();

    // Cancelled notice
    expect(screen.getByText(/Speaker flight delayed/)).toBeInTheDocument();
    // Title is rendered with strikethrough styling
    const cancelledTitle = screen.getByText('Quantum Computing Realities');
    expect(cancelledTitle).toHaveClass('text-decoration-line-through');
  });

  it('filters sessions by search query input', async () => {
    renderWithClient(<ScheduleTimeline expoId="expo-123" expo={mockExpo} />);

    await screen.findByText('Opening Keynote: Generative AI');

    const searchInput = screen.getByPlaceholderText(/Search title, speaker/i);
    fireEvent.change(searchInput, { target: { value: 'WebAssembly' } });

    await waitFor(() => {
      expect(screen.getByText('Hands-on WebAssembly Workshop')).toBeInTheDocument();
      expect(screen.queryByText('Opening Keynote: Generative AI')).not.toBeInTheDocument();
      expect(screen.queryByText('Quantum Computing Realities')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no sessions match filters', async () => {
    renderWithClient(<ScheduleTimeline expoId="expo-123" expo={mockExpo} />);

    await screen.findByText('Opening Keynote: Generative AI');

    const searchInput = screen.getByPlaceholderText(/Search title, speaker/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentTopicXYZ' } });

    await waitFor(() => {
      expect(screen.getByText('No Sessions Found')).toBeInTheDocument();
    });
  });
});
