/**
 * @fileoverview Digital Entry Ticket Modal.
 * T-6.5. FR-ATT-02.
 * Shows attendee's entry pass, ticket code, event dates, and QR styling.
 */

import React from 'react';
import { Modal, Card as BsCard, Badge } from 'react-bootstrap';
import { Button } from '../ui/index.js';
import { formatExpoDateRange } from '../../lib/dateUtils.js';

export function TicketModal({ show, onHide, expo, registration, user }) {
  if (!registration) return null;

  const dateRange = formatExpoDateRange(expo?.startDate, expo?.endDate);
  const ticketCode = registration.ticketCode || 'TKT-PENDING';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md" className="ticket-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="h5 fw-bold text-dark">
          <i className="bi bi-ticket-perforated me-2 text-primary" />
          Event Entry Pass
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <BsCard className="border shadow-sm rounded-4 overflow-hidden position-relative">
          {/* Header strip */}
          <div className="bg-primary text-white p-3.5 d-flex justify-content-between align-items-center">
            <div>
              <span className="small text-white-50 text-uppercase fw-bold tracking-wider">
                Official Attendee Pass
              </span>
              <h2 className="h5 fw-bold mb-0 text-white mt-0.5">{expo?.title}</h2>
            </div>
            <i className="bi bi-qr-code fs-2 text-white-50" />
          </div>

          <BsCard.Body className="p-4">
            {/* Attendee Info */}
            <div className="mb-3.5">
              <span className="text-muted small fw-semibold text-uppercase">Attendee</span>
              <div className="fw-bold text-dark fs-5">{user?.name}</div>
              <div className="text-muted small">{user?.email}</div>
            </div>

            {/* Event Dates & Venue */}
            <div className="row g-2 mb-3.5 small">
              <div className="col-7">
                <span className="text-muted fw-semibold text-uppercase d-block">Dates</span>
                <span className="fw-medium text-dark">{dateRange}</span>
              </div>
              <div className="col-5">
                <span className="text-muted fw-semibold text-uppercase d-block">Venue</span>
                <span className="fw-medium text-dark">{expo?.venue?.name || 'TBA'}</span>
              </div>
            </div>

            {/* Cutout divider line */}
            <div className="border-top border-dashed my-3 position-relative" />

            {/* Ticket Code Box */}
            <div className="text-center py-2 bg-light rounded-3 border">
              <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                Unique Check-In Code
              </span>
              <div className="font-monospace fw-bolder fs-3 text-primary tracking-widest">
                {ticketCode}
              </div>
              <span className="text-muted small">Show this code at event entrance scanner</span>
            </div>
          </BsCard.Body>
        </BsCard>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0 d-flex justify-content-between">
        <Button variant="outline-secondary" size="sm" onClick={handlePrint}>
          <i className="bi bi-printer me-1" /> Print Pass
        </Button>
        <Button variant="primary" size="sm" onClick={onHide}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
