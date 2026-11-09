/**
 * @fileoverview Admin Feedback & Support Triage Inbox Page.
 * T-7.12. FR-SYS-02, FR-ADM-01.
 * Admin inbox for reviewing and triaging platform feedback and support requests
 * with status chips and internal notes.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Offcanvas,
  Badge,
  ButtonGroup,
} from 'react-bootstrap';
import { Button, StatusPill, EmptyState, Skeleton, useToast } from '../../components/ui/index.js';
import { fetchFeedbackList, updateFeedbackStatus } from '../../api/feedback.js';
import { formatDateTime, formatDistanceToNow } from '../../lib/dateUtils.js';

export default function AdminFeedbackPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Triage Drawer State
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState('open');
  const [adminNotesToUpdate, setAdminNotesToUpdate] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [page, statusFilter, categoryFilter]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await fetchFeedbackList(params);
      setItems(res.items || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTriage = (item) => {
    setSelectedItem(item);
    setStatusToUpdate(item.status);
    setAdminNotesToUpdate(item.adminNotes || '');
    setDrawerOpen(true);
  };

  const handleSaveTriage = async () => {
    if (!selectedItem) return;
    try {
      setUpdating(true);
      const updated = await updateFeedbackStatus(selectedItem.id, {
        status: statusToUpdate,
        adminNotes: adminNotesToUpdate,
      });

      // Update in local state
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
      );
      setSelectedItem(updated);
      toast?.success?.('Feedback status and notes updated');
      setDrawerOpen(false);
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to update feedback');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Feedback & Support Triage</h1>
          <p className="text-muted small mb-0">
            Review user feedback, triage reported issues, and coordinate resolutions.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={loadFeedback}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {/* Status Filter Tabs */}
            <Col xs={12} md={7}>
              <div className="d-flex flex-wrap gap-1" role="tablist" aria-label="Status filters">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'open', label: 'Open' },
                  { id: 'in_review', label: 'In Review' },
                  { id: 'resolved', label: 'Resolved' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s.id);
                      setPage(1);
                    }}
                    className={`btn btn-sm ${
                      statusFilter === s.id
                        ? 'btn-primary fw-semibold'
                        : 'btn-outline-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Col>

            {/* Category Filter */}
            <Col xs={12} md={5} className="d-flex justify-content-md-end">
              <Form.Select
                size="sm"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                style={{ maxWidth: '200px' }}
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                <option value="suggestion">Suggestions</option>
                <option value="issue">Issues / Bugs</option>
                <option value="support">Support Requests</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Main Content Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton count={5} height={45} className="mb-2" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="bi-inbox"
                title="No feedback found"
                description={
                  statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No feedback entries match your active filters.'
                    : 'No feedback or support requests have been submitted yet.'
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-uppercase text-muted">
                    <th className="ps-4">User</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Message</th>
                    <th>Submitted</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="ps-4">
                        <div className="fw-semibold text-dark">
                          {item.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-muted small">
                          {item.user?.email || '—'}
                          {item.user?.role && (
                            <Badge bg="light" text="dark" className="border ms-1 text-capitalize">
                              {item.user.role}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusPill status={item.category} />
                      </td>
                      <td>
                        <StatusPill status={item.status} />
                      </td>
                      <td>
                        {item.rating ? (
                          <span className="text-warning small d-inline-flex align-items-center gap-1">
                            <i className="bi bi-star-fill" aria-hidden="true"></i>
                            <span className="fw-bold text-dark">{item.rating}</span>/5
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div className="text-truncate text-dark small" title={item.message}>
                          {item.message}
                        </div>
                        {item.adminNotes && (
                          <div className="text-muted small fst-italic text-truncate">
                            <i className="bi bi-chat-left-text me-1" aria-hidden="true"></i>
                            {item.adminNotes}
                          </div>
                        )}
                      </td>
                      <td className="text-muted small text-nowrap">
                        {formatDistanceToNow(item.createdAt) || 'Recent'}
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOpenTriage(item)}
                        >
                          <i className="bi bi-sliders me-1" aria-hidden="true"></i>
                          Triage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <span className="small text-muted">
                Showing {items.length} of {meta.total} feedback entries
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="small align-self-center text-muted px-2">
                  Page {page} of {meta.pages}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= meta.pages || loading}
                  onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Review & Triage Drawer */}
      <Offcanvas
        show={drawerOpen}
        onHide={() => setDrawerOpen(false)}
        placement="end"
        style={{ width: '500px' }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="h5 fw-bold mb-0">Feedback Triage</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {selectedItem && (
            <div className="d-flex flex-column gap-4">
              {/* Submission info */}
              <div className="p-3 bg-light rounded border">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">Reference ID</span>
                  <code className="fw-bold">#{selectedItem.id}</code>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">Submitted By</span>
                  <span className="fw-semibold text-dark">
                    {selectedItem.user?.name} ({selectedItem.user?.role})
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">User Email</span>
                  <span className="small text-dark">{selectedItem.user?.email}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">Submitted At</span>
                  <span className="small text-dark">
                    {formatDateTime(selectedItem.createdAt) || '—'}
                  </span>
                </div>
                {selectedItem.rating && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Rating</span>
                    <span className="text-warning fw-bold">
                      {selectedItem.rating} / 5 Stars
                    </span>
                  </div>
                )}
              </div>

              {/* Category & Status Badges */}
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted">Category:</span>
                <StatusPill status={selectedItem.category} />
                <span className="small text-muted ms-3">Current Status:</span>
                <StatusPill status={selectedItem.status} />
              </div>

              {/* Message */}
              <div>
                <label className="fw-semibold text-dark small mb-1">User Message</label>
                <div className="p-3 bg-white border rounded text-dark small" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedItem.message}
                </div>
              </div>

              {/* Triage controls */}
              <div className="pt-3 border-top">
                <h6 className="fw-bold text-dark mb-3">Triage Actions</h6>
                <Form.Group className="mb-3" controlId="feedback-status-select">
                  <Form.Label className="small fw-semibold text-dark">
                    Update Status
                  </Form.Label>
                  <Form.Select
                    aria-label="Update Status"
                    value={statusToUpdate}
                    onChange={(e) => setStatusToUpdate(e.target.value)}
                  >
                    <option value="open">Open (Unresolved)</option>
                    <option value="in_review">In Review (Under Investigation)</option>
                    <option value="resolved">Resolved (Completed)</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold text-dark">
                    Internal Admin Notes
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Add triage notes, investigation findings, or action taken..."
                    value={adminNotesToUpdate}
                    onChange={(e) => setAdminNotesToUpdate(e.target.value)}
                    maxLength={2000}
                  />
                  <Form.Text className="text-muted small">
                    Notes are only visible to administrators.
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setDrawerOpen(false)}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveTriage}
                    loading={updating}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
}
