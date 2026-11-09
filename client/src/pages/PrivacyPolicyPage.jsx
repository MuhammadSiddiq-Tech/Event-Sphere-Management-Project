/**
 * @fileoverview Privacy Policy Page.
 * T-9.1. NFR-PRIV-01, FR-SYS-05.
 * GDPR-aligned privacy policy detailing lawful basis, data minimisation,
 * retention periods, and user rights.
 */

import React from 'react';
import { Container, Card, Row, Col, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-5" style={{ maxWidth: '900px' }}>
      <div className="mb-4">
        <Link to="/" className="btn btn-outline-secondary btn-sm mb-3">
          <i className="bi bi-arrow-left me-1" />
          Back to Home
        </Link>
        <div className="d-flex align-items-center gap-2 mb-2">
          <h1 className="h2 fw-bold text-dark mb-0">Privacy Policy</h1>
          <Badge bg="success-subtle" text="success-emphasis" className="border">
            GDPR Compliant
          </Badge>
        </div>
        <p className="text-muted small">
          Last updated: November 2026 · Effective immediately for all EventSphere users.
        </p>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4 p-md-5">
          <section className="mb-5">
            <h4 className="fw-bold text-dark mb-3">1. Our Commitment to Your Privacy</h4>
            <p className="text-muted">
              At EventSphere, privacy is not an afterthought; it is built into the architecture
              of our platform. This policy outlines how we collect, process, store, and protect your
              personal information in accordance with the European Union General Data Protection
              Regulation (GDPR) and global privacy standards.
            </p>
          </section>

          <section className="mb-5">
            <h4 className="fw-bold text-dark mb-3">2. Lawful Basis for Processing</h4>
            <p className="text-muted mb-2">
              We process personal data only when there is a lawful basis under Article 6 of the GDPR:
            </p>
            <ul className="text-muted">
              <li>
                <strong>Contractual Necessity:</strong> To fulfill our service agreement (managing your
                expo registrations, session bookings, and exhibitor applications).
              </li>
              <li>
                <strong>Explicit Consent:</strong> For optional communication preferences, marketing
                updates, and analytics tracking.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> To maintain system security, detect fraud, and
                ensure smooth floor plan operations.
              </li>
            </ul>
          </section>

          <section className="mb-5">
            <h4 className="fw-bold text-dark mb-3">3. Data Minimisation & Collection</h4>
            <p className="text-muted">
              We only collect data that is strictly necessary for event management:
            </p>
            <ul className="text-muted">
              <li><strong>Account Information:</strong> Name, verified email address, role, and hashed passwords.</li>
              <li><strong>Exhibitor Details:</strong> Company name, description, assigned booths, and staff contacts.</li>
              <li><strong>Attendee Activity:</strong> Session bookmarks, registered agenda items, and booth inquiries.</li>
              <li><strong>Technical Data:</strong> Anonymized usage events and strictly necessary session cookies.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h4 className="fw-bold text-dark mb-3">4. Data Retention & TTL Limits</h4>
            <p className="text-muted">
              In accordance with storage limitation principles, we enforce automated data expiration:
            </p>
            <ul className="text-muted">
              <li>Notifications auto-expire after <strong>90 days</strong>.</li>
              <li>Analytics events auto-expire after <strong>365 days</strong>.</li>
              <li>Inactive refresh tokens and password reset tokens expire in <strong>30 minutes to 7 days</strong>.</li>
            </ul>
          </section>

          <section className="mb-5">
            <h4 className="fw-bold text-dark mb-3">5. Your Rights as a Data Subject</h4>
            <p className="text-muted mb-3">
              Under GDPR, you have comprehensive rights over your personal data:
            </p>
            <Row className="g-3">
              <Col sm={6}>
                <div className="p-3 bg-light rounded border">
                  <h6 className="fw-bold text-dark mb-1">
                    <i className="bi bi-download text-primary me-2" />
                    Right to Data Portability
                  </h6>
                  <p className="small text-muted mb-0">
                    You can download a complete JSON export of all your profile, applications, tickets,
                    and interactions at any time from your Account Settings.
                  </p>
                </div>
              </Col>
              <Col sm={6}>
                <div className="p-3 bg-light rounded border">
                  <h6 className="fw-bold text-dark mb-1">
                    <i className="bi bi-trash text-danger me-2" />
                    Right to Erasure (Anonymization)
                  </h6>
                  <p className="small text-muted mb-0">
                    You can permanently delete your account. We irreversibly anonymize all PII
                    and deactivate login credentials.
                  </p>
                </div>
              </Col>
              <Col sm={6}>
                <div className="p-3 bg-light rounded border">
                  <h6 className="fw-bold text-dark mb-1">
                    <i className="bi bi-toggle-on text-success me-2" />
                    Right to Withdraw Consent
                  </h6>
                  <p className="small text-muted mb-0">
                    You can grant or withdraw marketing and analytics consent at any time without
                    affecting your core account features.
                  </p>
                </div>
              </Col>
              <Col sm={6}>
                <div className="p-3 bg-light rounded border">
                  <h6 className="fw-bold text-dark mb-1">
                    <i className="bi bi-pencil-square text-info me-2" />
                    Right to Rectification
                  </h6>
                  <p className="small text-muted mb-0">
                    Update your personal details, phone number, and password instantly in your
                    profile settings.
                  </p>
                </div>
              </Col>
            </Row>
          </section>

          <section>
            <h4 className="fw-bold text-dark mb-3">6. Contact Our Data Protection Officer</h4>
            <p className="text-muted mb-0">
              For any questions or formal GDPR requests, please contact our privacy team at{' '}
              <a href="mailto:privacy@eventsphere.local" className="fw-semibold">
                privacy@eventsphere.local
              </a>.
            </p>
          </section>
        </Card.Body>
      </Card>
    </Container>
  );
}
