/**
 * @fileoverview Unit and integration tests for Expos List and Detail Pages (T-3.10).
 * Tests ExpoCard, ExpoFilters, ExposListPage, and ExpoDetailPage.
 * FR-ATT-01, Rules 6.5.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpoCard } from '../../components/expos/ExpoCard.jsx';
import { ExpoFilters } from '../../components/expos/ExpoFilters.jsx';
import ExposListPage from './ExposListPage.jsx';
import ExpoDetailPage from './ExpoDetailPage.jsx';
import * as ExposApi from '../../api/expos.js';

function renderWithClient(ui, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockExpo = {
  id: '6af011112222333344445555',
  slug: 'global-tech-summit-2026',
  title: 'Global Tech Summit 2026',
  description: 'The premier international conference for enterprise tech.',
  category: 'Technology',
  status: 'published',
  startDate: '2026-10-15T09:00:00.000Z',
  endDate: '2026-10-18T18:00:00.000Z',
  venue: {
    name: 'Convention Center',
    city: 'Dubai',
    country: 'UAE',
  },
  tags: ['AI', 'Cloud', 'Cybersecurity'],
  maxBooths: 50,
};

describe('T-3.10: Public Expos Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ExpoCard', () => {
    it('renders expo title, category, date, venue, status, and tags', () => {
      render(
        <MemoryRouter>
          <ExpoCard expo={mockExpo} />
        </MemoryRouter>
      );

      expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText(/Dubai, UAE/i)).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
    });
  });

  describe('ExpoFilters', () => {
    it('calls onSearchChange when typing in search input after debounce', async () => {
      const onSearchChange = vi.fn();
      render(
        <ExpoFilters
          search=""
          status=""
          category=""
          allCategories={['Technology', 'Healthcare']}
          onSearchChange={onSearchChange}
          onStatusChange={vi.fn()}
          onCategoryChange={vi.fn()}
          onClear={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search expos/i);
      fireEvent.change(input, { target: { value: 'Summit' } });

      await waitFor(
        () => {
          expect(onSearchChange).toHaveBeenCalledWith('Summit');
        },
        { timeout: 500 }
      );
    });

    it('handles status and category filter chip clicks', () => {
      const onStatusChange = vi.fn();
      const onCategoryChange = vi.fn();

      render(
        <ExpoFilters
          search=""
          status=""
          category=""
          allCategories={['Technology']}
          onSearchChange={vi.fn()}
          onStatusChange={onStatusChange}
          onCategoryChange={onCategoryChange}
          onClear={vi.fn()}
        />
      );

      const upcomingBtn = screen.getByRole('button', { name: /upcoming/i });
      fireEvent.click(upcomingBtn);
      expect(onStatusChange).toHaveBeenCalledWith('published');

      const techBtn = screen.getByRole('button', { name: 'Technology' });
      fireEvent.click(techBtn);
      expect(onCategoryChange).toHaveBeenCalledWith('Technology');
    });

    it('triggers onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      render(
        <ExpoFilters
          search="tech"
          status="published"
          category=""
          allCategories={[]}
          onSearchChange={vi.fn()}
          onStatusChange={vi.fn()}
          onCategoryChange={vi.fn()}
          onClear={onClear}
        />
      );

      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearBtn);
      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('ExposListPage', () => {
    it('renders list of expos when query succeeds', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [mockExpo],
        meta: { page: 1, limit: 12, total: 1, pages: 1 },
      });

      renderWithClient(<ExposListPage />);

      await waitFor(() => {
        expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
      });

      expect(screen.getByText(/showing/i)).toBeInTheDocument();
    });

    it('renders empty state when no expos match', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 12, total: 0, pages: 0 },
      });

      renderWithClient(<ExposListPage />);

      await waitFor(() => {
        expect(screen.getByText(/no expos found/i)).toBeInTheDocument();
      });
    });

    it('displays error message when query fails', async () => {
      vi.spyOn(ExposApi, 'fetchPublicExpos').mockRejectedValue(
        new Error('Network error')
      );

      renderWithClient(<ExposListPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load expos/i)).toBeInTheDocument();
      });
    });
  });

  describe('ExpoDetailPage', () => {
    it('renders expo details and handles tab switches', async () => {
      vi.spyOn(ExposApi, 'fetchExpoBySlug').mockResolvedValue(mockExpo);
      vi.spyOn(ExposApi, 'fetchExpoBooths').mockResolvedValue([
        {
          id: 'b1',
          code: 'A-101',
          size: 'large',
          status: 'available',
          pricePerDay: 500,
          label: 'Premium Corner',
        },
        {
          id: 'b2',
          code: 'A-102',
          size: 'medium',
          status: 'reserved',
          pricePerDay: 300,
          label: 'Standard',
        },
      ]);

      renderWithClient(
        <Routes>
          <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
        </Routes>,
        ['/expos/global-tech-summit-2026']
      );

      // Hero info
      await waitFor(() => {
        expect(screen.getByText('Global Tech Summit 2026')).toBeInTheDocument();
      });

      expect(screen.getByText('About This Expo')).toBeInTheDocument();
      expect(
        screen.getByText(/The premier international conference for enterprise tech/i)
      ).toBeInTheDocument();

      // Switch to Floor Plan tab
      const floorPlanTab = screen.getByRole('tab', { name: /floor plan/i });
      fireEvent.click(floorPlanTab);

      // Check booth codes and legend in floor plan
      await waitFor(() => {
        expect(screen.getByText('A-101')).toBeInTheDocument();
        expect(screen.getByText('A-102')).toBeInTheDocument();
        expect(screen.getByText(/Total:/i)).toBeInTheDocument();
      });
    });

    it('renders 404 not found state when expo does not exist', async () => {
      const err = new Error('Not found');
      err.response = { status: 404 };
      vi.spyOn(ExposApi, 'fetchExpoBySlug').mockRejectedValue(err);

      renderWithClient(
        <Routes>
          <Route path="/expos/:idOrSlug" element={<ExpoDetailPage />} />
        </Routes>,
        ['/expos/non-existent-expo']
      );

      await waitFor(() => {
        expect(screen.getByText('Expo Not Found')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /browse expos/i })).toBeInTheDocument();
      });
    });
  });
});
