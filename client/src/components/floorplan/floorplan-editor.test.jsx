/**
 * @fileoverview Vitest tests for FloorPlan Edit Mode, Side Panel, Geometry Utils, and Editor Page.
 * T-3.13. FR-EXPO-03, FR-EXPO-04.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  checkRectsOverlap,
  checkBoothsOverlap,
  findOverlappingBoothIds,
  generateNextBoothCode,
  findAvailablePosition,
  findDuplicateCodes,
} from './floorplanUtils.js';
import { FloorPlan } from './FloorPlan.jsx';
import { FloorPlanSidePanel } from './FloorPlanSidePanel.jsx';
import AdminFloorPlanEditorPage from '../../pages/admin/AdminFloorPlanEditorPage.jsx';
import { ToastProvider } from '../../components/ui/index.js';
import * as exposApi from '../../api/expos.js';

vi.mock('../../api/expos.js');

const mockExpo = {
  id: '660000000000000000000001',
  title: 'Tech Expo 2026',
  slug: 'tech-expo-2026',
  status: 'draft',
  maxBooths: 10,
};

const mockBooths = [
  {
    id: 'booth-1',
    code: 'B-01',
    label: 'Corner Stand A',
    size: 'small',
    pricePerDay: 150,
    status: 'available',
    geometry: { x: 1, y: 1, w: 2, h: 2 },
  },
  {
    id: 'booth-2',
    code: 'B-02',
    label: 'Standard Stand B',
    size: 'medium',
    pricePerDay: 250,
    status: 'available',
    geometry: { x: 4, y: 1, w: 3, h: 2 },
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

describe('T-3.13: FloorPlan Utilities & Geometry', () => {
  it('correctly identifies overlapping vs non-overlapping rectangles', () => {
    const rectA = { x: 0, y: 0, w: 2, h: 2 };
    const rectB = { x: 1, y: 1, w: 2, h: 2 }; // Overlaps A
    const rectC = { x: 2, y: 0, w: 2, h: 2 }; // Adjacent to A (sharing boundary, does NOT overlap)
    const rectD = { x: 5, y: 5, w: 2, h: 2 }; // Far away

    expect(checkRectsOverlap(rectA, rectB)).toBe(true);
    expect(checkRectsOverlap(rectA, rectC)).toBe(false);
    expect(checkRectsOverlap(rectA, rectD)).toBe(false);
  });

  it('detects overlapping booth IDs from a list', () => {
    const booths = [
      { id: '1', code: 'B-01', geometry: { x: 1, y: 1, w: 2, h: 2 } },
      { id: '2', code: 'B-02', geometry: { x: 2, y: 2, w: 2, h: 2 } }, // Overlaps with 1
      { id: '3', code: 'B-03', geometry: { x: 6, y: 6, w: 2, h: 2 } }, // Independent
    ];

    const overlaps = findOverlappingBoothIds(booths);
    expect(overlaps.has('1')).toBe(true);
    expect(overlaps.has('2')).toBe(true);
    expect(overlaps.has('3')).toBe(false);
  });

  it('generates the next sequential booth code without duplicates', () => {
    const booths = [{ code: 'B-01' }, { code: 'B-02' }, { code: 'B-05' }];
    expect(generateNextBoothCode(booths, 'B-')).toBe('B-06');
  });

  it('detects duplicate booth codes ignoring case', () => {
    const booths = [{ code: 'A-01' }, { code: 'a-01' }, { code: 'B-02' }];
    const dupes = findDuplicateCodes(booths);
    expect(dupes.has('A-01')).toBe(true);
    expect(dupes.has('B-02')).toBe(false);
  });

  it('finds an available non-overlapping position on the grid', () => {
    const booths = [{ geometry: { x: 1, y: 1, w: 2, h: 2 } }];
    const pos = findAvailablePosition(booths, 2, 2, 10, 10);
    expect(pos).toBeDefined();
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
    // Pos must not overlap with (1,1,2,2)
    expect(checkRectsOverlap({ ...pos, w: 2, h: 2 }, booths[0].geometry)).toBe(false);
  });
});

describe('T-3.13: FloorPlan Component in Edit Mode', () => {
  it('renders booths with selection and resize handles in edit mode', () => {
    const onSelect = vi.fn();
    render(
      <FloorPlan
        booths={mockBooths}
        mode="edit"
        selectedBoothId="booth-1"
        onSelectBooth={onSelect}
      />
    );

    expect(screen.getByText('B-01')).toBeInTheDocument();
    expect(screen.getByText('B-02')).toBeInTheDocument();

    // Check resize handle is present on the selected booth
    const resizeHandle = screen.getByLabelText('Resize booth handle');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('highlights overlapping booths with is-overlapping style and warning badge', () => {
    const collidingBooths = [
      { id: 'b1', code: 'B-01', geometry: { x: 1, y: 1, w: 3, h: 3 } },
      { id: 'b2', code: 'B-02', geometry: { x: 2, y: 2, w: 3, h: 3 } },
    ];

    render(<FloorPlan booths={collidingBooths} mode="edit" />);

    const booth1 = screen.getByRole('button', { name: /Booth B-01/i });
    const booth2 = screen.getByRole('button', { name: /Booth B-02/i });

    expect(booth1.classList.contains('is-overlapping')).toBe(true);
    expect(booth2.classList.contains('is-overlapping')).toBe(true);
  });

  it('supports keyboard nudging and deletion in edit mode', () => {
    const onBoothsChange = vi.fn();
    const onDeleteBooth = vi.fn();

    render(
      <FloorPlan
        booths={mockBooths}
        mode="edit"
        selectedBoothId="booth-1"
        onBoothsChange={onBoothsChange}
        onDeleteBooth={onDeleteBooth}
      />
    );

    const booth1 = screen.getByRole('button', { name: /Booth B-01/i });

    // Press ArrowRight to move right by 1
    fireEvent.keyDown(booth1, { key: 'ArrowRight' });
    expect(onBoothsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'booth-1',
          geometry: { x: 2, y: 1, w: 2, h: 2 },
        }),
      ])
    );

    // Press Delete to remove booth
    fireEvent.keyDown(booth1, { key: 'Delete' });
    expect(onDeleteBooth).toHaveBeenCalledWith('booth-1');
  });
});

describe('T-3.13: FloorPlanSidePanel Component', () => {
  it('renders empty prompt when no booth is selected', () => {
    const onAdd = vi.fn();
    render(<FloorPlanSidePanel selectedBooth={null} onAddBooth={onAdd} totalBooths={2} maxBooths={10} />);

    expect(screen.getByText('No Booth Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add New Booth/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add New Booth/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders editable fields for the selected booth and triggers updates', async () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    render(
      <FloorPlanSidePanel
        selectedBooth={mockBooths[0]}
        onUpdateBooth={onUpdate}
        onDeleteBooth={onDelete}
        totalBooths={2}
        maxBooths={10}
      />
    );

    expect(screen.getByDisplayValue('B-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Corner Stand A')).toBeInTheDocument();

    // Change label
    const labelInput = screen.getByLabelText(/Label \/ Title/i);
    fireEvent.change(labelInput, { target: { value: 'Updated Stand Label' } });
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Updated Stand Label' })
    );

    // Click Delete
    const deleteBtn = screen.getByRole('button', { name: /Delete Booth/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('booth-1');
  });
});

describe('T-3.13: AdminFloorPlanEditorPage Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads expo and booth details, adds a booth, and saves atomically', async () => {
    exposApi.fetchExpoById.mockResolvedValue(mockExpo);
    exposApi.fetchExpoBooths.mockResolvedValue(mockBooths);
    exposApi.saveFloorPlanBooths.mockResolvedValue({ created: 3, booths: [] });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin/expos/660000000000000000000001/floor-plan']}>
            <Routes>
              <Route path="/admin/expos/:id/floor-plan" element={<AdminFloorPlanEditorPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Tech Expo 2026')).toBeInTheDocument();
      expect(screen.getByText('B-01')).toBeInTheDocument();
      expect(screen.getByText('B-02')).toBeInTheDocument();
    });

    // Add a new booth
    const addBoothBtn = screen.getAllByRole('button', { name: /Add Booth/i })[0];
    fireEvent.click(addBoothBtn);

    // Now B-03 should appear
    await waitFor(() => {
      expect(screen.getByText('B-03')).toBeInTheDocument();
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    // Save Floor Plan
    const saveBtn = screen.getByRole('button', { name: /Save Floor Plan/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(exposApi.saveFloorPlanBooths).toHaveBeenCalledWith(
        '660000000000000000000001',
        expect.arrayContaining([
          expect.objectContaining({ code: 'B-01' }),
          expect.objectContaining({ code: 'B-02' }),
          expect.objectContaining({ code: 'B-03' }),
        ])
      );
    });
  });

  it('shows read-only alert and disables saving when expo is published', async () => {
    const publishedExpo = { ...mockExpo, status: 'published' };
    exposApi.fetchExpoById.mockResolvedValue(publishedExpo);
    exposApi.fetchExpoBooths.mockResolvedValue(mockBooths);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin/expos/660000000000000000000001/floor-plan']}>
            <Routes>
              <Route path="/admin/expos/:id/floor-plan" element={<AdminFloorPlanEditorPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Read-Only Mode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Floor Plan/i })).toBeDisabled();
    });
  });
});
