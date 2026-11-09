/**
 * @fileoverview Attendee Event Registrations / Passes Page.
 * T-6.5. FR-ATT-02.
 *
 * Displays all event passes the attendee holds, with ticket codes,
 * check-in QR modal, and shortcuts to schedule and floor plans.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card as BsCard, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyExpoRegistrations } from '../../api/attendee.js';
import { TicketModal } from '../../components/attendee/TicketModal.jsx';
import { Button, StatusPill, Skeleton, EmptyState } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatExpoDateRange } from '../../lib/dateUtils.js';

export default function AttendeeRegistrationsPage() {
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['myExpoRegistrations'],
    queryFn: () => fetchMyExpoRegistrations({ limit: 50 }),
    staleTime: 30_000,
  });

  const registrations = data?.items ?? [];

  const handleOpenTicket = (reg) => {
    setSelectedTicket(reg);
    setTicketModalOpen(true);
  };

  return (
    <Container fluid className="py-4 px-md-4">
      {/* ── Page Header ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 text-dark">My Event Passes & Tickets</h1>
          <p className="text-muted small mb-0">
            Digital check-in codes and passes for all expos you are attending.
          </p>
        </div>

        <Link to="/expos" className="btn btn-primary btn-sm">
          <i className="bi bi-calendar-plus me-1.5" /> Find More Expos
        </Link>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <Row className="g-3">
          {[1, 2, 3].map((i) => (
            <Col key={i} md={6} lg={4}>
              <Skeleton variant="card" height={220} />
            </Col>
          ))}
        </Row>
      ) : isError ? (
        <div className="alert alert-danger">
          Failed to load event passes. {error?.message}
        </div>
      ) : registrations.length === 0 ? (
        <EmptyState
          icon="bi-ticket-perforated"
          title="No Event Passes Yet"
          message="You haven't registered for any expos yet. Explore our published events and claim your free pass!"
          actionLabel="Browse Available Expos"
          onAction={() => (window.location.href = '/expos')}
        />
      ) : (
        <Row className="g-3">
          {registrations.map((reg) => {
            const expo = reg.expo;
            if (!expo) return null;

            const dateRange = formatExpoDateRange(expo.startDate, expo.endDate);

            return (
              <Col key={reg.id} md={6} lg={4}>
                <BsCard className="h-100 border shadow-sm rounded-4 overflow-hidden position-relative hover-shadow transition-all">
                  {/* Top Colored Bar */}
                  <div className="bg-primary text-white p-3.5 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-white-50 text-uppercase fw-semibold tracking-wider">
                        Entry Pass
                      </span>
                      <h2 className="h6 fw-bold mb-0 text-white text-truncate mt-0.5">
                        {expo.title}
                      </h2>
                    </div>
                    <i className="bi bi-qr-code fs-3 text-white-50" />
                  </div>

                  <BsCard.Body className="p-3.5 d-flex flex-column">
                    {/* Dates & Location */}
                    <div className="text-muted small mb-3">
                      <div className="d-flex align-items-center gap-1.5 mb-1 text-dark fw-medium">
                        <i className="bi bi-calendar3 text-primary" />
                        <span>{dateRange}</span>
                      </div>
                      {expo.venue?.name && (
                        <div className="d-flex align-items-center gap-1.5 text-secondary">
                          <i className="bi bi-geo-alt text-danger" />
                          <span>{expo.venue.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Ticket Code Box */}
                    <div className="bg-light border rounded-3 p-2.5 text-center my-auto mb-3">
                      <span className="text-muted small text-uppercase fw-semibold d-block">
                        Ticket Code
                      </span>
                      <div className="font-monospace fw-bold fs-5 text-primary tracking-widest">
                        {reg.ticketCode}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="d-flex justify-content-between align-items-center gap-2 pt-2 border-top">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleOpenTicket(reg)}
                      >
                        <i className="bi bi-qr-code me-1" /> View Pass
                      </Button>

                      <Link
                        to={`/expos/${expo.slug || expo.id || expo._id}`}
                        className="btn btn-light btn-sm text-secondary"
                      >
                        Event Hub <i className="bi bi-arrow-right ms-1" />
                      </Link>
                    </div>
                  </BsCard.Body>
                </BsCard>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Ticket Modal ── */}
      <TicketModal
        show={ticketModalOpen}
        onHide={() => {
          setTicketModalOpen(false);
          setSelectedTicket(null);
        }}
        expo={selectedTicket?.expo}
        registration={selectedTicket}
        user={user}
      />
    </Container>
  );
}
