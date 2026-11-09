/**
 * @fileoverview StatusPill / Badge component with integrated icons and semantic variants.
 * T-2.12. Design §5.2, §5.3, §6.
 */

import React from 'react';
import { Badge } from 'react-bootstrap';

const STATUS_MAP = {
  // Booth status
  available: { bg: 'success-subtle', text: 'success-emphasis', icon: 'bi-check-circle', label: 'Available' },
  reserved: { bg: 'warning-subtle', text: 'warning-emphasis', icon: 'bi-hourglass-split', label: 'Reserved' },
  allocated: { bg: 'primary-subtle', text: 'primary-emphasis', icon: 'bi-building', label: 'Allocated' },
  blocked: { bg: 'secondary-subtle', text: 'secondary-emphasis', icon: 'bi-slash-circle', label: 'Blocked' },

  // Application status
  pending: { bg: 'warning-subtle', text: 'warning-emphasis', icon: 'bi-clock', label: 'Pending Review' },
  approved: { bg: 'success-subtle', text: 'success-emphasis', icon: 'bi-check2-circle', label: 'Approved' },
  rejected: { bg: 'danger-subtle', text: 'danger-emphasis', icon: 'bi-x-circle', label: 'Rejected' },
  withdrawn: { bg: 'secondary-subtle', text: 'secondary-emphasis', icon: 'bi-arrow-counterclockwise', label: 'Withdrawn' },

  // Roles
  admin: { bg: 'danger-subtle', text: 'danger-emphasis', icon: 'bi-shield-lock', label: 'Admin' },
  exhibitor: { bg: 'success-subtle', text: 'success-emphasis', icon: 'bi-briefcase', label: 'Exhibitor' },
  attendee: { bg: 'info-subtle', text: 'info-emphasis', icon: 'bi-person', label: 'Attendee' },

  // Generic
  active: { bg: 'success-subtle', text: 'success-emphasis', icon: 'bi-check-circle-fill', label: 'Active' },
  inactive: { bg: 'secondary-subtle', text: 'secondary-emphasis', icon: 'bi-dash-circle', label: 'Inactive' },

  // Session status
  scheduled: { bg: 'primary-subtle', text: 'primary-emphasis', icon: 'bi-calendar-check', label: 'Scheduled' },
  updated: { bg: 'warning-subtle', text: 'warning-emphasis', icon: 'bi-pencil-square', label: 'Updated' },
  cancelled: { bg: 'danger-subtle', text: 'danger-emphasis', icon: 'bi-calendar-x', label: 'Cancelled' },

  // Session type
  keynote: { bg: 'warning-subtle', text: 'warning-emphasis', icon: 'bi-star-fill', label: 'Keynote' },
  session: { bg: 'info-subtle', text: 'info-emphasis', icon: 'bi-mic', label: 'Session' },
  workshop: { bg: 'success-subtle', text: 'success-emphasis', icon: 'bi-tools', label: 'Workshop' },
};

export function StatusPill({ status, variant, icon, label, className = '' }) {
  const normalizedKey = status ? String(status).toLowerCase() : null;
  const config = STATUS_MAP[normalizedKey] || {
    bg: variant || 'secondary-subtle',
    text: variant ? `${variant}-emphasis` : 'secondary-emphasis',
    icon: icon || 'bi-circle',
    label: label || status || '',
  };

  const displayIcon = icon || config.icon;
  const displayLabel = label || config.label;

  return (
    <span
      className={`badge rounded-pill border bg-${config.bg} text-${config.text} d-inline-flex align-items-center gap-1 px-2.5 py-1.5 small fw-semibold ${className}`}
    >
      {displayIcon && <i className={`bi ${displayIcon}`} aria-hidden="true"></i>}
      <span>{displayLabel}</span>
    </span>
  );
}
