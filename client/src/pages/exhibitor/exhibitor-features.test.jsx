/**
 * @fileoverview Unit and integration tests for Exhibitor Phase 4 Frontend features.
 * T-4.7 (Profile & Completeness Meter), T-4.8 (Application Wizard),
 * T-4.9 (Applications List & Withdraw), T-4.10 (Booth Management & Neighbours).
 * FR-EXP-01, FR-EXP-02, FR-EXP-05, FR-EXP-07, FR-EXP-08.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExhibitorProfilePage, { calculateCompleteness } from './ExhibitorProfilePage.jsx';
import ApplicationWizardPage from './ApplicationWizardPage.jsx';
import ExhibitorApplicationsPage from './ExhibitorApplicationsPage.jsx';
import ExhibitorBoothsPage from './ExhibitorBoothsPage.jsx';
import * as ExhibitorsApi from '../../api/exhibitors.js';
import * as ApplicationsApi from '../../api/applications.js';
import * as ExposApi from '../../api/expos.js';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';

function renderWithClient(ui, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('T-4.7: Exhibitor Profile & Completeness Meter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculateCompleteness accurately computes completion score', () => {
    expect(calculateCompleteness({})).toBe(0);

    // Partial
    expect(
      calculateCompleteness({
        companyName: 'Acme Corp',
        category: 'technology',
      })
    ).toBe(30);

    // Full 100%
    expect(
      calculateCompleteness({
        companyName: 'Acme Corp',
        category: 'technology',
        description: 'Pioneers in AI hardware',
        website: 'https://acme.test',
        logo: 'https://acme.test/logo.png',
        products: ['Product 1'],
        contacts: [{ name: 'Alice' }],
        staff: [{ name: 'Bob' }],
      })
    ).toBe(100);
  });

  it('renders company profile form with prefilled data', async () => {
    vi.spyOn(ExhibitorsApi, 'fetchMyExhibitorProfile').mockResolvedValue({
      companyName: 'NovaTech Industries',
      category: 'technology',
      description: 'Next-gen enterprise software solutions.',
      website: 'https://novatech.test',
      logo: 'https://novatech.test/logo.png',
      products: ['NovaCloud', 'NovaEdge'],
      contacts: [{ name: 'Sarah Connor', email: 'sarah@novatech.test', role: 'VP Sales' }],
      staff: [{ name: 'John Doe', title: 'Solutions Architect' }],
      documents: [],
      socialLinks: { linkedin: 'https://linkedin.com/company/novatech' },
    });

    renderWithClient(<ExhibitorProfilePage />);

    expect(await screen.findByDisplayValue('NovaTech Industries')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Next-gen enterprise software solutions.')).toBeInTheDocument();
    expect(screen.getByText('NovaCloud')).toBeInTheDocument();
    expect(screen.getByText('NovaEdge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Profile Completeness/i)).toBeInTheDocument();
  });

  it('submits updated profile changes via updateMyExhibitorProfile', async () => {
    vi.spyOn(ExhibitorsApi, 'fetchMyExhibitorProfile').mockResolvedValue({
      companyName: 'NovaTech',
      category: 'technology',
      products: [],
      contacts: [],
      staff: [],
      documents: [],
      socialLinks: {},
    });

    const updateSpy = vi
      .spyOn(ExhibitorsApi, 'updateMyExhibitorProfile')
      .mockResolvedValue({ companyName: 'NovaTech Advanced' });

    renderWithClient(<ExhibitorProfilePage />);

    const nameInput = await screen.findByDisplayValue('NovaTech');
    fireEvent.change(nameInput, { target: { value: 'NovaTech Advanced' } });

    const saveButton = screen.getByRole('button', { name: /save profile changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: 'NovaTech Advanced' })
      );
    });
  });
});

describe('T-4.8: Application Wizard (5 Steps)', () => {
  const mockExpo = {
    id: 'expo-wizard-1',
    title: 'Global Tech Summit 2026',
    slug: 'global-tech-summit-2026',
    status: 'published',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ExposApi, 'fetchExpoById').mockResolvedValue(mockExpo);
    vi.spyOn(ExposApi, 'fetchExpoBooths').mockResolvedValue([
      { id: 'b1', code: 'A-01', size: 'medium', status: 'available', geometry: { x: 0, y: 0, w: 20, h: 20 } },
    ]);
    vi.spyOn(ExhibitorsApi, 'fetchMyExhibitorProfile').mockResolvedValue({
      companyName: 'RoboWorks Inc',
      category: 'technology',
      website: 'https://roboworks.test',
      description: 'Robotics solutions.',
      products: ['RoboArm X1'],
    });
  });

  it('progresses through all 5 wizard steps and submits application', async () => {
    const submitSpy = vi
      .spyOn(ApplicationsApi, 'submitExpoApplication')
      .mockResolvedValue({ id: 'app-new-1', status: 'pending' });

    renderWithClient(
      <Routes>
        <Route path="/expos/:idOrSlug/apply" element={<ApplicationWizardPage />} />
      </Routes>,
      ['/expos/expo-wizard-1/apply']
    );

    // Step 1: Company Overview (pre-filled)
    expect(await screen.findByDisplayValue('RoboWorks Inc')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Products & Services
    expect(await screen.findByText('Step 2: Products & Services to Showcase')).toBeInTheDocument();
    expect(screen.getByText('RoboArm X1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Booth Preferences
    expect(await screen.findByText('Step 3: Booth Preferences')).toBeInTheDocument();
    expect(screen.getByText('Small Booth (3×3m)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: Documents
    expect(await screen.findByText('Step 4: Supporting Documents')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 5: Review & Submit
    expect(await screen.findByText('Step 5: Review & Submit Application')).toBeInTheDocument();
    expect(screen.getByText('RoboWorks Inc')).toBeInTheDocument();

    // Check agreement and submit
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    const submitBtn = screen.getByRole('button', { name: /submit application/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        'expo-wizard-1',
        expect.objectContaining({
          boothPreferences: expect.any(Array),
        })
      );
    });

    expect(await screen.findByText(/application submitted!/i)).toBeInTheDocument();
  });
});

describe('T-4.9: Exhibitor Applications Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders applications list and handles pending application withdrawal', async () => {
    vi.spyOn(ApplicationsApi, 'fetchMyApplications').mockResolvedValue({
      items: [
        {
          id: 'app-pending-1',
          status: 'pending',
          createdAt: '2026-11-01T00:00:00.000Z',
          expo: { id: 'expo-1', title: 'Future AI Expo', startDate: '2027-01-10T00:00:00.000Z', endDate: '2027-01-12T00:00:00.000Z' },
        },
        {
          id: 'app-approved-1',
          status: 'approved',
          createdAt: '2026-10-15T00:00:00.000Z',
          assignedBooth: { id: 'booth-1' },
          expo: { id: 'expo-2', title: 'Cloud Summit', startDate: '2027-02-01T00:00:00.000Z', endDate: '2027-02-03T00:00:00.000Z' },
        },
      ],
      meta: { total: 2 },
    });

    const withdrawSpy = vi
      .spyOn(ApplicationsApi, 'withdrawApplication')
      .mockResolvedValue({ id: 'app-pending-1', status: 'withdrawn' });

    renderWithClient(<ExhibitorApplicationsPage />);

    expect(await screen.findByText('Future AI Expo')).toBeInTheDocument();
    expect(screen.getByText('Cloud Summit')).toBeInTheDocument();

    // Withdraw the pending application
    const withdrawBtn = screen.getByRole('button', { name: /^withdraw$/i });
    fireEvent.click(withdrawBtn);

    // Confirm dialog appears
    expect(screen.getByText(/withdraw application\?/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Withdraw Application' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(withdrawSpy).toHaveBeenCalledWith('app-pending-1');
    });
  });
});

describe('T-4.10: Booth Management & Neighbours', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders held booth details, updates showcase, and shows neighbouring exhibitors', async () => {
    vi.spyOn(ApplicationsApi, 'fetchMyApplications').mockResolvedValue({
      items: [
        {
          id: 'app-approved-1',
          status: 'approved',
          assignedBooth: { id: 'booth-target-1' },
          expo: { id: 'expo-1', title: 'CleanTech World', slug: 'cleantech-world' },
        },
      ],
    });

    vi.spyOn(ExposApi, 'fetchExpoBooths').mockResolvedValue([
      {
        id: 'booth-target-1',
        code: 'B-10',
        size: 'medium',
        status: 'allocated',
        geometry: { w: 6, h: 3 },
        details: { showcase: 'Our Solar Solutions', products: ['SolarPanel 3000'], staff: [] },
      },
      {
        id: 'booth-neighbour-1',
        code: 'B-11',
        size: 'small',
        status: 'allocated',
        details: { showcase: 'EcoBatteries' },
      },
    ]);

    const updateSpy = vi
      .spyOn(ExhibitorsApi, 'updateBoothDetails')
      .mockResolvedValue({
        details: { showcase: 'Updated CleanTech Showcase', products: ['SolarPanel 3000'], staff: [] },
      });

    renderWithClient(<ExhibitorBoothsPage />);

    expect(await screen.findByText(/Booth B-10/i)).toBeInTheDocument();
    expect(screen.getAllByText('CleanTech World')[0]).toBeInTheDocument();
    expect(screen.getByDisplayValue('Our Solar Solutions')).toBeInTheDocument();

    // Check neighbour is listed (FR-EXP-07)
    expect(screen.getByText(/Booth B-11/i)).toBeInTheDocument();
    expect(screen.getByText('"EcoBatteries"')).toBeInTheDocument();

    // Edit showcase
    const showcaseInput = screen.getByDisplayValue('Our Solar Solutions');
    fireEvent.change(showcaseInput, { target: { value: 'Updated CleanTech Showcase' } });

    const saveBtn = screen.getByRole('button', { name: /save booth presentation/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'booth-target-1',
        expect.objectContaining({ showcase: 'Updated CleanTech Showcase' })
      );
    });
  });
});
