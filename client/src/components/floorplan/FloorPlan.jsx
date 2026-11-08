/**
 * @fileoverview Interactive FloorPlan SVG Component.
 * Supports both View Mode (T-3.12) with pan, zoom, legend, status colors,
 * touch pinch, booth detail drawer, and Edit Mode (T-3.13) with interactive
 * drag-and-drop, corner resize handle, integer grid snap, collision highlighting,
 * and keyboard nudging/shortcuts.
 * Architecture §6.3, Design §5.3, §8. FR-ATT-01, FR-EXP-03, FR-EXPO-03, FR-EXPO-04.
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { FloorPlanControls } from './FloorPlanControls.jsx';
import { FloorPlanLegend, STATUS_PALETTE } from './FloorPlanLegend.jsx';
import { BoothDetailsDrawer } from './BoothDetailsDrawer.jsx';
import { findOverlappingBoothIds } from './floorplanUtils.js';

const DEFAULT_GRID_SIZE = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

export function FloorPlan({
  booths = [],
  mode = 'view', // 'view' | 'edit'
  selectedBoothId = null,
  onSelectBooth = null,
  onBoothsChange = null,
  onDeleteBooth = null,
  gridSize = DEFAULT_GRID_SIZE,
  className = '',
  height = 550,
  showLegend = true,
  showControls = true,
  overlappingBoothIds = null,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });

  // Dragging booth state (Edit Mode)
  const draggingBoothRef = useRef(null);
  // Resizing booth state (Edit Mode)
  const resizingBoothRef = useRef(null);

  // Touch pinch-to-zoom tracking
  const touchDistRef = useRef(null);

  // Selected booth for details drawer (View Mode)
  const [activeBooth, setActiveBooth] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Status highlight filter from legend (View Mode)
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // ── Collision / Overlap Detection ───────────────────────────────────────────
  const activeOverlaps = useMemo(() => {
    if (overlappingBoothIds) return overlappingBoothIds;
    return findOverlappingBoothIds(booths);
  }, [booths, overlappingBoothIds]);

  // ── Calculate Canvas Dimensions from Booth Coordinates ──────────────────────
  const { canvasWidth, canvasHeight, gridCols, gridRows } = useMemo(() => {
    let maxX = 20;
    let maxY = 14;

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

  // ── Global Mouse Listeners (Canvas Pan, Booth Drag & Resize) ────────────────
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (resizingBoothRef.current) {
        const { id, startX, startY, startGeom } = resizingBoothRef.current;
        const deltaX = (e.clientX - startX) / zoom;
        const deltaY = (e.clientY - startY) / zoom;
        const newW = Math.max(1, Math.round((startGeom.w * gridSize + deltaX) / gridSize));
        const newH = Math.max(1, Math.round((startGeom.h * gridSize + deltaY) / gridSize));

        if (newW !== startGeom.w || newH !== startGeom.h) {
          onBoothsChange?.(
            booths.map((b) => {
              const bId = b.id || b._id || b.code;
              return bId === id
                ? { ...b, geometry: { ...b.geometry, w: newW, h: newH } }
                : b;
            })
          );
        }
      } else if (draggingBoothRef.current) {
        const { id, startX, startY, startGeom } = draggingBoothRef.current;
        const deltaX = (e.clientX - startX) / zoom;
        const deltaY = (e.clientY - startY) / zoom;
        const newX = Math.max(0, Math.round((startGeom.x * gridSize + deltaX) / gridSize));
        const newY = Math.max(0, Math.round((startGeom.y * gridSize + deltaY) / gridSize));

        if (newX !== startGeom.x || newY !== startGeom.y) {
          onBoothsChange?.(
            booths.map((b) => {
              const bId = b.id || b._id || b.code;
              return bId === id
                ? { ...b, geometry: { ...b.geometry, x: newX, y: newY } }
                : b;
            })
          );
        }
      } else if (isDraggingCanvas) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPan({
          x: dragStartRef.current.initialPanX + dx,
          y: dragStartRef.current.initialPanY + dy,
        });
      }
    };

    const handleGlobalMouseUp = () => {
      draggingBoothRef.current = null;
      resizingBoothRef.current = null;
      setIsDraggingCanvas(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [zoom, gridSize, booths, isDraggingCanvas, onBoothsChange]);

  // ── Canvas Background Drag & Click ──────────────────────────────────────────
  const handleCanvasMouseDown = (e) => {
    // Only canvas background drag with left button
    if (e.button !== 0 && e.button !== 1) return;
    setIsDraggingCanvas(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handleCanvasClick = (e) => {
    // Deselect booth when clicking on canvas background in edit mode
    if (mode === 'edit' && onSelectBooth) {
      onSelectBooth(null);
    }
  };

  // ── Touch Handlers (Pan & Pinch Zoom) ───────────────────────────────────────
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDraggingCanvas(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDraggingCanvas) {
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
    setIsDraggingCanvas(false);
    touchDistRef.current = null;
  };

  // ── Booth Drag & Resize Interaction (Edit Mode) ─────────────────────────────
  const handleBoothMouseDown = (booth, e) => {
    e.stopPropagation();
    const boothId = booth.id || booth._id || booth.code;

    if (mode === 'edit') {
      draggingBoothRef.current = {
        id: boothId,
        startX: e.clientX,
        startY: e.clientY,
        startGeom: { ...(booth.geometry || { x: 0, y: 0, w: 2, h: 2 }) },
      };
    }

    if (onSelectBooth) {
      onSelectBooth(booth);
    }
  };

  const handleResizeHandleMouseDown = (booth, e) => {
    e.stopPropagation();
    const boothId = booth.id || booth._id || booth.code;

    resizingBoothRef.current = {
      id: boothId,
      startX: e.clientX,
      startY: e.clientY,
      startGeom: { ...(booth.geometry || { x: 0, y: 0, w: 2, h: 2 }) },
    };
  };

  // ── Booth Selection & Interaction ───────────────────────────────────────────
  const handleBoothClick = (booth, e) => {
    e.stopPropagation();
    const boothId = booth.id || booth._id || booth.code;

    if (mode === 'view') {
      setActiveBooth(booth);
      setDrawerOpen(true);
      setAnnouncement(`Selected booth ${booth.code}, status ${booth.status}, ${booth.size} size.`);
    }

    if (onSelectBooth) {
      onSelectBooth(booth);
    }
  };

  const handleBoothKeyDown = (booth, e) => {
    const boothId = booth.id || booth._id || booth.code;
    const geom = booth.geometry || { x: 0, y: 0, w: 2, h: 2 };

    if (mode === 'view') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleBoothClick(booth, e);
      }
      return;
    }

    // ── Edit Mode Keyboard Controls ──
    if (mode === 'edit') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          const newW = Math.max(1, geom.w - 1);
          updateSingleBoothGeometry(boothId, { ...geom, w: newW });
        } else {
          const newX = Math.max(0, geom.x - 1);
          updateSingleBoothGeometry(boothId, { ...geom, x: newX });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          updateSingleBoothGeometry(boothId, { ...geom, w: geom.w + 1 });
        } else {
          updateSingleBoothGeometry(boothId, { ...geom, x: geom.x + 1 });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey) {
          const newH = Math.max(1, geom.h - 1);
          updateSingleBoothGeometry(boothId, { ...geom, h: newH });
        } else {
          const newY = Math.max(0, geom.y - 1);
          updateSingleBoothGeometry(boothId, { ...geom, y: newY });
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey) {
          updateSingleBoothGeometry(boothId, { ...geom, h: geom.h + 1 });
        } else {
          updateSingleBoothGeometry(boothId, { ...geom, y: geom.y + 1 });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (onDeleteBooth) {
          onDeleteBooth(boothId);
        } else if (onBoothsChange) {
          onBoothsChange(booths.filter((b) => (b.id || b._id || b.code) !== boothId));
          onSelectBooth?.(null);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSelectBooth?.(null);
      }
    }
  };

  const updateSingleBoothGeometry = (boothId, newGeom) => {
    if (!onBoothsChange) return;
    onBoothsChange(
      booths.map((b) => {
        const id = b.id || b._id || b.code;
        return id === boothId ? { ...b, geometry: newGeom } : b;
      })
    );
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
        className={`floor-plan-wrapper border ${mode === 'edit' ? 'mode-edit' : ''}`}
        style={{
          height: `${height}px`,
          cursor: isDraggingCanvas ? 'grabbing' : 'grab',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
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
          style={{ width: '100%', height: '100%', display: 'block' }}
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
              const bId = booth.id || booth._id || booth.code;
              const geom = booth.geometry || { x: 0, y: 0, w: 2, h: 2 };
              const bx = geom.x * gridSize;
              const by = geom.y * gridSize;
              const bw = geom.w * gridSize;
              const bh = geom.h * gridSize;

              const status = booth.status || 'available';
              const meta = STATUS_PALETTE[status] || STATUS_PALETTE.available;

              const isSelected =
                selectedBoothId === bId ||
                (typeof selectedBoothId === 'object' && selectedBoothId?.id === bId);
              const isFiltered = activeStatusFilter && activeStatusFilter !== status;
              const isOverlapping = activeOverlaps.has(bId);

              const isBlocked = status === 'blocked';
              const fillPattern = isBlocked ? 'url(#blocked-hatch)' : meta.fill;

              const accessibleLabel = `Booth ${booth.code}, ${booth.size || 'medium'} size, status: ${status}${
                booth.label ? `, ${booth.label}` : ''
              }${isOverlapping ? ', overlapping' : ''}`;

              return (
                <g
                  key={bId}
                  transform={`translate(${bx}, ${by})`}
                  className={`booth-group ${isSelected ? 'is-selected' : ''} ${
                    isFiltered ? 'is-dimmed' : ''
                  } ${isOverlapping ? 'is-overlapping' : ''}`}
                  onClick={(e) => handleBoothClick(booth, e)}
                  onMouseDown={(e) => handleBoothMouseDown(booth, e)}
                  onKeyDown={(e) => handleBoothKeyDown(booth, e)}
                  tabIndex={0}
                  role="button"
                  aria-label={accessibleLabel}
                  aria-pressed={isSelected}
                  style={{ cursor: mode === 'edit' ? 'move' : 'pointer' }}
                >
                  {/* Booth Rectangle Background */}
                  <rect
                    width={bw}
                    height={bh}
                    rx="6"
                    ry="6"
                    fill={fillPattern}
                    stroke={
                      isOverlapping
                        ? '#dc2626'
                        : isSelected
                        ? '#312e81'
                        : meta.stroke
                    }
                    strokeWidth={isSelected || isOverlapping ? 3.5 : 2}
                    strokeDasharray={isOverlapping ? '5,3' : 'none'}
                    className="booth-shape"
                  />

                  {/* Monospace Code Label */}
                  <text
                    x={bw / 2}
                    y={bh > 50 ? bh / 2 - 4 : bh / 2 + 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isOverlapping ? '#dc2626' : isSelected ? '#312e81' : meta.textColor}
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
                      fill={isOverlapping ? '#dc2626' : meta.textColor}
                      opacity={0.8}
                      fontSize="10"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {booth.label || `${geom.w}×${geom.h}m`}
                    </text>
                  )}

                  {/* Overlap Warning Badge in Edit Mode */}
                  {isOverlapping && (
                    <g transform={`translate(${bw - 18}, 4)`}>
                      <circle cx="7" cy="7" r="7" fill="#dc2626" />
                      <text
                        x="7"
                        y="10"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        !
                      </text>
                    </g>
                  )}

                  {/* ── Edit Mode: Corner Resize Handle on Selected Booth ── */}
                  {mode === 'edit' && isSelected && (
                    <g
                      transform={`translate(${bw - 8}, ${bh - 8})`}
                      className="booth-resize-handle"
                      onMouseDown={(e) => handleResizeHandleMouseDown(booth, e)}
                      style={{ cursor: 'nwse-resize' }}
                      aria-label="Resize booth handle"
                    >
                      <rect
                        x="-4"
                        y="-4"
                        width="12"
                        height="12"
                        rx="2"
                        fill="#ffffff"
                        stroke="#312e81"
                        strokeWidth="2.5"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Booth Details Drawer (View Mode) ── */}
      {mode === 'view' && (
        <BoothDetailsDrawer
          show={drawerOpen}
          onHide={() => setDrawerOpen(false)}
          booth={activeBooth}
        />
      )}
    </div>
  );
}
