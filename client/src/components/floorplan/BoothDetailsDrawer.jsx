/**
 * @fileoverview Booth Details Drawer / Offcanvas.
 * Opens when a booth is selected in view or select mode to display dimensions,
 * pricing, status, showcase description, products catalog, and staff contacts.
 * T-3.12, T-3.14. Design §8, FR-EXP-05, FR-ATT-04.
 */

import React, { useEffect } from 'react';
import { Offcanvas, Badge, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { StatusPill, Button } from '../ui/index.js';
import { STATUS_PALETTE } from './FloorPlanLegend.jsx';
import { trackEvent } from '../../api/analytics.js';

export function BoothDetailsDrawer({
  show,
  onHide,
  booth = null,
  onAction,
  actionLabel,
  actionLoading = false,
}) {
  useEffect(() => {
    if (show && booth) {
      const boothId = booth._id || booth.id;
      if (boothId) {
        trackEvent({
          type: 'booth_view',
          expoId: booth.expo,
          target: boothId,
          targetModel: 'Booth',
        });
      }
    }
  }, [show, booth]);

  if (!booth) return null;

  const {
    code,
    label,
    description,
    size = 'medium',
    pricePerDay = 0,
    status = 'available',
    geometry = { w: 2, h: 2 },
    details = {},
  } = booth;

  const statusMeta = STATUS_PALETTE[status] || STATUS_PALETTE.available;
  const showcase = details.showcase || description;
  const products = details.products || [];
  const staff = details.staff || [];

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      className="shadow"
      style={{ width: '380px' }}
      aria-labelledby="booth-details-title"
    >
      <Offcanvas.Header closeButton className="border-bottom pb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="badge rounded-pill border px-2.5 py-1 small fw-semibold"
              style={{
                backgroundColor: statusMeta.fill,
                borderColor: statusMeta.stroke,
                color: statusMeta.textColor,
              }}
            >
              <i className={`bi ${statusMeta.icon} me-1`} />
              {statusMeta.label}
            </span>
            <span className="badge bg-secondary-subtle text-secondary text-capitalize border small">
              {size}
            </span>
          </div>
          <Offcanvas.Title id="booth-details-title" className="h4 fw-bold font-monospace text-dark mb-0">
            Booth {code}
          </Offcanvas.Title>
          {label && <p className="text-muted small mb-0 mt-1">{label}</p>}
        </div>
      </Offcanvas.Header>

      <Offcanvas.Body className="d-flex flex-column gap-4 py-3">
        {/* Specifications grid */}
        <div className="bg-light rounded-3 p-3 border">
          <Row className="g-2 text-center">
            <Col xs={6} className="border-end">
              <div className="text-muted small fw-semibold">Dimensions</div>
              <div className="fw-bold text-dark fs-6 mt-0.5">
                {geometry.w} × {geometry.h} m
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {geometry.w * geometry.h} m²
              </div>
            </Col>
            <Col xs={6}>
              <div className="text-muted small fw-semibold">Price per Day</div>
              <div className="fw-bold text-primary fs-6 mt-0.5">
                {pricePerDay > 0 ? `$${pricePerDay.toLocaleString()}` : 'Free'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                USD / day
              </div>
            </Col>
          </Row>
        </div>

        {/* Status explanation */}
        <div className="small">
          {status === 'available' && (
            <p className="text-success mb-0 d-flex align-items-start gap-2">
              <i className="bi bi-check-circle-fill flex-shrink-0 mt-0.5" />
              <span>This booth is currently open for reservation by approved exhibitors.</span>
            </p>
          )}
          {status === 'reserved' && (
            <p className="text-warning-emphasis mb-0 d-flex align-items-start gap-2">
              <i className="bi bi-hourglass-split flex-shrink-0 mt-0.5" />
              <span>This booth is currently reserved by an exhibitor awaiting final confirmation.</span>
            </p>
          )}
          {status === 'allocated' && (
            <p className="text-primary mb-0 d-flex align-items-start gap-2">
              <i className="bi bi-building-check flex-shrink-0 mt-0.5" />
              <span>This booth has been officially allocated to a confirmed exhibitor.</span>
            </p>
          )}
          {status === 'blocked' && (
            <p className="text-muted mb-0 d-flex align-items-start gap-2">
              <i className="bi bi-slash-circle flex-shrink-0 mt-0.5" />
              <span>This space is reserved for venue logistics or blocked by the organizer.</span>
            </p>
          )}
        </div>

        {/* Showcase Description */}
        {showcase && (
          <div>
            <h6 className="fw-bold small text-dark mb-1">
              <i className="bi bi-file-text me-1 text-primary" /> Showcase Overview
            </h6>
            <p className="text-muted small mb-0 lh-base">{showcase}</p>
          </div>
        )}

        {/* Products Catalog */}
        {products.length > 0 && (
          <div>
            <h6 className="fw-bold small text-dark mb-2">
              <i className="bi bi-box-seam me-1 text-primary" /> Products &amp; Services
            </h6>
            <div className="d-flex flex-wrap gap-1.5">
              {products.map((product, idx) => (
                <span
                  key={idx}
                  className="badge bg-light text-dark border small fw-normal py-1 px-2"
                >
                  {product}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Booth Staff */}
        {staff.length > 0 && (
          <div>
            <h6 className="fw-bold small text-dark mb-2">
              <i className="bi bi-people me-1 text-primary" /> Booth Staff
            </h6>
            <div className="d-flex flex-column gap-2">
              {staff.map((member, idx) => (
                <div key={idx} className="bg-light rounded p-2 border small">
                  <div className="fw-bold text-dark">{member.name}</div>
                  {member.title && <div className="text-muted">{member.title}</div>}
                  {member.email && (
                    <div className="text-muted mt-1">
                      <i className="bi bi-envelope me-1" />
                      <a href={`mailto:${member.email}`} className="text-decoration-none">
                        {member.email}
                      </a>
                    </div>
                  )}
                  {member.phone && (
                    <div className="text-muted">
                      <i className="bi bi-telephone me-1" />
                      {member.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button slot (e.g. Reserve Booth in select mode) */}
        {actionLabel && onAction && (
          <div className="mt-auto pt-3 border-top">
            <Button
              variant="primary"
              className="w-100"
              onClick={() => onAction(booth)}
              loading={actionLoading}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
