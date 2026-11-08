/**
 * @fileoverview Public Home Page.
 * Hero section + featured (upcoming/ongoing) expos carousel + features section.
 * T-3.10, T-2.10. Design §7.1.
 */

import React from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { ExpoCard } from '../components/expos/ExpoCard.jsx';
import { EmptyState } from '../components/ui/index.js';
import { fetchPublicExpos } from '../api/expos.js';

const FEATURE_PILLARS = [
  {
    icon: 'bi-diagram-3',
    colorClass: 'bg-primary-subtle text-primary',
    title: 'Interactive Floor Plans',
    desc: 'Vector-based SVG grid with live booth reservation status, conflict-free locking, and instant visual updates.',
  },
  {
    icon: 'bi-briefcase',
    colorClass: 'bg-success-subtle text-success',
    title: 'Exhibitor Hub',
    desc: 'Streamlined application wizard, custom company profiles, booth staff assignment, and direct organizer messaging.',
  },
  {
    icon: 'bi-calendar-event',
    colorClass: 'bg-info-subtle text-info',
    title: 'Personalised Agenda',
    desc: 'Attendees can bookmark sessions, register for capacity-capped talks, and receive timely automated notifications.',
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'exhibitor') return '/exhibitor';
    return '/attendee';
  };

  // Fetch a small selection of featured (published/ongoing) expos
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['expos', 'featured'],
    queryFn: () => fetchPublicExpos({ limit: 3, sort: 'startDate' }),
    staleTime: 5 * 60_000,
  });

  const featuredExpos = featuredData?.items ?? [];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-primary text-white py-5">
        <Container className="py-5 text-center">
          <Row className="justify-content-center">
            <Col lg={8}>
              <h1 className="display-4 fw-bold mb-3">
                Next-Generation Expo &amp; Trade Show Platform
              </h1>
              <p className="lead mb-4 opacity-90">
                Seamless booth reservations, interactive SVG floor plans, dynamic schedules, and
                real-time engagement for organizers, exhibitors, and attendees.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                {isAuthenticated ? (
                  <>
                    <Link to={getDashboardPath()} className="btn btn-light btn-lg fw-bold px-4">
                      Go to Your Dashboard
                    </Link>
                    <Link to="/expos" className="btn btn-outline-light btn-lg px-4">
                      Browse Expos
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-light btn-lg fw-bold px-4">
                      Get Started Free
                    </Link>
                    <Link to="/expos" className="btn btn-outline-light btn-lg px-4">
                      Browse Expos
                    </Link>
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ── Featured Expos ── */}
      <section className="py-5 bg-light">
        <Container className="py-2">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="fw-bold mb-1">Upcoming Expos</h2>
              <p className="text-muted mb-0">Don't miss these upcoming events.</p>
            </div>
            <Link to="/expos" className="btn btn-outline-primary btn-sm d-none d-md-inline-flex align-items-center gap-1">
              View all
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          {featuredLoading ? (
            <Row className="g-4">
              {[1, 2, 3].map((i) => (
                <Col key={i} sm={6} lg={4}>
                  <div className="card border-0 shadow-sm p-3 h-100">
                    <div className="placeholder-glow">
                      <div className="placeholder w-100 rounded mb-3" style={{ height: '140px' }} />
                      <span className="placeholder w-50 d-block mb-2" />
                      <span className="placeholder w-75 d-block mb-1" />
                      <span className="placeholder w-50 d-block" />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : featuredExpos.length === 0 ? (
            <EmptyState
              icon="bi-calendar-x"
              title="No upcoming expos yet"
              description="Check back soon — events are being added regularly."
            />
          ) : (
            <Row className="g-4">
              {featuredExpos.map((expo) => (
                <Col key={expo.id || expo._id} sm={6} lg={4}>
                  <ExpoCard expo={expo} />
                </Col>
              ))}
            </Row>
          )}

          <div className="text-center mt-4 d-md-none">
            <Link to="/expos" className="btn btn-outline-primary">
              View all expos
              <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Feature Pillars ── */}
      <section className="py-5 bg-white">
        <Container className="py-4">
          <Row className="text-center mb-5">
            <Col>
              <h2 className="fw-bold">Built for Every Event Stakeholder</h2>
              <p className="text-muted">A unified platform tailored to organizers, exhibitors, and visitors.</p>
            </Col>
          </Row>

          <Row className="g-4">
            {FEATURE_PILLARS.map((f) => (
              <Col key={f.title} md={4}>
                <div className="card h-100 border-0 shadow-sm text-center p-3">
                  <div className="card-body">
                    <div className={`${f.colorClass} rounded-circle d-inline-flex p-3 mb-3`}>
                      <i className={`bi ${f.icon} fs-3`} aria-hidden="true" />
                    </div>
                    <h3 className="h5 fw-bold">{f.title}</h3>
                    <p className="text-muted small">{f.desc}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ── CTA Banner ── */}
      {!isAuthenticated && (
        <section className="py-5 bg-primary text-white text-center">
          <Container>
            <h2 className="fw-bold mb-2">Ready to exhibit or attend?</h2>
            <p className="opacity-75 mb-4">
              Join EventSphere today — it's free to get started.
            </p>
            <Link to="/register" className="btn btn-light btn-lg fw-bold px-5">
              Create your free account
            </Link>
          </Container>
        </section>
      )}
    </div>
  );
}
