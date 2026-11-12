/**
 * @fileoverview ExpoCard component — used in public expos list.
 * Editorial Swiss-grid card design with refined borders, rounded-4 styling,
 * and clean pill badges.
 * T-3.10. Design §7.11.
 */

import React from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { StatusPill } from '../ui/index.js';
import { formatExpoDateRange } from '../../lib/dateUtils.js';

/** Maps expo status to StatusPill variant configuration */
const EXPO_STATUS_CONFIG = {
  published: { icon: 'bi-megaphone', label: 'Published' },
  ongoing: { icon: 'bi-broadcast', label: 'Ongoing' },
  completed: { icon: 'bi-check-circle', label: 'Completed' },
  cancelled: { icon: 'bi-x-circle', label: 'Cancelled' },
  draft: { icon: 'bi-pencil-square', label: 'Draft' },
};

/**
 * @param {Object} props
 * @param {Object} props.expo
 */
export function ExpoCard({ expo }) {
  const {
    id,
    _id,
    slug,
    title,
    bannerUrl,
    description,
    category,
    tags = [],
    status,
    startDate,
    endDate,
    venue = {},
  } = expo;

  const expoId = id || _id;
  const href = `/expos/${slug || expoId}`;
  const statusConfig = EXPO_STATUS_CONFIG[status] || {};
  const dateRange = formatExpoDateRange(startDate, endDate);

  return (
    <Card
      as={Link}
      to={href}
      className="text-decoration-none h-100 shadow-sm rounded-4 card-hover overflow-hidden d-flex flex-column"
      style={{
        border: '1px solid rgba(10, 17, 40, 0.08)',
        color: 'inherit',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Banner image container */}
      <div
        className="bg-navy bg-opacity-10 d-flex align-items-center justify-content-center position-relative overflow-hidden"
        style={{ height: '175px' }}
        aria-hidden="true"
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="w-100 h-100 object-fit-cover"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center text-primary opacity-75">
            <i className="bi bi-globe-americas display-5 mb-1" />
            <span className="small font-monospace text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
              EventSphere Global
            </span>
          </div>
        )}
      </div>

      <Card.Body className="p-4 d-flex flex-column gap-3 flex-grow-1">
        {/* Status + Category Pill Badges */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <StatusPill
            status={status}
            icon={statusConfig.icon}
            label={statusConfig.label}
          />
          {category && (
            <span
              className="badge bg-light text-secondary border rounded-pill px-3 py-1 fw-medium"
              style={{ fontSize: '0.72rem' }}
            >
              {category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="h6 fw-bold mb-0 text-dark lh-sm" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className="text-secondary small mb-0 lh-base"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}

        {/* Date and Venue Metadata */}
        <div className="mt-auto pt-2 border-top d-flex flex-column gap-1 text-secondary" style={{ fontSize: '0.8rem' }}>
          {dateRange && (
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-calendar3 text-primary" aria-hidden="true" />
              <span>{dateRange}</span>
            </div>
          )}
          {(venue.city || venue.country || venue.name) && (
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-geo-alt text-primary" aria-hidden="true" />
              <span className="text-truncate">
                {[venue.name, venue.city, venue.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1 pt-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="badge bg-light text-secondary border rounded-pill px-2.5 py-1 fw-normal"
                style={{ fontSize: '0.68rem' }}
              >
                <span className="text-secondary opacity-50 me-0.5" aria-hidden="true">#</span>
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span
                className="badge bg-light text-secondary border rounded-pill px-2 py-1 fw-normal"
                style={{ fontSize: '0.68rem' }}
              >
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}