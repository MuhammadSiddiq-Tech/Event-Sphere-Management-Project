/**
 * @fileoverview Exhibitor Dashboard Landing Page.
 * T-4.9.
 * Shows KPI summary tiles (Applications, Approvals, Profile Completeness),
 * quick links, and recent applications list.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, StatusPill } from '../../components/ui/index.js';
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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Welcome, {user?.name}</h1>
          <p className="text-muted mb-0">Exhibitor Hub — manage applications, booths, and company presence.</p>
        </div>
        <Link to="/expos" className="btn btn-primary">
          <i className="bi bi-search me-2"></i>Browse Expos
        </Link>
      </div>

      {/* KPI Tiles */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Profile Completeness</span>
              <span className="badge bg-primary fs-6">{completeness}%</span>
            </div>
            <ProgressBar
              now={completeness}
              variant={completeness >= 80 ? 'success' : completeness >= 50 ? 'warning' : 'danger'}
              style={{ height: '6px' }}
              className="mb-2"
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">Attract more attendees</small>
              <Link to="/exhibitor/profile" className="small text-primary fw-semibold text-decoration-none">
                Edit Profile →
              </Link>
            </div>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Approved Expos</span>
              <i className="bi bi-check-circle-fill text-success fs-4"></i>
            </div>
            <h2 className="fw-bold mb-1">{approvedCount}</h2>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">Eligible for booth selection</small>
              <Link to="/exhibitor/booths" className="small text-primary fw-semibold text-decoration-none">
                Manage Booths →
              </Link>
            </div>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-semibold text-uppercase">Pending Reviews</span>
              <i className="bi bi-hourglass-split text-warning fs-4"></i>
            </div>
            <h2 className="fw-bold mb-1">{pendingCount}</h2>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">Under organizer review</small>
              <Link to="/exhibitor/applications" className="small text-primary fw-semibold text-decoration-none">
                View All →
              </Link>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Applications Card */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
          <span className="fw-bold">
            <i className="bi bi-file-earmark-text me-2 text-primary"></i> Recent Applications
          </span>
          <Link to="/exhibitor/applications" className="btn btn-sm btn-outline-primary">
            View All
          </Link>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-4 text-center text-muted">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-4 text-center text-muted">
              You haven't submitted any expo applications yet.{' '}
              <Link to="/expos">Explore upcoming expos</Link> to apply.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th>Expo Event</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Assigned Booth</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app.id || app._id}>
                      <td className="fw-semibold">
                        <Link
                          to={`/expos/${app.expo?.slug || app.expo?._id || app.expo?.id}`}
                          className="text-decoration-none text-dark"
                        >
                          {app.expo?.title || 'Expo Event'}
                        </Link>
                      </td>
                      <td className="small text-muted">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td>
                        <StatusPill status={app.status} />
                      </td>
                      <td className="small">
                        {app.assignedBooth ? (
                          <span className="text-success fw-semibold">
                            <i className="bi bi-check-circle me-1"></i> Allocated
                          </span>
                        ) : (
                          <span className="text-muted fst-italic">—</span>
                        )}
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/expos/${app.expo?.slug || app.expo?._id || app.expo?.id}`}
                          className="btn btn-sm btn-outline-secondary"
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
