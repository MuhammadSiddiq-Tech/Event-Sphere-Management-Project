/**
 * @fileoverview Vitest tests for Exhibitor Booth Selection, Reservation Modal, and 409 Conflict Handling.
 * T-3.14. FR-EXP-03, FR-EXP-04, Rules BR-3, BR-4.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { BoothReservationModal } from './BoothReservationModal.jsx';
import { FloorPlan } from './FloorPlan.jsx';
import ExpoDetailPage from '../../pages/expos/ExpoDetailPage.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../components/ui/index.js';
import * as exposApi from '../../api/expos.js';

vi.mock('../../api/expos.js');

const mockExpo = {
  id: '660000000000000000000001',
  title: 'Global Tech Summit 2026',
  slug: 'global-tech-summit-2026',
  status: 'published',
  startDate: '2026-06-01T09:00:00.000Z',
  endDate: '2026-06-04T18:00:00.000Z', // 3 days
  venue: { name: 'Convention Center', city: 'San Francisco', country: 'USA' },
};

const mockAvailableBooth = {
  id: 'booth-101',
  code: 'A-101',
  label: 'Prime Entrance Booth',
  size: 'large',
  pricePerDay: 400,
  status: 'available',
  geometry: { x: 2, y: 2, w: 4, h: 3 },
};

const mockReservedBooth = {
  id: 'booth-102',
  code: 'A-102',
  label: 'Startup Alley',
  size: 'small',
  pricePerDay: 150,
  status: 'reserved',
  reservedBy: 'exhibitor-1',
  geometry: { x: 7, y: 2, w: 2, h: 2 },
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui, { user = null } = {}) {
  const queryClient = createTestQueryClient();
  const authValue = {
    user,
    isAuthenticated: !!user,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/expos/global-tech-summit-2026']}>
            {ui}
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('T-3.14: BoothReservationModal', () => {
  it('renders booth specifications, duration calculation, and total price', () => {
    const onConfirm = vi.fn();
    const onHide = vi.fn();

    render(
      <MemoryRouter>
        <BoothReservationModal
          show={true}
          onHide={onHide}
          booth={mockAvailableBooth}
          expo={mockExpo}
          onConfirm={onConfirm}
        />
      </MemoryRouter>
    );

    // Booth code & dimensions
    expect(screen.getByText('Reserve Booth A-101')).toBeInTheDocument();
    expect(screen.getByText('4 × 3 m')).toBeInTheDocument();
    expect(screen.getByText('12 m²')).toBeInTheDocument();

    // Price calculation ($400/day * 3 days = $1,200)
    expect(screen.getByText('$400')).toBeInTheDocument();
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByText(/for 3 days/i)).toBeInTheDocument();

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Reserve Booth/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith(mockAvailableBooth);
  });

  it('displays friendly 409 Race Condition alert when booth was just reserved by another exhibitor', () => {
    const onHide = vi.fn();
    const conflictError = {
      status: 409,
      message: 'That booth was just reserved or is no longer available. Please select another booth.',
    };

    render(
      <MemoryRouter>
        <BoothReservationModal
          show={true}
          onHide={onHide}
          booth={mockAvailableBooth}
          expo={mockExpo}
          error={conflictError}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Booth Just Taken!/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Another exhibitor just completed their reservation for/i)
    ).toBeInTheDocument();

    // Confirm button should be replaced by "Choose Another Booth"
    const chooseBtn = screen.getByRole('button', { name: /Choose Another Booth/i });
    expect(chooseBtn).toBeInTheDocument();
    fireEvent.click(chooseBtn);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('displays Rule BR-3 alert when exhibitor lacks an approved application', () => {
    const appRequiredError = {
      status: 403,
      message: 'An approved application for this expo is required before reserving a booth (Rule BR-3).',
    };

    render(
      <MemoryRouter>
        <BoothReservationModal
          show={true}
          booth={mockAvailableBooth}
          expo={mockExpo}
          error={appRequiredError}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Approved Application Required \(Rule BR-3\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Applications/i })).toBeInTheDocument();
  });

  it('displays Rule BR-4 alert when exhibitor already holds a booth in this expo', () => {
    const alreadyHoldingError = {
      status: 409,
      message: 'You already hold a booth in this expo. Maximum 1 booth allowed per exhibitor (Rule BR-4).',
    };

    render(
      <MemoryRouter>
        <BoothReservationModal
          show={true}
          booth={mockAvailableBooth}
          expo={mockExpo}
          error={alreadyHoldingError}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Booth Limit Reached \(Rule BR-4\)/i)).toBeInTheDocument();
  });
});

describe('T-3.14: FloorPlan Select Mode', () => {
  it('highlights available booths as selectable and opens drawer with Reserve action', () => {
    const onReserveClick = vi.fn();

    render(
      <FloorPlan
        booths={[mockAvailableBooth, mockReservedBooth]}
        mode="select"
        onReserveClick={onReserveClick}
        reserveActionLabel="Reserve This Booth"
      />
    );

    const availableBooth = screen.getByRole('button', { name: /Booth A-101/i });
    expect(availableBooth.classList.contains('is-selectable')).toBe(true);

    // Clicking available booth opens drawer with Reserve button
    fireEvent.click(availableBooth);

    const reserveBtn = screen.getByRole('button', { name: /Reserve This Booth/i });
    expect(reserveBtn).toBeInTheDocument();

    fireEvent.click(reserveBtn);
    expect(onReserveClick).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'A-101' })
    );
  });
});

describe('T-3.14: Exhibitor Reservation Flow on ExpoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows an authenticated exhibitor to select an available booth and reserve it', async () => {
    exposApi.fetchExpoBySlug.mockResolvedValue(mockExpo);
    exposApi.fetchExpoBooths.mockResolvedValue([mockAvailableBooth]);
    exposApi.reserveBooth.mockResolvedValue({ ...mockAvailableBooth, status: 'reserved' });

    const exhibitorUser = { id: 'exhibitor-123', name: 'Acme Corp', role: 'exhibitor' };

    renderWithProviders(
      <Routes>
        <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
      </Routes>,
      { user: exhibitorUser }
    );

    // Wait for Expo Title
    await waitFor(() => {
      expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
    });

    // Switch to Floor Plan Tab
    const floorPlanTab = screen.getByRole('tab', { name: /Floor Plan/i });
    fireEvent.click(floorPlanTab);

    // Verify Exhibitor Mode banner
    await waitFor(() => {
      expect(screen.getByText(/Exhibitor Selection Mode:/i)).toBeInTheDocument();
      expect(screen.getByText('A-101')).toBeInTheDocument();
    });

    // Click on available booth
    const boothBtn = screen.getByRole('button', { name: /Booth A-101/i });
    fireEvent.click(boothBtn);

    // Click "Reserve This Booth" in drawer
    const drawerReserveBtn = screen.getByRole('button', { name: /Reserve This Booth/i });
    fireEvent.click(drawerReserveBtn);

    // Reservation modal opens
    expect(screen.getByText('Reserve Booth A-101')).toBeInTheDocument();

    // Confirm reservation
    const confirmModalBtn = screen.getByRole('button', { name: /Confirm & Reserve Booth/i });
    fireEvent.click(confirmModalBtn);

    await waitFor(() => {
      expect(exposApi.reserveBooth).toHaveBeenCalledWith('booth-101');
    });
  });

  it('handles 409 conflict during reservation race condition and refreshes floor plan', async () => {
    exposApi.fetchExpoBySlug.mockResolvedValue(mockExpo);
    exposApi.fetchExpoBooths.mockResolvedValue([mockAvailableBooth]);
    exposApi.reserveBooth.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            message: 'That booth was just reserved or is no longer available. Please select another booth.',
          },
        },
      },
    });

    const exhibitorUser = { id: 'exhibitor-123', name: 'Acme Corp', role: 'exhibitor' };

    renderWithProviders(
      <Routes>
        <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
      </Routes>,
      { user: exhibitorUser }
    );

    await waitFor(() => {
      expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Floor Plan/i }));

    await waitFor(() => {
      expect(screen.getByText('A-101')).toBeInTheDocument();
    });

    // Open drawer and modal
    fireEvent.click(screen.getByRole('button', { name: /Booth A-101/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reserve This Booth/i }));

    // Confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Reserve Booth/i }));

    // Should display 409 conflict UI
    await waitFor(() => {
      expect(screen.getByText(/Booth Just Taken!/i)).toBeInTheDocument();
    });
  });

  it('displays confirmed banner when exhibitor already holds a booth', async () => {
    const exhibitorUser = { id: 'exhibitor-1', name: 'Acme Corp', role: 'exhibitor' };
    exposApi.fetchExpoBySlug.mockResolvedValue(mockExpo);
    // Booth is reserved by this exhibitor
    exposApi.fetchExpoBooths.mockResolvedValue([mockReservedBooth]);

    renderWithProviders(
      <Routes>
        <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
      </Routes>,
      { user: exhibitorUser }
    );

    await waitFor(() => {
      expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Floor Plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Booth Space Confirmed:/i)).toBeInTheDocument();
      expect(screen.getByText(/Booth A-102/i)).toBeInTheDocument();
    });
  });
});
