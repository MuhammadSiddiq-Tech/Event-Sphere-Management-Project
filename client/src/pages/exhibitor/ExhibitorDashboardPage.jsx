/**
 * @fileoverview Exhibitor Dashboard Landing Page.
 * Displays application progress, active booth status, and upcoming expos.
 */

import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ExhibitorDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Exhibitor Hub: {user?.name}</h1>
          <p className="text-muted mb-0">Manage applications, select booths, and customize your company profile.</p>
        </div>
        <Button as={Link} to="/expos" variant="primary">
          <i className="bi bi-search me-2"></i>Browse Expos to Apply
        </Button>
      </div>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h2 className="h5 fw-bold mb-3">Company Profile Status</h2>
            <p className="text-muted small">
              Ensure your profile, logo, and marketing materials are complete before applying for booths.
            </p>
            <Button as={Link} to="/exhibitor/profile" variant="outline-primary" size="sm" className="align-self-start">
              Update Company Details
            </Button>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h2 className="h5 fw-bold mb-3">Applications & Booth Reservations</h2>
            <p className="text-muted small">
              Track your pending organizer reviews and manage your reserved booth locations.
            </p>
            <Button as={Link} to="/exhibitor/applications" variant="outline-primary" size="sm" className="align-self-start">
              View My Applications
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
