/**
 * @fileoverview Interactive FloorPlan SVG Component.
 * Supports View Mode (T-3.12) with pan, zoom, legend, status colors,
 * keyboard accessibility, touch navigation, and booth detail drawer.
 * Architecture §6.3, Design §5.3, §8. FR-ATT-01, FR-EXP-03.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { FloorPlanControls } from './FloorPlanControls.jsx';
import { FloorPlanLegend, STATUS_PALETTE } from './FloorPlanLegend.jsx';
import { BoothDetailsDrawer } from './BoothDetailsDrawer.jsx';

const DEFAULT_GRID_SIZE = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

export function FloorPlan({
  booths = [],
  mode = 'view',
  selectedBoothId = null,
  onSelectBooth = null,
  gridSize = DEFAULT_GRID_SIZE,
  className = '',
  height = 550,
  showLegend = true,
  showControls = true,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  // Touch pinch-to-zoom tracking
  const touchDistRef = useRef(null);

  // Selected booth for details drawer
  const [activeBooth, setActiveBooth] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Status highlight filter from legend
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // ── Calculate Canvas Dimensions from Booth Coordinates ──────────────────────
  const { canvasWidth, canvasHeight, gridCols, gridRows } = useMemo(() => {
    let maxX = 18;
    let maxY = 12;

    booths.forEach((b) => {
      const geom = b.geometry || { x: 0, y: 0, w: 2, h: 2 };
      if (geom.x + geom.w > maxX) maxX = geom.x + geom.w;
      if (geom.y + geom.h > maxY) maxY = geom.y + geom.h;
    });

    const cols = maxX + 2;
    const rows = maxY + 2;

    return {
      gridCols: cols,
      gridRows: rows,
      canvasWidth: cols * gridSize,
      canvasHeight: rows * gridSize,
    };
  }, [booths, gridSize]);

  // ── Status Counts for Legend ────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    return booths.reduce(
      (acc, b) => {
        const s = b.status || 'available';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { available: 0, reserved: 0, allocated: 0, blocked: 0 }
    );
  }, [booths]);

  // ── Zoom Handlers ───────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + 0.2).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - 0.2).toFixed(2))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scaleX = (clientWidth - 40) / canvasWidth;
    const scaleY = (clientHeight - 40) / canvasHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.2);
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat(fitScale.toFixed(2))));

    setZoom(clampedScale);
    setPan({
      x: (clientWidth - canvasWidth * clampedScale) / 2,
      y: (clientHeight - canvasHeight * clampedScale) / 2,
    });
  }, [canvasWidth, canvasHeight]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prevZoom) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((prevZoom + zoomDelta).toFixed(2))));
      return next;
    });
  };

  // ── Drag & Pan Handlers ─────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    // Only drag with left click or middle click
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Touch Handlers (Pan & Pinch Zoom) ───────────────────────────────────────
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    } else if (e.touches.length === 2) {
      // 2-finger pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.initialPanX + dx,
        y: dragStartRef.current.initialPanY + dy,
      });
    } else if (e.touches.length === 2 && touchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / touchDistRef.current;
      touchDistRef.current = newDist;

      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((z * ratio).toFixed(2)))));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistRef.current = null;
  };

  // ── Booth Selection & Interaction ───────────────────────────────────────────
  const handleBoothClick = (booth, e) => {
    e.stopPropagation();
    setActiveBooth(booth);
    setDrawerOpen(true);
    setAnnouncement(`Selected booth ${booth.code}, status ${booth.status}, ${booth.size} size.`);

    if (onSelectBooth) {
      onSelectBooth(booth);
    }
  };

  const handleBoothKeyDown = (booth, e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBoothClick(booth, e);
    }
  };

  return (
    <div className={`d-flex flex-column gap-3 ${className}`}>
      {/* ── Toolbar: Legend + Controls ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        {showLegend && (
          <FloorPlanLegend
            counts={statusCounts}
            totalBooths={booths.length}
            activeFilter={activeStatusFilter}
            onToggleFilter={setActiveStatusFilter}
          />
        )}
        {showControls && (
          <FloorPlanControls
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onFitView={handleFitView}
            className="ms-md-auto"
          />
        )}
      </div>

      {/* Screen reader live update */}
      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>

      {/* ── SVG Canvas Viewport ── */}
      <div
        ref={containerRef}
        className="floor-plan-wrapper border"
        style={{ height: `${height}px`, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={-1}
        role="region"
        aria-label="Interactive Expo Floor Plan Canvas"
      >
        <svg
          ref={svgRef}
          className="floor-plan-svg"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Fine Grid Pattern */}
            <pattern
              id="floorplan-grid"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </pattern>

            {/* Blocked Booth Diagonal Hatch Pattern (Design §5.3) */}
            <pattern
              id="blocked-hatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Root Transform Group for Pan & Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Background Canvas Grid */}
            <rect
              x="0"
              y="0"
              width={canvasWidth}
              height={canvasHeight}
              fill="url(#floorplan-grid)"
            />

            {/* Perimeter Wall Outline */}
            <rect
              x="0"
              y="0"
              width={canvasWidth}
              height={canvasHeight}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
            />

            {/* ── Render Booths ── */}
            {booths.map((booth) => {
              const geom = booth.geometry || { x: 0, y: 0, w: 2, h: 2 };
              const bx = geom.x * gridSize;
              const by = geom.y * gridSize;
              const bw = geom.w * gridSize;
              const bh = geom.h * gridSize;

              const status = booth.status || 'available';
              const meta = STATUS_PALETTE[status] || STATUS_PALETTE.available;

              const isSelected = selectedBoothId === (booth.id || booth._id);
              const isFiltered = activeStatusFilter && activeStatusFilter !== status;

              const isBlocked = status === 'blocked';
              const fillPattern = isBlocked ? 'url(#blocked-hatch)' : meta.fill;

              const accessibleLabel = `Booth ${booth.code}, ${booth.size || 'medium'} size, status: ${status}${
                booth.label ? `, ${booth.label}` : ''
              }`;

              return (
                <g
                  key={booth.id || booth._id}
                  transform={`translate(${bx}, ${by})`}
                  className={`booth-group ${isSelected ? 'is-selected' : ''} ${
                    isFiltered ? 'is-dimmed' : ''
                  }`}
                  onClick={(e) => handleBoothClick(booth, e)}
                  onKeyDown={(e) => handleBoothKeyDown(booth, e)}
                  tabIndex={0}
                  role="button"
                  aria-label={accessibleLabel}
                  aria-pressed={isSelected}
                >
                  {/* Booth Rectangle Background */}
                  <rect
                    width={bw}
                    height={bh}
                    rx="6"
                    ry="6"
                    fill={fillPattern}
                    stroke={isSelected ? '#312e81' : meta.stroke}
                    strokeWidth={isSelected ? 3.5 : 2}
                    className="booth-shape"
                  />

                  {/* Monospace Code Label */}
                  <text
                    x={bw / 2}
                    y={bh > 50 ? bh / 2 - 4 : bh / 2 + 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#312e81' : meta.textColor}
                    fontFamily="monospace"
                    fontWeight="700"
                    fontSize={bw > 60 ? '14' : '11'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {booth.code}
                  </text>

                  {/* Subtitle / Dimensions / Company Label */}
                  {bh > 50 && (
                    <text
                      x={bw / 2}
                      y={bh / 2 + 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={meta.textColor}
                      opacity={0.8}
                      fontSize="10"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {booth.label || `${geom.w}×${geom.h}m`}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Booth Details Drawer (View Mode) ── */}
      <BoothDetailsDrawer
        show={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        booth={activeBooth}
      />
    </div>
  );
}
