/**
 * @fileoverview Exhibitor Dashboard Landing Page.
 * Editorial Swiss-grid workspace view with KPI summary tiles,
 * quick links, and recent applications list.
 * T-4.9.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusPill } from '../../components/ui/index.js';
import { fetchMyApplications } from '../../api/applications.js';
import { fetchMyExhibitorProfile } from '../../api/exhibitors.js';
import { calculateCompleteness } from './ExhibitorProfilePage.jsx';

export default function ExhibitorDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [appsRes, profileRes] = await Promise.allSettled([
        fetchMyApplications({ limit: 5 }),
        fetchMyExhibitorProfile(),
      ]);

      if (appsRes.status === 'fulfilled') {
        setApplications(appsRes.value.items || []);
      }
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value);
      }
    } finally {
      setLoading(false);
    }
  };

  const completeness = profile ? calculateCompleteness(profile) : 0;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div>
      {/* ── Editorial Workspace Header ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <span className="text-uppercase fw-bold text-primary small">
            Exhibitor Workspace
          </span>
          <h1 className="h3 fw-bold mb-1">Welcome, {user?.name || 'Exhibitor'}</h1>
          <p className="text-secondary small mb-0">
            Manage your expo applications, booth allocations, and brand showcase.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link
            to="/exhibitor/profile"
            className="btn btn-outline-dark rounded-pill px-3 fw-semibold"
          >
            <i className="bi bi-briefcase me-2"></i>Company Profile
          </Link>
          <Link
            to="/expos"
            className="btn btn-primary rounded-pill px-4 fw-semibold"
          >
            <i className="bi bi-search me-2"></i>Browse Expos
          </Link>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <Card
            className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Profile Completeness
              </span>
              <span className="badge bg-lime text-dark fw-bold rounded-pill px-3 py-1 font-monospace">
                {completeness}%
              </span>
            </div>
            <ProgressBar
              now={completeness}
              variant={completeness >= 80 ? 'success' : completeness >= 50 ? 'primary' : 'warning'}
              style={{ height: '8px' }}
              className="rounded-pill mb-3"
            />
            <div className="d-flex justify-content-between align-items-center mt-auto pt-1">
              <small className="text-secondary">Attract more visitors</small>
              <Link to="/exhibitor/profile" className="small text-primary fw-bold text-decoration-none">
                Edit Profile &rarr;
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card
            className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Approved Expos
              </span>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="bi bi-check-circle-fill fs-5"></i>
              </div>
            </div>
            <div className="display-6 fw-bold text-dark mb-2">{approvedCount}</div>
            <div className="d-flex justify-content-between align-items-center mt-auto pt-1">
              <small className="text-secondary">Ready for booth selection</small>
              <Link to="/exhibitor/booths" className="small text-primary fw-bold text-decoration-none">
                Manage Booths &rarr;
              </Link>
            </div>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm rounded-4 p-4 h-100 card-hover bg-navy text-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-white-50 small fw-bold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Pending Reviews
              </span>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 bg-white bg-opacity-10 text-lime"
                style={{ width: '38px', height: '38px' }}
              >
                <i className="bi bi-hourglass-split fs-5"></i>
              </div>
            </div>
            <div className="display-6 fw-bold text-white mb-2">{pendingCount}</div>
            <div className="d-flex justify-content-between align-items-center mt-auto pt-1">
              <small className="text-white-50">Under organizer review</small>
              <Link to="/exhibitor/applications" className="small text-lime fw-bold text-decoration-none">
                View Queue &rarr;
              </Link>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Recent Applications Card ── */}
      <Card
        className="border-0 shadow-sm rounded-4 overflow-hidden mb-4"
        style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
      >
        <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary"
              style={{ width: '32px', height: '32px' }}
            >
              <i className="bi bi-file-earmark-text"></i>
            </span>
            <span className="fw-bold text-dark">Recent Expo Applications</span>
          </div>
          <Link to="/exhibitor/applications" className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold">
            View All
          </Link>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-5 text-center text-secondary small">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-5 text-center">
              <div className="text-secondary mb-3">
                You haven&apos;t submitted any expo applications yet.
              </div>
              <Link to="/expos" className="btn btn-primary btn-sm rounded-pill px-4 fw-semibold">
                Explore Upcoming Expos
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-secondary text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  <tr>
                    <th className="ps-4">Expo Event</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Assigned Booth</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app.id || app._id}>
                      <td className="fw-semibold ps-4">
                        <Link
                          to={`/expos/${app.expo?.slug || app.expo?._id || app.expo?.id}`}
                          className="text-decoration-none text-dark"
                        >
                          {app.expo?.title || 'Expo Event'}
                        </Link>
                      </td>
                      <td className="small text-secondary font-monospace">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <StatusPill status={app.status} />
                      </td>
                      <td className="small">
                        {app.assignedBooth ? (
                          <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1 fw-semibold">
                            <i className="bi bi-check-circle me-1"></i> Allocated
                          </span>
                        ) : (
                          <span className="text-secondary fst-italic">—</span>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <Link
                          to={`/expos/${app.expo?.slug || app.expo?._id || app.expo?.id}`}
                          className="btn btn-sm btn-outline-dark rounded-pill px-3"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}