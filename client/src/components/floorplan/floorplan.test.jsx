/**
 * @fileoverview Unit and accessibility tests for FloorPlan SVG component (T-3.12).
 * Covers view mode, pan/zoom controls, legend, status colors, and a11y.
 * Design §5.3, §8, Rule 6.5.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorPlan } from './FloorPlan.jsx';
import { FloorPlanControls } from './FloorPlanControls.jsx';
import { FloorPlanLegend } from './FloorPlanLegend.jsx';
import { BoothDetailsDrawer } from './BoothDetailsDrawer.jsx';

const mockBooths = [
  {
    id: 'b-1',
    code: 'A-101',
    label: 'AI Zone',
    size: 'large',
    status: 'available',
    pricePerDay: 800,
    geometry: { x: 1, y: 1, w: 3, h: 2 },
    details: {
      showcase: 'Cutting-edge machine learning demonstrations.',
      products: ['Vision AI', 'Voice LLM'],
      staff: [{ name: 'Dr. Sarah Connor', title: 'Lead AI Engineer', email: 'sarah@ai.com' }],
    },
  },
  {
    id: 'b-2',
    code: 'A-102',
    size: 'medium',
    status: 'reserved',
    pricePerDay: 500,
    geometry: { x: 5, y: 1, w: 2, h: 2 },
  },
  {
    id: 'b-3',
    code: 'B-201',
    size: 'small',
    status: 'allocated',
    pricePerDay: 350,
    geometry: { x: 1, y: 4, w: 2, h: 2 },
  },
  {
    id: 'b-4',
    code: 'X-999',
    size: 'small',
    status: 'blocked',
    pricePerDay: 0,
    geometry: { x: 4, y: 4, w: 2, h: 2 },
  },
];

describe('T-3.12: FloorPlan SVG Component (View Mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('FloorPlan SVG Rendering', () => {
    it('renders the SVG canvas and all booth codes', () => {
      render(<FloorPlan booths={mockBooths} mode="view" />);

      expect(screen.getByRole('region', { name: /floor plan canvas/i })).toBeInTheDocument();
      expect(screen.getByText('A-101')).toBeInTheDocument();
      expect(screen.getByText('A-102')).toBeInTheDocument();
      expect(screen.getByText('B-201')).toBeInTheDocument();
      expect(screen.getByText('X-999')).toBeInTheDocument();
    });

    it('sets proper accessible labels on each booth element', () => {
      render(<FloorPlan booths={mockBooths} mode="view" />);

      const booth1 = screen.getByRole('button', {
        name: /booth A-101, large size, status: available/i,
      });
      const booth2 = screen.getByRole('button', {
        name: /booth A-102, medium size, status: reserved/i,
      });
      const booth3 = screen.getByRole('button', {
        name: /booth B-201, small size, status: allocated/i,
      });
      const booth4 = screen.getByRole('button', {
        name: /booth X-999, small size, status: blocked/i,
      });

      expect(booth1).toBeInTheDocument();
      expect(booth2).toBeInTheDocument();
      expect(booth3).toBeInTheDocument();
      expect(booth4).toBeInTheDocument();
    });

    it('opens booth details drawer when a booth is clicked', () => {
      render(<FloorPlan booths={mockBooths} mode="view" />);

      const booth1 = screen.getByRole('button', {
        name: /booth A-101, large size, status: available/i,
      });
      fireEvent.click(booth1);

      // Drawer opens with title and details
      expect(screen.getByText('Booth A-101')).toBeInTheDocument();
      expect(screen.getByText(/3 × 2 m/i)).toBeInTheDocument();
      expect(screen.getByText('$800')).toBeInTheDocument();
      expect(
        screen.getByText('Cutting-edge machine learning demonstrations.')
      ).toBeInTheDocument();
      expect(screen.getByText('Vision AI')).toBeInTheDocument();
      expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument();
    });

    it('supports keyboard navigation via Enter key on focused booth', () => {
      render(<FloorPlan booths={mockBooths} mode="view" />);

      const booth2 = screen.getByRole('button', {
        name: /booth A-102, medium size, status: reserved/i,
      });

      // Press Enter
      fireEvent.keyDown(booth2, { key: 'Enter', code: 'Enter' });

      expect(screen.getByText('Booth A-102')).toBeInTheDocument();
      expect(screen.getByText(/2 × 2 m/i)).toBeInTheDocument();
    });
  });

  describe('FloorPlanControls', () => {
    it('triggers zoom in, zoom out, and reset callbacks', () => {
      const onZoomIn = vi.fn();
      const onZoomOut = vi.fn();
      const onResetView = vi.fn();
      const onFitView = vi.fn();

      render(
        <FloorPlanControls
          zoom={1.2}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetView={onResetView}
          onFitView={onFitView}
        />
      );

      expect(screen.getByText('120%')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(onZoomIn).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
      expect(onZoomOut).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /reset view/i }));
      expect(onResetView).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /fit floor plan/i }));
      expect(onFitView).toHaveBeenCalledTimes(1);
    });
  });

  describe('FloorPlanLegend', () => {
    it('displays counts for all statuses and triggers filter callback on click', () => {
      const onToggleFilter = vi.fn();
      const counts = { available: 5, reserved: 2, allocated: 3, blocked: 1 };

      render(
        <FloorPlanLegend
          counts={counts}
          totalBooths={11}
          activeFilter={null}
          onToggleFilter={onToggleFilter}
        />
      );

      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Allocated')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();

      // Click Available filter chip
      fireEvent.click(screen.getByRole('button', { name: /available: 5 booths/i }));
      expect(onToggleFilter).toHaveBeenCalledWith('available');
    });
  });

  describe('BoothDetailsDrawer', () => {
    it('renders specifications, status explanation, and action button if provided', () => {
      const onAction = vi.fn();

      render(
        <BoothDetailsDrawer
          show={true}
          onHide={vi.fn()}
          booth={mockBooths[0]}
          actionLabel="Reserve This Booth"
          onAction={onAction}
        />
      );

      expect(screen.getByText('Booth A-101')).toBeInTheDocument();
      expect(screen.getByText(/3 × 2 m/i)).toBeInTheDocument();
      expect(screen.getByText('6 m²')).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: 'Reserve This Booth' });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledWith(mockBooths[0]);
    });
  });
});
