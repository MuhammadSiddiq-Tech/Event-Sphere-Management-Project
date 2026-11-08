/**
 * @fileoverview Booth Reservation Confirmation Modal for Exhibitors.
 * Displays booth dimensions, pricing calculation, expo duration, and rule notices.
 * Handles atomic reservation confirmation and 409 race condition conflicts cleanly.
 * T-3.14. FR-EXP-03, FR-EXP-04, Rules BR-3, BR-4.
 */

import React from 'react';
import { Modal, Button, Alert, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export function BoothReservationModal({
  show = false,
  onHide = () => {},
  booth = null,
  expo = null,
  onConfirm = () => {},
  isLoading = false,
  error = null,
  onDismissError = () => {},
}) {
  if (!booth) return null;

  const geom = booth.geometry || { w: 2, h: 2 };
  const area = geom.w * geom.h;
  const pricePerDay = Number(booth.pricePerDay) || 0;

  // Calculate duration in days if expo dates exist
  let durationDays = 1;
  if (expo?.startDate && expo?.endDate) {
    const start = new Date(expo.startDate);
    const end = new Date(expo.endDate);
    const diffTime = Math.abs(end - start);
    durationDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  const totalPrice = pricePerDay * durationDays;

  // Detect conflict (409) vs permission (403) errors
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  const isConflict409 =
    error?.status === 409 ||
    errorMessage.toLowerCase().includes('already reserved') ||
    errorMessage.toLowerCase().includes('just reserved') ||
    errorMessage.toLowerCase().includes('no longer available') ||
    errorMessage.toLowerCase().includes('already hold a booth');

  const isAlreadyHolding = errorMessage.toLowerCase().includes('already hold a booth');
  const isApplicationRequired =
    error?.status === 403 ||
    errorMessage.toLowerCase().includes('approved application') ||
    errorMessage.toLowerCase().includes('br-3');

  return (
    <Modal
      show={show}
      onHide={isLoading ? undefined : onHide}
      centered
      backdrop={isLoading ? 'static' : true}
      aria-labelledby="booth-reservation-modal-title"
    >
      <Modal.Header closeButton={!isLoading} className="border-bottom">
        <Modal.Title id="booth-reservation-modal-title" className="h5 fw-bold d-flex align-items-center gap-2">
          <i className="bi bi-bookmark-check-fill text-primary" />
          Reserve Booth {booth.code}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="d-flex flex-column gap-3 py-3">
        {/* Error Alerts */}
        {isConflict409 && !isAlreadyHolding && (
          <Alert variant="danger" className="d-flex align-items-start gap-2 mb-0">
            <i className="bi bi-exclamation-octagon-fill fs-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Booth Just Taken!</strong>
              <div className="small mt-1">
                Another exhibitor just completed their reservation for <strong>Booth {booth.code}</strong>.
                The floor plan has been updated with the latest availability.
              </div>
            </div>
          </Alert>
        )}

        {isAlreadyHolding && (
          <Alert variant="warning" className="d-flex align-items-start gap-2 mb-0">
            <i className="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Booth Limit Reached (Rule BR-4)</strong>
              <div className="small mt-1">
                Your organization already holds a reserved booth in this expo. Exhibitors may hold at most one booth per expo.
              </div>
            </div>
          </Alert>
        )}

        {isApplicationRequired && (
          <Alert variant="warning" className="d-flex align-items-start gap-2 mb-0">
            <i className="bi bi-shield-exclamation fs-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Approved Application Required (Rule BR-3)</strong>
              <div className="small mt-1">
                You must have an approved application for this expo before you can reserve a booth.
              </div>
            </div>
          </Alert>
        )}

        {error && !isConflict409 && !isApplicationRequired && (
          <Alert variant="danger" dismissible onClose={onDismissError} className="mb-0 small">
            {errorMessage || 'Failed to complete booth reservation. Please try again.'}
          </Alert>
        )}

        {/* Booth Specs Card */}
        <div className="bg-light rounded-3 p-3 border">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-mono fw-bold fs-5 text-dark">Booth {booth.code}</span>
            <Badge bg="success" pill>
              Available
            </Badge>
          </div>

          {booth.label && <div className="text-muted small mb-3">{booth.label}</div>}

          <Row className="g-2 text-center pt-2 border-top">
            <Col xs={4}>
              <div className="text-muted small">Dimensions</div>
              <div className="fw-bold text-dark mt-0.5">
                {geom.w} × {geom.h} m
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {area} m²
              </div>
            </Col>

            <Col xs={4}>
              <div className="text-muted small">Daily Rate</div>
              <div className="fw-bold text-primary mt-0.5">
                {pricePerDay > 0 ? `$${pricePerDay}` : 'Free'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                USD / day
              </div>
            </Col>

            <Col xs={4}>
              <div className="text-muted small">Total Cost</div>
              <div className="fw-bold text-success mt-0.5">
                {totalPrice > 0 ? `$${totalPrice.toLocaleString()}` : 'Free'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                for {durationDays} day{durationDays > 1 ? 's' : ''}
              </div>
            </Col>
          </Row>
        </div>

        {/* Expo & Rules Terms */}
        <div className="small text-muted bg-white rounded p-2 border">
          <div className="d-flex align-items-center gap-1 fw-semibold text-dark mb-1">
            <i className="bi bi-info-circle text-primary" />
            Reservation Policy:
          </div>
          <ul className="mb-0 ps-3">
            <li>Holds this booth space exclusively for your organization.</li>
            <li>Limited to <strong>1 booth per exhibitor</strong> per expo (Rule BR-4).</li>
            <li>All reservations are subject to organizer confirmation and payment terms.</li>
          </ul>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top">
        {isConflict409 ? (
          <Button variant="primary" onClick={onHide}>
            Choose Another Booth
          </Button>
        ) : isApplicationRequired ? (
          <>
            <Button variant="outline-secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button as={Link} to="/exhibitor/applications" variant="primary">
              View Applications
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={onHide} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(booth)}
              disabled={isLoading}
              className="d-inline-flex align-items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" animation="border" />
                  Reserving…
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle" />
                  Confirm &amp; Reserve Booth
                </>
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
