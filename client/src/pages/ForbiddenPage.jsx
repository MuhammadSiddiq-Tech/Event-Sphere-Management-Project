/**
 * @fileoverview 403 Forbidden Page.
 * Presented when an authenticated user attempts to access an unauthorized route.
 * T-2.10. NFR-SEC-03.
 */

import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForbiddenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'exhibitor') return '/exhibitor';
    return '/attendee';
  };

  return (
    <Container className="py-5 my-5">
      <Row className="justify-content-center text-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0 p-4">
            <Card.Body>
              <div className="display-1 text-danger fw-bold mb-3">403</div>
              <h2 className="h4 fw-bold mb-3">Access Denied</h2>
              <p className="text-muted mb-4">
                You do not have the required permissions to view this page. If you believe this is
                an error, please contact your administrator.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
                <Button as={Link} to={getDashboardPath()} variant="primary">
                  Return to Dashboard
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
