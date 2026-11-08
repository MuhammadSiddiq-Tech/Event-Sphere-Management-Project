/**
 * @fileoverview Floor plan zoom and view controls.
 * Provides zoom-in, zoom-out, reset view, and fit-to-view buttons with accessible labels.
 * T-3.12. Design §8.
 */

import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

export function FloorPlanControls({
  zoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitView,
  className = '',
}) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      <ButtonGroup size="sm" className="bg-white shadow-sm rounded border">
        <Button
          variant="light"
          onClick={onZoomOut}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
          title="Zoom out"
          className="border-0 px-2"
        >
          <i className="bi bi-dash-lg" />
        </Button>

        <span
          className="d-inline-flex align-items-center px-2 small font-monospace fw-semibold text-muted bg-white"
          style={{ minWidth: '55px', justifyContent: 'center' }}
          aria-label={`Current zoom: ${zoomPercent}%`}
        >
          {zoomPercent}%
        </span>

        <Button
          variant="light"
          onClick={onZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
          title="Zoom in"
          className="border-0 px-2"
        >
          <i className="bi bi-plus-lg" />
        </Button>
      </ButtonGroup>

      <ButtonGroup size="sm" className="bg-white shadow-sm rounded border">
        <Button
          variant="light"
          onClick={onResetView}
          aria-label="Reset view to 100%"
          title="Reset zoom and pan"
          className="border-0 px-2"
        >
          <i className="bi bi-arrow-counterclockwise me-1" />
          <span className="small d-none d-sm-inline">Reset</span>
        </Button>

        {onFitView && (
          <Button
            variant="light"
            onClick={onFitView}
            aria-label="Fit floor plan to view"
            title="Fit to view"
            className="border-0 px-2 border-start"
          >
            <i className="bi bi-aspect-ratio me-1" />
            <span className="small d-none d-sm-inline">Fit</span>
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
}
