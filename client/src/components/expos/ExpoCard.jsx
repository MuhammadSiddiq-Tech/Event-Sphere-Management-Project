/**
 * @fileoverview ExpoCard component — used in public expos list.
 * Renders expo banner, title, dates, venue, status, and CTA.
 * T-3.10. Design §7.11.
 */

import React from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
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
      className="text-decoration-none h-100 border-0 shadow-sm rounded-3 card-hover overflow-hidden"
      style={{ color: 'inherit' }}
    >
      {/* Banner image */}
      <div
        className="bg-primary-subtle d-flex align-items-center justify-content-center"
        style={{ height: '160px', overflow: 'hidden' }}
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
          <i className="bi bi-globe-americas text-primary opacity-50" style={{ fontSize: '3.5rem' }} />
        )}
      </div>

      <Card.Body className="p-3 d-flex flex-column gap-2">
        {/* Status + Category */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <StatusPill
            status={status}
            icon={statusConfig.icon}
            label={statusConfig.label}
          />
          {category && (
            <Badge bg="secondary" pill className="fw-normal small">
              {category}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="h6 fw-bold mb-0 text-dark lh-sm">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-muted small mb-0 lh-sm" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {description}
          </p>
        )}

        {/* Date and Venue */}
        <div className="mt-auto pt-1 d-flex flex-column gap-1">
          {dateRange && (
            <div className="d-flex align-items-center gap-1 text-muted small">
              <i className="bi bi-calendar3" aria-hidden="true" />
              <span>{dateRange}</span>
            </div>
          )}
          {(venue.city || venue.country) && (
            <div className="d-flex align-items-center gap-1 text-muted small">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <span>
                {[venue.city, venue.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-light text-muted border small fw-normal">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="badge bg-light text-muted border small fw-normal">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
