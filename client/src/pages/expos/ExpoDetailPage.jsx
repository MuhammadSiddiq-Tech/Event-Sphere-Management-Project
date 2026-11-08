/**
 * @fileoverview Expo Detail Page — public/authenticated view.
 * Shows hero banner, title, dates, venue, and tabs:
 *   Overview · Schedule (placeholder) · Exhibitors (placeholder) · Floor Plan (view mode, T-3.12)
 * T-3.10. FR-ATT-01, Design §7.11.
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Nav,
  Tab,
  Alert,
  Button,
  Spinner,
} from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchExpoById, fetchExpoBySlug, fetchExpoBooths } from '../../api/expos.js';
import { StatusPill, Skeleton } from '../../components/ui/index.js';
import { formatExpoDateRange, formatDate, relativeDays } from '../../lib/dateUtils.js';

/** Determine if the idOrSlug param looks like a MongoDB ObjectId */
function isObjectId(str) {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

/** Expo detail tabs */
const TABS = [
  { key: 'overview', label: 'Overview', icon: 'bi-info-circle' },
  { key: 'schedule', label: 'Schedule', icon: 'bi-calendar3' },
  { key: 'exhibitors', label: 'Exhibitors', icon: 'bi-briefcase' },
  { key: 'floorplan', label: 'Floor Plan', icon: 'bi-diagram-3' },
];

export default function ExpoDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch expo by id or slug
  const {
    data: expo,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['expo', idOrSlug],
    queryFn: () =>
      isObjectId(idOrSlug) ? fetchExpoById(idOrSlug) : fetchExpoBySlug(idOrSlug),
    staleTime: 60_000,
  });

  // Fetch booths for floor plan tab (lazy when tab is selected)
  const { data: booths = [], isLoading: boothsLoading } = useQuery({
    queryKey: ['expoBooths', expo?.id ?? expo?._id],
    queryFn: () => fetchExpoBooths(expo?.id ?? expo?._id),
    enabled: !!expo && activeTab === 'floorplan',
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Container className="py-5">
        <Skeleton variant="card" className="mb-4" />
        <Skeleton lines={5} />
      </Container>
    );
  }

  if (isError) {
    const is404 = error?.response?.status === 404;
    return (
      <Container className="py-5 text-center">
        <div className="mb-4">
          <i className={`bi ${is404 ? 'bi-calendar-x' : 'bi-exclamation-triangle'} display-1 text-muted`} aria-hidden="true" />
        </div>
        <h1 className="h3 fw-bold">{is404 ? 'Expo Not Found' : 'Failed to Load'}</h1>
        <p className="text-muted mb-4">
          {is404
            ? 'This expo does not exist or is no longer available.'
            : (error?.response?.data?.error?.message || 'Something went wrong. Please try again.')}
        </p>
        <div className="d-flex justify-content-center gap-2">
          <Button variant="primary" as={Link} to="/expos">
            <i className="bi bi-arrow-left me-1" /> Browse Expos
          </Button>
          {!is404 && (
            <Button variant="outline-secondary" onClick={() => navigate(0)}>
              <i className="bi bi-arrow-clockwise me-1" /> Retry
            </Button>
          )}
        </div>
      </Container>
    );
  }

  const {
    id,
    _id,
    title,
    bannerUrl,
    description,
    category,
    tags = [],
    status,
    startDate,
    endDate,
    venue = {},
    maxBooths,
  } = expo;

  const expoId = id || _id;
  const dateRange = formatExpoDateRange(startDate, endDate);
  const relativeStart = startDate ? relativeDays(startDate) : null;

  return (
    <div>
      {/* Hero Banner */}
      <div
        className="position-relative bg-dark overflow-hidden"
        style={{ minHeight: '240px' }}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${title} banner`}
            className="w-100 h-100 position-absolute top-0 start-0"
            style={{ objectFit: 'cover', opacity: 0.5 }}
          />
        ) : (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 bg-primary"
            style={{ opacity: 0.15 }}
            aria-hidden="true"
          />
        )}
        <Container className="position-relative py-5">
          {/* Back link */}
          <Link
            to="/expos"
            className="d-inline-flex align-items-center gap-1 text-white opacity-75 text-decoration-none mb-3 small"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to Expos
          </Link>

          <div className="d-flex flex-wrap align-items-start gap-2 mb-2">
            <StatusPill status={status} />
            {category && (
              <span className="badge bg-white bg-opacity-25 text-white border border-white border-opacity-25 small">
                {category}
              </span>
            )}
          </div>

          <h1 className="text-white fw-bold display-6 mb-2">{title}</h1>

          <div className="d-flex flex-wrap gap-3 text-white opacity-75 small">
            {dateRange && (
              <span>
                <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                {dateRange}
                {relativeStart && ` · ${relativeStart}`}
              </span>
            )}
            {(venue.city || venue.country) && (
              <span>
                <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                {[venue.name, venue.city, venue.country].filter(Boolean).join(', ')}
              </span>
            )}
            {maxBooths && (
              <span>
                <i className="bi bi-grid me-1" aria-hidden="true" />
                Up to {maxBooths} booths
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-3">
              {tags.map((tag) => (
                <span key={tag} className="badge bg-white bg-opacity-20 text-white border border-white border-opacity-25 small fw-normal">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Container>
      </div>

      {/* Tabs + Content */}
      <Container className="py-4">
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          {/* Tab Navigation */}
          <Nav variant="tabs" className="mb-4">
            {TABS.map((tab) => (
              <Nav.Item key={tab.key}>
                <Nav.Link eventKey={tab.key} className="d-flex align-items-center gap-2">
                  <i className={`bi ${tab.icon}`} aria-hidden="true" />
                  <span className="d-none d-sm-inline">{tab.label}</span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <Tab.Content>
            {/* ── Overview ── */}
            <Tab.Pane eventKey="overview">
              <Row className="g-4">
                <Col lg={8}>
                  {description ? (
                    <>
                      <h2 className="h5 fw-bold mb-3">About This Expo</h2>
                      <p className="text-dark lh-lg">{description}</p>
                    </>
                  ) : (
                    <p className="text-muted fst-italic">No description provided.</p>
                  )}
                </Col>
                <Col lg={4}>
                  <div className="bg-white rounded-3 shadow-sm p-3 d-flex flex-column gap-3">
                    <h3 className="h6 fw-bold mb-0">Event Details</h3>
                    {dateRange && (
                      <div>
                        <div className="text-muted small fw-semibold mb-1">
                          <i className="bi bi-calendar3 me-1" aria-hidden="true" />
                          Dates
                        </div>
                        <div>{dateRange}</div>
                        {startDate && (
                          <div className="text-muted small">{formatDate(startDate, 'EEEE, MMMM d, yyyy')}</div>
                        )}
                      </div>
                    )}
                    {(venue.name || venue.address || venue.city) && (
                      <div>
                        <div className="text-muted small fw-semibold mb-1">
                          <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                          Venue
                        </div>
                        {venue.name && <div className="fw-semibold">{venue.name}</div>}
                        {venue.address && <div className="text-muted small">{venue.address}</div>}
                        <div className="text-muted small">
                          {[venue.city, venue.country].filter(Boolean).join(', ')}
                        </div>
                        {venue.coordinates?.lat && venue.coordinates?.lng && (
                          <a
                            href={`https://maps.google.com/?q=${venue.coordinates.lat},${venue.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="d-inline-flex align-items-center gap-1 text-primary text-decoration-none small mt-1"
                          >
                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                            View on Google Maps
                          </a>
                        )}
                      </div>
                    )}
                    <div>
                      <div className="text-muted small fw-semibold mb-1">
                        <i className="bi bi-info-circle me-1" aria-hidden="true" />
                        Status
                      </div>
                      <StatusPill status={status} />
                    </div>
                  </div>
                </Col>
              </Row>
            </Tab.Pane>

            {/* ── Schedule (placeholder for T-5.x) ── */}
            <Tab.Pane eventKey="schedule">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-calendar3 display-3 mb-3 d-block opacity-50" aria-hidden="true" />
                <h3 className="h5">Schedule Coming Soon</h3>
                <p className="small">The session schedule for this expo will be available here once published.</p>
              </div>
            </Tab.Pane>

            {/* ── Exhibitors (placeholder for T-4.x) ── */}
            <Tab.Pane eventKey="exhibitors">
              <div className="text-center py-5 text-muted">
                <i className="bi bi-briefcase display-3 mb-3 d-block opacity-50" aria-hidden="true" />
                <h3 className="h5">Exhibitors List Coming Soon</h3>
                <p className="small">The list of exhibitors and their profiles will appear here once approved.</p>
              </div>
            </Tab.Pane>

            {/* ── Floor Plan (view mode — T-3.12 will fill this fully) ── */}
            <Tab.Pane eventKey="floorplan">
              <FloorPlanTab expoId={expoId} booths={booths} isLoading={boothsLoading} />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </div>
  );
}

