/**
 * @fileoverview Floor plan interactive legend and status filter toggles.
 * Renders status swatches with counts and highlight toggles.
 * T-3.12. Design §5.3, §8.
 */

import React from 'react';
import { Badge } from 'react-bootstrap';

export const STATUS_PALETTE = {
  available: {
    fill: '#DCFCE7',
    stroke: '#16A34A',
    textColor: '#166534',
    icon: 'bi-check-circle',
    label: 'Available',
    description: 'Open for reservation',
  },
  reserved: {
    fill: '#FEF3C7',
    stroke: '#D97706',
    textColor: '#92400E',
    icon: 'bi-hourglass-split',
    label: 'Reserved',
    description: 'Reserved by an exhibitor',
  },
  allocated: {
    fill: '#E0E7FF',
    stroke: '#4F46E5',
    textColor: '#3730A3',
    icon: 'bi-building',
    label: 'Allocated',
    description: 'Assigned / confirmed exhibitor',
  },
  blocked: {
    fill: '#E2E8F0',
    stroke: '#64748B',
    textColor: '#334155',
    icon: 'bi-slash-circle',
    label: 'Blocked',
    description: 'Not available for reservation',
  },
};

export function FloorPlanLegend({
  counts = {},
  totalBooths = 0,
  activeFilter = null,
  onToggleFilter,
  className = '',
}) {
  const statuses = ['available', 'reserved', 'allocated', 'blocked'];

  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 ${className}`}>
      <span className="text-muted small fw-semibold me-1 d-none d-md-inline">
        Legend:
      </span>

      {statuses.map((statusKey) => {
        const meta = STATUS_PALETTE[statusKey];
        const count = counts[statusKey] || 0;
        const isActive = activeFilter === statusKey;
        const isDimmed = activeFilter && !isActive;

        return (
          <button
            key={statusKey}
            type="button"
            onClick={() => onToggleFilter?.(isActive ? null : statusKey)}
            className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-1.5 px-2.5 py-1 transition-all ${
              isActive
                ? 'shadow-sm border-2'
                : isDimmed
                ? 'opacity-50 border'
                : 'border'
            }`}
            style={{
              backgroundColor: meta.fill,
              borderColor: meta.stroke,
              color: meta.textColor,
            }}
            aria-pressed={isActive}
            aria-label={`${meta.label}: ${count} booths. Click to ${isActive ? 'show all' : 'highlight'}`}
            title={`Click to ${isActive ? 'show all' : `filter only ${meta.label}`}`}
          >
            <i className={`bi ${meta.icon} small`} />
            <span className="fw-semibold small">{meta.label}</span>
            <span
              className="badge rounded-pill ms-1"
              style={{
                backgroundColor: meta.stroke,
                color: '#ffffff',
                fontSize: '0.7rem',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}

      {totalBooths > 0 && (
        <span className="badge bg-light text-muted border ms-auto small fw-normal py-1.5 px-2.5">
          Total: <strong>{totalBooths}</strong> booths
        </span>
      )}
    </div>
  );
}
