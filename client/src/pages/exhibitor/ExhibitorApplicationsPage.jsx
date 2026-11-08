/**
 * @fileoverview Exhibitor Applications Management Page.
 * T-4.9. FR-EXP-08.
 * Displays all applications submitted by the logged-in exhibitor with status badges,
 * withdrawal capability for pending applications, rejection reasons, and booth links.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Button, StatusPill, ConfirmDialog, EmptyState, useToast } from '../../components/ui/index.js';
import { fetchMyApplications, withdrawApplication } from '../../api/applications.js';

export default function ExhibitorApplicationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawingApp, setWithdrawingApp] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetchMyApplications();
      setApplications(res.items || []);
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawingApp) return;
    try {
      setWithdrawing(true);
      await withdrawApplication(withdrawingApp.id || withdrawingApp._id);
      toast?.success?.('Application withdrawn successfully');
      setWithdrawingApp(null);
      await loadApplications();
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  return (
    <Container className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Expos & Applications</h2>
          <p className="text-muted mb-0">
            Track submission statuses, withdraw pending requests, or proceed to booth reservation.
          </p>
        </div>
        <Link to="/expos" className="btn btn-primary">
          <i className="bi bi-compass me-1"></i> Browse Upcoming Expos
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 overflow-auto pb-2">
        {['all', 'pending', 'approved', 'rejected', 'withdrawn'].map((st) => (
          <button
            key={st}
            type="button"
            className={`btn btn-sm text-capitalize px-3 rounded-pill ${
              statusFilter === st ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading applications...</span>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <EmptyState
          icon="bi-file-earmark-text"
          title="No applications found"
          description={
            statusFilter === 'all'
              ? "You haven't submitted any expo applications yet. Explore our published expos to get started!"
              : `No applications with status "${statusFilter}".`
          }
          actionLabel="Browse Expos"
          onAction={() => (window.location.href = '/expos')}
        />
      ) : (
        <Row className="g-3">
          {filteredApps.map((app) => {
            const expo = app.expo || {};
            const isPending = app.status === 'pending';
            const isApproved = app.status === 'approved';
            const isRejected = app.status === 'rejected';

            return (
              <Col xs={12} key={app.id || app._id}>
                <Card className="border-0 shadow-sm p-3">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h5 className="fw-bold mb-0">
                          <Link
                            to={`/expos/${expo.slug || expo._id || expo.id}`}
                            className="text-decoration-none text-dark"
                          >
                            {expo.title || 'Expo Event'}
                          </Link>
                        </h5>
                        <StatusPill status={app.status} />
                      </div>

                      <div className="text-muted small d-flex flex-wrap gap-3 mb-2">
                        {expo.startDate && (
                          <span>
                            <i className="bi bi-calendar3 me-1"></i>
                            {new Date(expo.startDate).toLocaleDateString()} –{' '}
                            {new Date(expo.endDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          <i className="bi bi-clock me-1"></i>
                          Applied on: {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                        {app.assignedBooth && (
                          <span className="text-success fw-semibold">
                            <i className="bi bi-check-circle me-1"></i>
                            Booth Assigned
                          </span>
                        )}
                      </div>

                      {/* Rejection notice */}
                      {isRejected && app.rejectionReason && (
                        <Alert variant="danger" className="py-2 px-3 small mb-2">
                          <strong>Rejection Reason:</strong> {app.rejectionReason}
                        </Alert>
                      )}

                      {/* Review note */}
                      {app.reviewNote && (
                        <p className="small text-muted mb-1">
                          <em>Note from organizer:</em> "{app.reviewNote}"
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="d-flex gap-2 align-items-center">
                      {isPending && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => setWithdrawingApp(app)}
                        >
                          <i className="bi bi-x-circle me-1"></i> Withdraw
                        </Button>
                      )}

                      {isApproved && (
                        <Link
                          to={`/expos/${expo.slug || expo._id || expo.id}`}
                          className="btn btn-sm btn-success"
                        >
                          <i className="bi bi-grid me-1"></i> Select / View Booth
                        </Link>
                      )}

                      <Link
                        to={`/expos/${expo.slug || expo._id || expo.id}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Expo Details
                      </Link>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Confirmation Dialog for Withdrawing */}
      <ConfirmDialog
        show={Boolean(withdrawingApp)}
        title="Withdraw Application?"
        message={`Are you sure you want to withdraw your application for "${
          withdrawingApp?.expo?.title || 'this expo'
        }"? This cannot be undone.`}
        confirmText="Withdraw Application"
        variant="danger"
        loading={withdrawing}
        onConfirm={handleWithdrawConfirm}
        onHide={() => setWithdrawingApp(null)}
      />
    </Container>
  );
}
