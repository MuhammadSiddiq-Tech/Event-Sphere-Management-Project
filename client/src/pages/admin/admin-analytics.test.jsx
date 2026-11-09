/**
 * @fileoverview Unit tests for AdminAnalyticsPage (T-8.4, T-8.5, T-8.6).
 * FR-ANA-01, FR-ANA-02, FR-ANA-03.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AdminAnalyticsPage from './AdminAnalyticsPage.jsx';
import * as ExposApi from '../../api/expos.js';
import * as AnalyticsApi from '../../api/analytics.js';

vi.mock('../../api/expos.js');
vi.mock('../../api/analytics.js');
vi.mock('../../context/SocketContext.jsx', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    isConnected: true,
  }),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const MOCK_EXPOS = [
  { id: 'expo-1', title: 'Tech Expo 2026' },
  { id: 'expo-2', title: 'Green Energy Fair' },
];

const MOCK_KPIS = {
  expoId: 'expo-1',
  totalEvents: 142,
  uniqueVisitors: 45,
  boothViews: 88,
  sessionViews: 32,
  sessionCheckins: 12,
  searches: 10,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('T-8.4, T-8.5: AdminAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ExposApi.fetchAdminExpos.mockResolvedValue({ items: MOCK_EXPOS, meta: {} });
    AnalyticsApi.fetchKpis.mockResolvedValue(MOCK_KPIS);
    AnalyticsApi.fetchEngagementOverTime.mockResolvedValue([
      { date: '2026-11-01', type: 'booth_view', count: 15 },
      { date: '2026-11-02', type: 'booth_view', count: 25 },
    ]);
    AnalyticsApi.fetchBoothTraffic.mockResolvedValue([
      { boothId: 'b-1', label: 'Booth A-10', views: 50 },
      { boothId: 'b-2', label: 'Booth B-05', views: 38 },
    ]);
    AnalyticsApi.fetchSessionPopularity.mockResolvedValue([
      { sessionId: 's-1', title: 'AI Keynote', views: 30, checkins: 12 },
    ]);
  });

  it('renders analytics title, live feed badge, and stat cards', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Analytics & Reports/i })).toBeDefined();
      expect(screen.getByText('Live Feed')).toBeDefined();
      expect(screen.getByText('Total Events')).toBeDefined();
      expect(screen.getByText('142')).toBeDefined();
      expect(screen.getByText('45')).toBeDefined();
    });
  });

  it('allows toggling between Chart view and Table view', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('142')).toBeDefined();
    });

    // Click Table view toggle
    const tableBtn = screen.getByRole('button', { name: /Table/i });
    fireEvent.click(tableBtn);

    await waitFor(() => {
      expect(screen.getByText('Booth Traffic Ranking')).toBeDefined();
      expect(screen.getByText('Booth A-10')).toBeDefined();
      expect(screen.getByText('Session Popularity')).toBeDefined();
      expect(screen.getByText('AI Keynote')).toBeDefined();
    });
  });

  it('triggers CSV download when clicking Export CSV button (T-8.6)', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    AnalyticsApi.buildCsvExportUrl.mockReturnValue('/api/v1/analytics/expos/expo-1/export.csv');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('142')).toBeDefined();
    });

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);

    expect(AnalyticsApi.buildCsvExportUrl).toHaveBeenCalledWith('expo-1');
    expect(windowOpenSpy).toHaveBeenCalledWith('/api/v1/analytics/expos/expo-1/export.csv', '_blank');
  });
});
