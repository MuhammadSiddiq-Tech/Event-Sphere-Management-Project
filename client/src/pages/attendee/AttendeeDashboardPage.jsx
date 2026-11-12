/**
 * @fileoverview Attendee Dashboard Landing Page.
 * Editorial Swiss-grid Pass Hub displaying personal agenda, digital event tickets,
 * and quick shortcuts to exhibitor directory & messages.
 */

import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AttendeeDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      {/* ── Editorial Pass Hub Header ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <span className="text-uppercase fw-bold text-primary small">
            Attendee Pass Hub
          </span>
          <h1 className="h3 fw-bold mb-1">Hello, {user?.name || 'Attendee'}</h1>
          <p className="text-secondary small mb-0">
            Plan your session schedule, access digital entry passes, and explore live expos.
          </p>
        </div>
        <Button
          as={Link}
          to="/expos"
          variant="primary"
          className="rounded-pill px-4 fw-semibold"
        >
          <i className="bi bi-compass me-2"></i>Find Expos &amp; Events
        </Button>
      </div>

      {/* ── Bento Action Grid ── */}
      <Row className="g-4 mb-4">
        <Col xs={12} md={6} lg={4}>
          <Card
            className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover d-flex flex-column"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="bi bi-calendar-check fs-5"></i>
              </div>
              <span className="badge bg-ice text-primary rounded-pill px-3 py-1 small fw-bold">
                Schedule
              </span>
            </div>

            <h2 className="h5 fw-bold mb-2">My Scheduled Agenda</h2>
            <p className="text-secondary small mb-4 flex-grow-1">
              View your registered talks, bookmarked keynotes, and real-time session reminders.
            </p>

            <Button
              as={Link}
              to="/attendee/agenda"
              variant="outline-primary"
              size="sm"
              className="align-self-start rounded-pill px-4 fw-semibold"
            >
              Open My Agenda <i className="bi bi-arrow-right ms-1"></i>
            </Button>
          </Card>
        </Col>

        <Col xs={12} md={6} lg={4}>
          <Card className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover bg-navy text-white d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-white bg-opacity-10 text-lime"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="bi bi-ticket-perforated fs-5"></i>
              </div>
              <span className="badge bg-lime text-dark rounded-pill px-3 py-1 small fw-bold">
                Digital Pass
              </span>
            </div>

            <h2 className="h5 fw-bold text-white mb-2">My Event Tickets</h2>
            <p className="text-white-50 small mb-4 flex-grow-1">
              Access your QR digital entry passes and check-in codes for all registered expos.
            </p>

            <Button
              as={Link}
              to="/attendee/registrations"
              className="btn-lime align-self-start rounded-pill px-4 fw-bold border-0"
              size="sm"
            >
              View Event Passes <i className="bi bi-qr-code ms-1"></i>
            </Button>
          </Card>
        </Col>

        <Col xs={12} md={12} lg={4}>
          <Card
            className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover d-flex flex-column"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
                style={{ width: '44px', height: '44px' }}
              >
                <i className="bi bi-building fs-5"></i>
              </div>
              <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1 small fw-bold">
                Directory
              </span>
            </div>

            <h2 className="h5 fw-bold mb-2">Exhibitors &amp; Booths</h2>
            <p className="text-secondary small mb-4 flex-grow-1">
              Browse participating companies, locate booth numbers on the map, and send inquiries.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <Button
                as={Link}
                to="/attendee/exhibitors"
                variant="outline-dark"
                size="sm"
                className="rounded-pill px-3 fw-semibold"
              >
                Browse Exhibitors
              </Button>
              <Button
                as={Link}
                to="/attendee/messages"
                variant="light"
                size="sm"
                className="rounded-pill px-3 fw-semibold border"
              >
                Messages
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}