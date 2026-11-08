/**
 * @fileoverview Attendee Dashboard Landing Page.
 * Displays personal agenda, registered expos, and shortcuts to exhibitor directory.
 */

import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AttendeeDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Hello, {user?.name}</h1>
          <p className="text-muted mb-0">Plan your schedule, track your tickets, and explore upcoming expos.</p>
        </div>
        <Button as={Link} to="/expos" variant="primary">
          <i className="bi bi-calendar-plus me-2"></i>Find Expos & Events
        </Button>
      </div>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h2 className="h5 fw-bold mb-3">My Scheduled Agenda</h2>
            <p className="text-muted small">
              View your registered talks, bookmarked keynotes, and session start reminders.
            </p>
            <Button as={Link} to="/attendee/agenda" variant="outline-primary" size="sm" className="align-self-start">
              Open My Agenda
            </Button>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h2 className="h5 fw-bold mb-3">My Event Tickets</h2>
            <p className="text-muted small">
              Access your digital entry passes and check-in codes for active expos.
            </p>
            <Button as={Link} to="/attendee/registrations" variant="outline-primary" size="sm" className="align-self-start">
              View Event Passes
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
