/**
 * @fileoverview Public Home Page.
 * Overview of EventSphere features, active expos CTA, and role entry points.
 */

import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'exhibitor') return '/exhibitor';
    return '/attendee';
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <Container className="py-5 text-center">
          <Row className="justify-content-center">
            <Col lg={8}>
              <h1 className="display-4 fw-bold mb-3">Next-Generation Expo & Trade Show Platform</h1>
              <p className="lead mb-4 opacity-90">
                Seamless booth reservations, interactive SVG floor plans, dynamic schedules, and real-time engagement for organizers, exhibitors, and attendees.
              </p>
              <div className="d-flex justify-content-center gap-3">
                {isAuthenticated ? (
                  <Button as={Link} to={getDashboardPath()} variant="light" size="lg" className="fw-bold px-4">
                    Go to Your Dashboard
                  </Button>
                ) : (
                  <>
                    <Button as={Link} to="/register" variant="light" size="lg" className="fw-bold px-4">
                      Get Started Free
                    </Button>
                    <Button as={Link} to="/login" variant="outline-light" size="lg" className="px-4">
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Feature Pillars */}
      <section className="py-5 bg-white">
        <Container className="py-4">
          <Row className="text-center mb-5">
            <Col>
              <h2 className="fw-bold">Built for Every Event Stakeholder</h2>
              <p className="text-muted">A unified platform tailored to organizers, exhibitors, and visitors.</p>
            </Col>
          </Row>

          <Row className="g-4">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm text-center p-3">
                <Card.Body>
                  <div className="bg-primary-subtle text-primary rounded-circle d-inline-flex p-3 mb-3">
                    <i className="bi bi-diagram-3 fs-3"></i>
                  </div>
                  <h3 className="h5 fw-bold">Interactive Floor Plans</h3>
                  <p className="text-muted small">
                    Vector-based SVG grid with live booth reservation status, conflict-free locking, and instant visual updates.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm text-center p-3">
                <Card.Body>
                  <div className="bg-success-subtle text-success rounded-circle d-inline-flex p-3 mb-3">
                    <i className="bi bi-briefcase fs-3"></i>
                  </div>
                  <h3 className="h5 fw-bold">Exhibitor Hub</h3>
                  <p className="text-muted small">
                    Streamlined application wizard, custom company profiles, booth staff assignment, and direct organizer messaging.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm text-center p-3">
                <Card.Body>
                  <div className="bg-info-subtle text-info rounded-circle d-inline-flex p-3 mb-3">
                    <i className="bi bi-calendar-event fs-3"></i>
                  </div>
                  <h3 className="h5 fw-bold">Personalized Agenda</h3>
                  <p className="text-muted small">
                    Attendees can bookmark sessions, register for capacity-capped talks, and receive timely automated notifications.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}
