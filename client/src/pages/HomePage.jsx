/**
 * @fileoverview Public Home Page.
 * Editorial Hero + Cobalt Stats Strip + Featured Expos + 3-Column Bento Pillars.
 * T-3.10, T-2.10. Design §7.1.
 */

import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { ExpoCard } from '../components/expos/ExpoCard.jsx';
import { EmptyState } from '../components/ui/index.js';
import { fetchPublicExpos } from '../api/expos.js';

const HERO_STATS = [
  { value: '240+', label: 'Live Expos Hosted' },
  { value: '48', label: 'Global Venues' },
  { value: '12k+', label: 'Active Exhibitors & Visitors' },
];

const FEATURE_PILLARS = [
  {
    num: '01',
    icon: 'bi-diagram-3',
    cardClass: 'bg-navy text-white',
    badgeClass: 'bg-lime text-dark',
    descClass: 'text-white-50',
    title: 'Interactive Floor Plans',
    desc: 'Vector-based SVG grid with live booth reservation status, conflict-free locking, and instant visual updates.',
  },
  {
    num: '02',
    icon: 'bi-briefcase',
    cardClass: 'bg-lime text-dark',
    badgeClass: 'bg-navy text-white',
    descClass: 'text-dark opacity-75',
    title: 'Exhibitor Hub',
    desc: 'Streamlined application wizard, custom company profiles, booth staff assignment, and direct organizer messaging.',
  },
  {
    num: '03',
    icon: 'bi-calendar-event',
    cardClass: 'bg-ice text-dark',
    badgeClass: 'bg-primary text-white',
    descClass: 'text-dark opacity-75',
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
      {/* ── Editorial Dark Obsidian Hero ── */}
      <section
        className="bg-navy position-relative overflow-hidden py-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 20%, rgba(0, 87, 255, 0.35), transparent 45%), radial-gradient(circle at 15% 85%, rgba(217, 249, 91, 0.12), transparent 40%)',
        }}
      >
        <Container className="py-4 py-lg-5">
          <Row className="align-items-center g-5">
            <Col lg={8}>
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-10 small fw-medium mb-4">
                <span
                  className="rounded-circle bg-lime d-inline-block"
                  style={{ width: '8px', height: '8px' }}
                />
                <span className="text-white-50">LIVE EXPO &amp; CONFERENCE INFRASTRUCTURE</span>
              </div>

              <h1
                className="display-3 fw-bold text-white mb-4"
                style={{ letterSpacing: '-0.03em', lineHeight: 1.08 }}
              >
                Where global expos meet the{' '}
                <span className="text-lime">next</span> live experience<span className="text-lime">.</span>
              </h1>

              <p className="lead text-white-50 mb-4" style={{ maxWidth: '620px' }}>
                Seamless booth reservations, interactive SVG floor plans, dynamic schedules, and
                real-time engagement for organizers, exhibitors, and attendees.
              </p>

              <div className="d-flex align-items-center gap-3 flex-wrap pt-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      to={getDashboardPath()}
                      className="btn btn-lime btn-lg rounded-pill px-4 py-3"
                    >
                      Go to Your Dashboard <i className="bi bi-arrow-up-right ms-1" />
                    </Link>
                    <Link
                      to="/expos"
                      className="btn btn-outline-light btn-lg rounded-pill px-4 py-3 fw-semibold"
                    >
                      Browse Expos
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn btn-lime btn-lg rounded-pill px-4 py-3"
                    >
                      Get Started Free <i className="bi bi-arrow-up-right ms-1" />
                    </Link>
                    <Link
                      to="/expos"
                      className="btn btn-outline-light btn-lg rounded-pill px-4 py-3 fw-semibold"
                    >
                      Browse Expos
                    </Link>
                  </>
                )}
              </div>
            </Col>

            {/* Right Editorial Highlight Card */}
            <Col lg={4} className="d-none d-lg-block">
              <div className="rounded-4 p-4 bg-white bg-opacity-10 border border-white border-opacity-15">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge bg-lime text-dark fw-semibold px-3 py-2 rounded-pill">
                    LIVE FLOOR PLAN
                  </span>
                  <span className="text-white-50 small font-monospace">SVG · REAL-TIME</span>
                </div>
                <h3 className="h4 fw-bold text-white mb-2">
                  Instant Booth Locking &amp; Live Schedules
                </h3>
                <p className="small text-white-50 mb-4">
                  Every reservation and agenda update syncs across all connected devices without page refreshes.
                </p>
                <div className="p-3 rounded-3 bg-navy border border-white border-opacity-10 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small text-white-50">System Status</div>
                    <div className="fw-semibold text-white">All Halls Operational</div>
                  </div>
                  <span className="badge bg-success bg-opacity-25 text-lime border border-success">
                    ● Live Sync
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ── Full-Width Royal Cobalt Stats Strip ── */}
      <section className="bg-primary text-white py-4">
        <Container>
          <Row className="g-4 align-items-center text-center text-md-start">
            {HERO_STATS.map((stat, idx) => (
              <Col key={stat.label} md={4}>
                <div
                  className={`d-flex flex-column flex-md-row align-items-center gap-3 ${
                    idx !== 0 ? 'ps-md-4 border-start-md border-white border-opacity-25' : ''
                  }`}
                >
                  <span
                    className="display-5 fw-bold text-lime mb-0"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    {stat.value}
                  </span>
                  <span className="small fw-medium text-white opacity-90">{stat.label}</span>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ── Featured Expos ── */}
      <section className="py-5">
        <Container className="py-3">
          <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-4 gap-3">
            <div>
              <span className="text-uppercase fw-bold text-primary small tracking-wide">
                Curated Events
              </span>
              <h2 className="display-6 fw-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
                Upcoming Expos
              </h2>
              <p className="text-secondary mb-0">
                Explore published exhibitions, reserve booths, or register as an attendee.
              </p>
            </div>
            <Link
              to="/expos"
              className="btn btn-dark rounded-pill px-4 py-2 fw-semibold d-none d-md-inline-flex align-items-center gap-2"
            >
              View All Expos
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          {featuredLoading ? (
            <Row className="g-4">
              {[1, 2, 3].map((i) => (
                <Col key={i} sm={6} lg={4}>
                  <div className="card border-0 shadow-sm p-3 h-100 rounded-4">
                    <div className="placeholder-glow">
                      <div className="placeholder w-100 rounded-3 mb-3" style={{ height: '160px' }} />
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
            <Link to="/expos" className="btn btn-dark rounded-pill px-4">
              View All Expos
              <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ── 3-Column Bento Feature Pillars (Obsidian / Lime / Ice) ── */}
      <section className="py-5 bg-white border-top">
        <Container className="py-3">
          <Row className="align-items-end mb-5 g-3">
            <Col lg={7}>
              <span className="text-uppercase fw-bold text-primary small">
                Platform Architecture
              </span>
              <h2 className="display-6 fw-bold mb-0" style={{ letterSpacing: '-0.02em' }}>
                Built for Every Event Stakeholder
              </h2>
            </Col>
            <Col lg={5} className="text-lg-end">
              <p className="text-secondary mb-0">
                Three distinct workspaces unified by real-time floor plans and live messaging.
              </p>
            </Col>
          </Row>

          <Row className="g-4">
            {FEATURE_PILLARS.map((f) => (
              <Col key={f.title} md={4}>
                <div
                  className={`card h-100 border-0 rounded-4 p-4 card-hover ${f.cardClass}`}
                >
                  <div className="card-body d-flex flex-column justify-content-between p-1">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <span
                          className={`d-inline-flex align-items-center justify-content-center rounded-3 ${f.badgeClass}`}
                          style={{ width: '48px', height: '48px' }}
                        >
                          <i className={`bi ${f.icon} fs-4`} aria-hidden="true" />
                        </span>
                        <span className="font-monospace fw-bold opacity-50">{f.num}</span>
                      </div>
                      <h3 className="h4 fw-bold mb-2">{f.title}</h3>
                      <p className={`small mb-0 ${f.descClass}`}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ── Editorial CTA Banner ── */}
      {!isAuthenticated && (
        <section className="py-5">
          <Container>
            <div className="bg-navy rounded-4 p-4 p-md-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
              <div>
                <h2 className="display-6 fw-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Ready to exhibit or attend<span className="text-lime">?</span>
                </h2>
                <p className="text-white-50 mb-0">
                  Join EventSphere today — create your free account in seconds.
                </p>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <Link to="/register" className="btn btn-lime btn-lg rounded-pill px-5 py-3">
                  Create Free Account
                </Link>
              </div>
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}