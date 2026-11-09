/**
 * @fileoverview Unit tests for ExhibitorsDirectory component (T-6.7).
 * Tests search, category filter, card rendering, and floor plan navigation.
 * FR-ATT-03, FR-ATT-04.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExhibitorsDirectory } from './ExhibitorsDirectory.jsx';
import * as ExhibitorsApi from '../../api/exhibitors.js';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockExhibitors = [
  {
    id: 'exh-1',
    companyName: 'Quantum AI Systems',
    category: 'technology',
    description: 'Next-generation quantum neural accelerators.',
    products: ['Q-Chip 1', 'Quantum SDK'],
    booth: { id: 'b-1', code: 'A-12', expo: 'expo-1' },
  },
  {
    id: 'exh-2',
    companyName: 'BioHealth Labs',
    category: 'healthcare',
    description: 'Precision genomic diagnostics and mRNA therapeutics.',
    products: ['GeneScan Pro'],
    booth: { id: 'b-2', code: 'B-04', expo: 'expo-1' },
  },
];

describe('T-6.7: ExhibitorsDirectory Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ExhibitorsApi, 'fetchPublicExhibitors').mockResolvedValue({
      items: mockExhibitors,
      meta: { total: 2, pages: 1 },
    });
  });

  it('renders exhibitor cards with company names, categories, and booth numbers', async () => {
    renderWithProviders(<ExhibitorsDirectory />);

    expect(await screen.findByText('Quantum AI Systems')).toBeInTheDocument();
    expect(screen.getByText('BioHealth Labs')).toBeInTheDocument();

    // Booth badges
    expect(screen.getByText('Booth A-12')).toBeInTheDocument();
    expect(screen.getByText('Booth B-04')).toBeInTheDocument();

    // Products
    expect(screen.getByText('Q-Chip 1')).toBeInTheDocument();
  });

  it('filters exhibitors with debounced search', async () => {
    const fetchSpy = vi.spyOn(ExhibitorsApi, 'fetchPublicExhibitors').mockResolvedValue({
      items: [mockExhibitors[0]],
      meta: { total: 1, pages: 1 },
    });

    renderWithProviders(<ExhibitorsDirectory />);

    await screen.findByText('Quantum AI Systems');

    const searchInput = screen.getByPlaceholderText(/Search exhibitors by company/i);
    fireEvent.change(searchInput, { target: { value: 'Quantum' } });

    // Wait for 300 ms debounce
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'Quantum',
        })
      );
    });
  });

  it('filters exhibitors by category dropdown', async () => {
    const fetchSpy = vi.spyOn(ExhibitorsApi, 'fetchPublicExhibitors').mockResolvedValue({
      items: [mockExhibitors[1]],
      meta: { total: 1, pages: 1 },
    });

    renderWithProviders(<ExhibitorsDirectory />);

    await screen.findByText('BioHealth Labs');

    const categorySelect = screen.getByLabelText(/Filter by category/i);
    fireEvent.change(categorySelect, { target: { value: 'healthcare' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'healthcare',
        })
      );
    });
  });

  it('calls onShowOnFloorPlan callback when clicking Floor Plan button', async () => {
    const floorPlanMock = vi.fn();

    renderWithProviders(<ExhibitorsDirectory onShowOnFloorPlan={floorPlanMock} />);

    const floorPlanBtns = await screen.findAllByRole('button', { name: /Floor Plan/i });
    fireEvent.click(floorPlanBtns[0]);

    expect(floorPlanMock).toHaveBeenCalledWith(mockExhibitors[0].booth);
  });
});
