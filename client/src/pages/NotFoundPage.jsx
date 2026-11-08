/**
 * @fileoverview 404 Not Found Page.
 * Displayed when navigating to an undefined path.
 * T-2.10.
 */

import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Container className="py-5 my-5">
      <Row className="justify-content-center text-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0 p-4">
            <Card.Body>
              <div className="display-1 text-primary fw-bold mb-3">404</div>
              <h2 className="h4 fw-bold mb-3">Page Not Found</h2>
              <p className="text-muted mb-4">
                The page you are looking for might have been moved, deleted, or does not exist.
              </p>
              <Button as={Link} to="/" variant="primary">
                Return to Home
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
