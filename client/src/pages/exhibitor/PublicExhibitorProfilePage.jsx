/**
 * @fileoverview Public Exhibitor Profile Page.
 * T-6.8. FR-ATT-04.
 *
 * Displays public company information, verified badge, description,
 * product showcase list, staff contacts, and assigned booth with
 * "Show on floor plan" action.
 */

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Badge,
  Card as BsCard,
  Alert,
} from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicExhibitorById } from '../../api/exhibitors.js';
import { Button, StatusPill, Skeleton } from '../../components/ui/index.js';

export default function PublicExhibitorProfilePage() {
  const { id: exhibitorId } = useParams();
  const navigate = useNavigate();

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['publicExhibitorProfile', exhibitorId],
    queryFn: () => fetchPublicExhibitorById(exhibitorId),
    enabled: !!exhibitorId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Container className="py-5">
        <Skeleton variant="card" height={160} className="mb-4" />
        <Row className="g-4">
          <Col md={8}>
            <Skeleton lines={6} />
          </Col>
          <Col md={4}>
            <Skeleton variant="card" height={200} />
          </Col>
        </Row>
      </Container>
    );
  }

  if (isError) {
    const is404 = error?.response?.status === 404;
    return (
      <Container className="py-5 text-center">
        <div className="mb-3">
          <i className="bi bi-building-exclamation display-3 text-muted" />
        </div>
        <h1 className="h4 fw-bold">{is404 ? 'Exhibitor Not Found' : 'Failed to Load Profile'}</h1>
        <p className="text-muted mb-4">
          {is404
            ? 'This exhibitor profile does not exist or has not been published yet.'
            : error?.message || 'Something went wrong.'}
        </p>
        <Button variant="primary" as={Link} to="/expos">
          <i className="bi bi-arrow-left me-1" /> Browse Expos
        </Button>
      </Container>
    );
  }

  const companyName = profile.companyName || profile.user?.name || 'Exhibitor';
  const booth = profile.booth || profile.assignedBooth;

  return (
    <div className="public-exhibitor-profile-page py-4">
      <Container>
        {/* ── Breadcrumbs ── */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb small">
            <li className="breadcrumb-item">
              <Link to="/" className="text-decoration-none">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="/expos" className="text-decoration-none">Expos</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {companyName}
            </li>
          </ol>
        </nav>

        {/* ── Hero Banner ── */}
        <BsCard className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
          <div
            className="p-4 p-md-5 d-flex flex-wrap align-items-center justify-content-between gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(13,110,253,0.06) 0%, rgba(13,110,253,0.01) 100%)',
            }}
          >
            <div className="d-flex align-items-center gap-3.5">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt={companyName}
                  className="rounded-4 border bg-white p-1.5 shadow-sm object-fit-contain"
                  style={{ width: '80px', height: '80px' }}
                />
              ) : (
                <div
                  className="rounded-4 bg-primary text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '80px', height: '80px', fontSize: '32px' }}
                >
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h1 className="h3 fw-bold mb-0 text-dark">{companyName}</h1>
                  <i className="bi bi-patch-check-fill text-primary" title="Verified Exhibitor" />
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2 text-muted small">
                  {profile.category && (
                    <Badge bg="secondary-subtle" text="secondary" className="fw-normal text-capitalize">
                      {profile.category}
                    </Badge>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-decoration-none d-inline-flex align-items-center gap-1"
                    >
                      <i className="bi bi-globe" />
                      {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="d-flex gap-2">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm fw-semibold"
                >
                  <i className="bi bi-box-arrow-up-right me-1" /> Visit Website
                </a>
              )}
            </div>
          </div>
        </BsCard>

        {/* ── Main Content Grid ── */}
        <Row className="g-4">
          {/* Left Column: Description & Products */}
          <Col lg={8}>
            {/* About / Description */}
            <BsCard className="border shadow-sm rounded-3 p-4 mb-4 bg-white">
              <h2 className="h5 fw-bold mb-3 text-dark">About {companyName}</h2>
              <p className="text-secondary mb-0 leading-relaxed">
                {profile.description ||
                  'No detailed company biography provided yet. Visit their website to learn more.'}
              </p>
            </BsCard>

            {/* Products & Services Showcase */}
            {profile.products && profile.products.length > 0 && (
              <BsCard className="border shadow-sm rounded-3 p-4 mb-4 bg-white">
                <h2 className="h5 fw-bold mb-3 text-dark">Products & Services</h2>
                <div className="d-flex flex-column gap-3">
                  {profile.products.map((prod, idx) => {
                    const isObj = typeof prod === 'object';
                    const name = isObj ? prod.name : prod;
                    const desc = isObj ? prod.description : null;

                    return (
                      <div key={idx} className="p-3 bg-light rounded-3 border">
                        <h3 className="h6 fw-bold mb-1 text-dark">{name}</h3>
                        {desc && <p className="text-muted small mb-0">{desc}</p>}
                      </div>
                    );
                  })}
                </div>
              </BsCard>
            )}

            {/* Staff / Contacts */}
            {profile.staff && profile.staff.length > 0 && (
              <BsCard className="border shadow-sm rounded-3 p-4 bg-white">
                <h2 className="h5 fw-bold mb-3 text-dark">Exhibitor Staff</h2>
                <Row className="g-3">
                  {profile.staff.map((person, idx) => (
                    <Col key={idx} sm={6}>
                      <div className="d-flex align-items-center gap-2.5 p-2.5 bg-light rounded-3 border">
                        <div
                          className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                          style={{ width: '36px', height: '36px' }}
                        >
                          {person.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark small">{person.name}</div>
                          <div className="text-muted small">{person.role || 'Staff Representative'}</div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </BsCard>
            )}
          </Col>

          {/* Right Column: Booth Info & Expo Details */}
          <Col lg={4}>
            {/* Assigned Booth Card (FR-ATT-04) */}
            {booth ? (
              <BsCard className="border shadow-sm rounded-3 p-4 mb-4 bg-white border-primary-subtle">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-geo-alt-fill text-primary fs-5" />
                  <h2 className="h6 fw-bold mb-0 text-dark">Exhibition Booth</h2>
                </div>
                <div className="bg-primary-subtle rounded-3 p-3 text-center my-3 border border-primary-subtle">
                  <span className="small text-muted text-uppercase fw-semibold d-block">
                    Booth Number
                  </span>
                  <div className="display-6 fw-bold text-primary font-monospace">
                    {booth.code}
                  </div>
                  {booth.size && (
                    <Badge bg="primary" className="fw-normal text-capitalize mt-1">
                      {booth.size} space
                    </Badge>
                  )}
                </div>

                {/* Show on floor plan action */}
                <Button
                  variant="primary"
                  className="w-100 fw-semibold"
                  onClick={() => {
                    const targetExpoId = booth.expo?.id || booth.expo?._id || booth.expo;
                    navigate(`/expos/${targetExpoId}?tab=floorplan&booth=${booth.id || booth._id}`);
                  }}
                >
                  <i className="bi bi-map me-1.5" /> Show on Floor Plan
                </Button>
              </BsCard>
            ) : (
              <BsCard className="border shadow-sm rounded-3 p-4 mb-4 bg-white text-center text-muted">
                <i className="bi bi-grid-3x3 mb-2 fs-3 d-block opacity-50" />
                <h3 className="h6 fw-bold mb-1">Booth Space</h3>
                <span className="small">Booth allocation for this exhibitor is being finalized.</span>
              </BsCard>
            )}

            {/* Contact Card */}
            <BsCard className="border shadow-sm rounded-3 p-4 bg-white">
              <h2 className="h6 fw-bold mb-3 text-dark">Contact Information</h2>
              <div className="d-flex flex-column gap-2 small text-muted">
                {profile.contactEmail && (
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-envelope text-primary" />
                    <span>{profile.contactEmail}</span>
                  </div>
                )}
                {profile.contactPhone && (
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-telephone text-primary" />
                    <span>{profile.contactPhone}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-globe text-primary" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-decoration-none text-truncate"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </BsCard>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