/**
 * Floor Plan Tab — a lightweight "view" placeholder that shows booth count stats
 * and a mini status breakdown. Full SVG floor plan is T-3.12.
 */
function FloorPlanTab({ expoId, booths, isLoading }) {
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading floor plan…</span>
        </Spinner>
        <p className="mt-2 text-muted small">Loading floor plan…</p>
      </div>
    );
  }

  if (!booths || booths.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-diagram-3 display-3 mb-3 d-block opacity-50" aria-hidden="true" />
        <h3 className="h5">Floor Plan Not Available</h3>
        <p className="small">The floor plan for this expo hasn't been configured yet.</p>
      </div>
    );
  }

  // Count by status
  const counts = booths.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const statusMeta = [
    { key: 'available', label: 'Available', className: 'booth-available', icon: 'bi-check-circle' },
    { key: 'reserved', label: 'Reserved', className: 'booth-reserved', icon: 'bi-hourglass-split' },
    { key: 'allocated', label: 'Allocated', className: 'booth-allocated', icon: 'bi-building' },
    { key: 'blocked', label: 'Blocked', className: 'booth-blocked', icon: 'bi-slash-circle' },
  ];

  return (
    <div>
      <Alert variant="info" className="d-flex align-items-center gap-2 mb-4">
        <i className="bi bi-info-circle-fill" aria-hidden="true" />
        <span>
          Interactive floor plan with pan/zoom and booth details is coming in a future update.
          Below is a summary of booth availability.
        </span>
      </Alert>

      {/* Booth availability summary */}
      <Row className="g-3 mb-4">
        {statusMeta.map(({ key, label, className, icon }) => (
          counts[key] > 0 && (
            <Col key={key} xs={6} sm={3}>
              <div className={`rounded-3 p-3 text-center border ${className}`}>
                <i className={`bi ${icon} fs-4 d-block mb-1`} aria-hidden="true" />
                <div className="fw-bold fs-5">{counts[key]}</div>
                <div className="small">{label}</div>
              </div>
            </Col>
          )
        ))}
        <Col xs={6} sm={3}>
          <div className="rounded-3 p-3 text-center border bg-light">
            <i className="bi bi-grid fs-4 d-block mb-1 text-muted" aria-hidden="true" />
            <div className="fw-bold fs-5">{booths.length}</div>
            <div className="small text-muted">Total Booths</div>
          </div>
        </Col>
      </Row>

      {/* Booth listing table */}
      <div className="bg-white rounded-3 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover mb-0" aria-label="Booth list">
            <thead className="table-light">
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Size</th>
                <th scope="col">Status</th>
                <th scope="col" className="d-none d-md-table-cell">Price / Day</th>
                <th scope="col" className="d-none d-sm-table-cell">Label</th>
              </tr>
            </thead>
            <tbody>
              {booths.map((booth) => {
                const statusMeta2 = statusMeta.find((s) => s.key === booth.status);
                return (
                  <tr key={booth.id || booth._id}>
                    <td className="fw-mono fw-semibold">{booth.code}</td>
                    <td className="text-capitalize text-muted">{booth.size || 'medium'}</td>
                    <td>
                      <span
                        className={`badge rounded-pill border ${statusMeta2?.className ?? ''} d-inline-flex align-items-center gap-1 px-2 py-1 small fw-semibold`}
                      >
                        {statusMeta2 && <i className={`bi ${statusMeta2.icon}`} aria-hidden="true" />}
                        <span className="text-capitalize">{booth.status}</span>
                      </span>
                    </td>
                    <td className="d-none d-md-table-cell text-muted">
                      {booth.pricePerDay > 0 ? `$${booth.pricePerDay.toLocaleString()}` : '—'}
                    </td>
                    <td className="d-none d-sm-table-cell text-muted small">{booth.label || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
