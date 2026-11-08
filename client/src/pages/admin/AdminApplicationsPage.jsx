/**
 * @fileoverview Admin Applications Management Page.
 * T-4.11. FR-EXH-01, FR-EXH-02, FR-EXH-03.
 * Lists exhibitor applications across expos with status filters and text search,
 * and features a Review Drawer to approve (with optional booth assignment) or reject
 * (with mandatory reason).
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Table, Offcanvas, Alert, Badge } from 'react-bootstrap';
import { Button, StatusPill, EmptyState, useToast } from '../../components/ui/index.js';
import {
  fetchAdminApplications,
  approveApplication,
  rejectApplication,
} from '../../api/applications.js';
import { fetchExpoBooths } from '../../api/expos.js';

export default function AdminApplicationsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Drawer state
  const [selectedApp, setSelectedApp] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [availableBooths, setAvailableBooths] = useState([]);
  const [loadingBooths, setLoadingBooths] = useState(false);

  // Review actions state
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [selectedBoothId, setSelectedBoothId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [statusFilter, searchQuery]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await fetchAdminApplications(params);
      setApplications(res.items || []);
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = async (app) => {
    setSelectedApp(app);
    setDrawerOpen(true);
    setReviewAction('approve');
    setSelectedBoothId('');
    setReviewNote('');
    setRejectionReason('');

    // If pending, fetch available booths for this expo for auto-assignment
    const expoId = app.expo?._id || app.expo?.id || app.expo;
    if (expoId && app.status === 'pending') {
      try {
        setLoadingBooths(true);
        const booths = await fetchExpoBooths(expoId);
        setAvailableBooths(booths.filter((b) => b.status === 'available'));
      } catch (e) {
        setAvailableBooths([]);
      } finally {
        setLoadingBooths(false);
      }
    } else {
      setAvailableBooths([]);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      setSubmittingReview(true);
      const appId = selectedApp.id || selectedApp._id;
      const payload = {};
      if (selectedBoothId) payload.boothId = selectedBoothId;
      if (reviewNote.trim()) payload.reviewNote = reviewNote.trim();

      await approveApplication(appId, payload);
      toast?.success?.('Application approved successfully!');
      setDrawerOpen(false);
      await loadApplications();
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Approval failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectionReason.trim()) {
      toast?.error?.('Rejection reason is required.');
      return;
    }

    try {
      setSubmittingReview(true);
      const appId = selectedApp.id || selectedApp._id;
      const payload = {
        reason: rejectionReason.trim(),
      };
      if (reviewNote.trim()) payload.reviewNote = reviewNote.trim();

      await rejectApplication(appId, payload);
      toast?.success?.('Application rejected.');
      setDrawerOpen(false);
      await loadApplications();
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Rejection failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Exhibitor Applications</h2>
          <p className="text-muted mb-0">
            Triage, review, approve, and allocate booth spaces for expo applications.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm p-3 mb-4">
        <Row className="g-3 align-items-center">
          <Col md={5}>
            <Form.Control
              placeholder="Search company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col md={7} className="d-flex gap-2 flex-wrap justify-content-md-end">
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
          </Col>
        </Row>
      </Card>

      {/* Applications Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading applications...</span>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-5 text-center">
              <EmptyState
                icon="bi-inbox"
                title="No applications found"
                description={
                  statusFilter !== 'all' || searchQuery
                    ? 'No applications match your current filters. Try resetting the search or filter.'
                    : 'No exhibitor applications have been submitted yet.'
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light small">
                  <tr>
                    <th>Company</th>
                    <th>Expo Event</th>
                    <th>Applicant</th>
                    <th>Preferred Size</th>
                    <th>Status</th>
                    <th>Assigned Booth</th>
                    <th>Applied</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const snap = app.companySnapshot || {};
                    const exhibitor = app.exhibitor || {};
                    const pref = app.boothPreferences?.[0] || {};
                    const isPending = app.status === 'pending';

                    return (
                      <tr key={app.id || app._id}>
                        <td className="fw-bold">{snap.companyName || exhibitor.name || 'Company'}</td>
                        <td>{app.expo?.title || 'Expo'}</td>
                        <td className="small text-muted">{exhibitor.email || '—'}</td>
                        <td className="text-capitalize small">{pref.size || '—'}</td>
                        <td>
                          <StatusPill status={app.status} />
                        </td>
                        <td className="small">
                          {app.assignedBooth?.code ? (
                            <Badge bg="success">Booth {app.assignedBooth.code}</Badge>
                          ) : (
                            <span className="text-muted fst-italic">—</span>
                          )}
                        </td>
                        <td className="small text-muted">{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant={isPending ? 'primary' : 'outline-secondary'}
                            onClick={() => handleOpenReview(app)}
                          >
                            {isPending ? 'Review' : 'View'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Review Offcanvas Drawer */}
      <Offcanvas
        show={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        placement="end"
        style={{ width: '560px' }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold fs-5">
            Application Review: {selectedApp?.companySnapshot?.companyName || selectedApp?.exhibitor?.name}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4">
          {selectedApp && (
            <div>
              {/* Status Header */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">Current Status:</span>
                <StatusPill status={selectedApp.status} />
              </div>

              {/* Company Details Snapshot */}
              <Card className="bg-light border-0 p-3 mb-4">
                <h6 className="fw-bold text-uppercase small text-muted mb-2">Company Overview</h6>
                <div className="small mb-1">
                  <strong>Expo:</strong> {selectedApp.expo?.title}
                </div>
                <div className="small mb-1">
                  <strong>Category:</strong> {selectedApp.companySnapshot?.category || 'Not specified'}
                </div>
                <div className="small mb-1">
                  <strong>Website:</strong>{' '}
                  {selectedApp.companySnapshot?.website ? (
                    <a href={selectedApp.companySnapshot.website} target="_blank" rel="noreferrer">
                      {selectedApp.companySnapshot.website}
                    </a>
                  ) : (
                    'None'
                  )}
                </div>
                {selectedApp.companySnapshot?.description && (
                  <p className="small text-muted mt-2 mb-0">
                    {selectedApp.companySnapshot.description}
                  </p>
                )}
              </Card>

              {/* Booth Preferences */}
              <Card className="bg-light border-0 p-3 mb-4">
                <h6 className="fw-bold text-uppercase small text-muted mb-2">Booth Preferences</h6>
                <div className="small mb-1">
                  <strong>Preferred Size:</strong>{' '}
                  <span className="text-capitalize">{selectedApp.boothPreferences?.[0]?.size || 'None'}</span>
                </div>
                {selectedApp.boothPreferences?.[0]?.notes && (
                  <div className="small text-muted mt-1">
                    <strong>Special Requirements:</strong> {selectedApp.boothPreferences[0].notes}
                  </div>
                )}
                {selectedApp.reviewNote && (
                  <div className="small text-muted mt-1">
                    <strong>Applicant Note:</strong> {selectedApp.reviewNote}
                  </div>
                )}
              </Card>

              {/* Attached Documents */}
              {Array.isArray(selectedApp.documents) && selectedApp.documents.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold small text-muted text-uppercase mb-2">Attached Documents</h6>
                  <div className="list-group">
                    {selectedApp.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="list-group-item list-group-item-action d-flex align-items-center gap-2 small"
                      >
                        <i className="bi bi-file-earmark-pdf text-danger fs-5"></i>
                        <span>{doc.filename || `Document ${idx + 1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection notice if already rejected */}
              {selectedApp.status === 'rejected' && (
                <Alert variant="danger">
                  <strong>Rejection Reason:</strong> {selectedApp.rejectionReason}
                </Alert>
              )}

              {/* Action Area: ONLY for pending applications */}
              {selectedApp.status === 'pending' && (
                <div className="border-top pt-4">
                  <h6 className="fw-bold mb-3">Decision</h6>
                  <div className="btn-group w-100 mb-4" role="group">
                    <button
                      type="button"
                      className={`btn ${reviewAction === 'approve' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setReviewAction('approve')}
                    >
                      <i className="bi bi-check-lg me-1"></i> Approve
                    </button>
                    <button
                      type="button"
                      className={`btn ${reviewAction === 'reject' ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => setReviewAction('reject')}
                    >
                      <i className="bi bi-x-lg me-1"></i> Reject
                    </button>
                  </div>

                  {reviewAction === 'approve' && (
                    <div>
                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">
                          Assign Booth Space (Optional)
                        </Form.Label>
                        <Form.Select
                          value={selectedBoothId}
                          onChange={(e) => setSelectedBoothId(e.target.value)}
                          disabled={loadingBooths}
                        >
                          <option value="">Do not assign now (exhibitor will reserve later)</option>
                          {availableBooths.map((b) => (
                            <option key={b.id || b._id} value={b.id || b._id}>
                              Booth {b.code} ({b.size}) — ${b.pricePerDay || b.price}/day
                            </option>
                          ))}
                        </Form.Select>
                        <small className="text-muted d-block mt-1">
                          Selecting a booth will automatically mark it as allocated to this exhibitor.
                        </small>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">Approval Note to Exhibitor</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Welcome to the event! Your booth is confirmed."
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                        />
                      </Form.Group>

                      <Button
                        variant="success"
                        className="w-100"
                        isLoading={submittingReview}
                        onClick={handleApprove}
                      >
                        Confirm Approval
                      </Button>
                    </div>
                  )}

                  {reviewAction === 'reject' && (
                    <div>
                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">
                          Rejection Reason <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="State the reason for rejection (e.g. Exhibitor profile incomplete, products out of scope for this event)"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">Internal Review Note (Optional)</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Internal admin note"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                        />
                      </Form.Group>

                      <Button
                        variant="danger"
                        className="w-100"
                        isLoading={submittingReview}
                        onClick={handleReject}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
}
