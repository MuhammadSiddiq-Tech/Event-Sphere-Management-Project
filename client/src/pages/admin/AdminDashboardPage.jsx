/**
 * @fileoverview Admin Dashboard Landing Page.
 * Displays quick stats and shortcut cards for managing expos, applications, and schedules.
 */

import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Welcome back, {user?.name}</h1>
          <p className="text-muted mb-0">EventSphere Organizer & Administration Overview</p>
        </div>
        <Button as={Link} to="/admin/expos" variant="primary">
          <i className="bi bi-plus-circle me-2"></i>Create New Expo
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary-subtle text-primary rounded">
                <i className="bi bi-building fs-4"></i>
              </div>
              <div>
                <div className="text-muted small">Total Expos</div>
                <div className="fs-4 fw-bold">Active</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col sm={6} xl={3}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-warning-subtle text-warning rounded">
                <i className="bi bi-clock-history fs-4"></i>
              </div>
              <div>
                <div className="text-muted small">Pending Reviews</div>
                <div className="fs-4 fw-bold">Review Queue</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col sm={6} xl={3}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-success-subtle text-success rounded">
                <i className="bi bi-grid-3x3-gap fs-4"></i>
              </div>
              <div>
                <div className="text-muted small">Booths Reserved</div>
                <div className="fs-4 fw-bold">Live Floor Plan</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col sm={6} xl={3}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-info-subtle text-info rounded">
                <i className="bi bi-people fs-4"></i>
              </div>
              <div>
                <div className="text-muted small">Registered Attendees</div>
                <div className="fs-4 fw-bold">Active Community</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
