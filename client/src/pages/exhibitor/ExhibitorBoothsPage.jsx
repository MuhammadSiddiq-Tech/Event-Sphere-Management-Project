/**
 * @fileoverview Exhibitor Booth Management Page.
 * T-4.10. FR-EXP-05, FR-EXP-07.
 * Allows exhibitors to manage their held booths:
 *  - Edit booth showcase blurb, products list, and staff roster.
 *  - View neighboring exhibitors in the same expo for networking (FR-EXP-07).
 *  - Release booth if needed.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Badge, Modal, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Button, StatusPill, ConfirmDialog, EmptyState, useToast } from '../../components/ui/index.js';
import { fetchMyApplications } from '../../api/applications.js';
import { fetchExpoBooths } from '../../api/expos.js';
import { updateBoothDetails, releaseHeldBooth } from '../../api/exhibitors.js';

export default function ExhibitorBoothsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Held booths list: each item has { booth, expo, application, allExpoBooths }
  const [heldBooths, setHeldBooths] = useState([]);
  const [selectedBoothItem, setSelectedBoothItem] = useState(null);

  // Edit details form state
  const [showcase, setShowcase] = useState('');
  const [products, setProducts] = useState([]);
  const [productInput, setProductInput] = useState('');
  const [staff, setStaff] = useState([]);
  const [staffInput, setStaffInput] = useState({ name: '', title: '', email: '' });

  // Release confirmation
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  useEffect(() => {
    loadHeldBooths();
  }, []);

  const loadHeldBooths = async () => {
    try {
      setLoading(true);
      // 1. Fetch user's approved applications
      const appsRes = await fetchMyApplications();
      const approvedApps = (appsRes.items || []).filter(
        (a) => a.status === 'approved' && a.assignedBooth
      );

      const items = [];
      for (const app of approvedApps) {
        const expoId = app.expo?.id || app.expo?._id || app.expo;
        if (!expoId) continue;

        try {
          // Fetch booths for this expo
          const expoBooths = await fetchExpoBooths(expoId);
          const targetBoothId = app.assignedBooth?.id || app.assignedBooth?._id || app.assignedBooth;
          const myBooth = expoBooths.find(
            (b) => (b.id || b._id) === targetBoothId
          );

          if (myBooth) {
            // Find neighbours (other reserved or allocated booths in the same expo)
            const neighbours = expoBooths.filter(
              (b) => (b.id || b._id) !== targetBoothId && (b.status === 'reserved' || b.status === 'allocated')
            );
            items.push({
              booth: myBooth,
              expo: app.expo,
              application: app,
              neighbours,
            });
          }
        } catch (e) {
          console.error('Error fetching booths for expo:', expoId, e);
        }
      }

      setHeldBooths(items);
      if (items.length > 0 && !selectedBoothItem) {
        selectBooth(items[0]);
      }
    } catch (err) {
      toast?.error?.('Failed to load booth data');
    } finally {
      setLoading(false);
    }
  };

  const selectBooth = (item) => {
    setSelectedBoothItem(item);
    const d = item.booth.details || {};
    setShowcase(d.showcase || '');
    setProducts(Array.isArray(d.products) ? d.products : []);
    setStaff(Array.isArray(d.staff) ? d.staff : []);
  };

  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!selectedBoothItem) return;

    try {
      setSaving(true);
      const boothId = selectedBoothItem.booth.id || selectedBoothItem.booth._id;
      const updated = await updateBoothDetails(boothId, {
        showcase,
        products,
        staff,
      });

      toast?.success?.('Booth presentation details updated!');
      // Update in local state
      setHeldBooths((prev) =>
        prev.map((it) =>
          (it.booth.id || it.booth._id) === boothId
            ? { ...it, booth: { ...it.booth, details: updated.details || { showcase, products, staff } } }
            : it
        )
      );
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to save details');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseConfirm = async () => {
    if (!selectedBoothItem) return;
    try {
      setReleasing(true);
      const boothId = selectedBoothItem.booth.id || selectedBoothItem.booth._id;
      await releaseHeldBooth(boothId);
      toast?.success?.('Booth released successfully');
      setShowReleaseModal(false);
      await loadHeldBooths();
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to release booth');
    } finally {
      setReleasing(false);
    }
  };

  // Product tag methods
  const addProduct = () => {
    if (!productInput.trim()) return;
    if (products.includes(productInput.trim())) return;
    setProducts([...products, productInput.trim()]);
    setProductInput('');
  };

  const removeProduct = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  // Staff repeater
  const addStaff = () => {
    if (!staffInput.name.trim()) return;
    setStaff([...staff, { ...staffInput }]);
    setStaffInput({ name: '', title: '', email: '' });
  };

  const removeStaff = (idx) => {
    setStaff(staff.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading booth management...</span>
        </div>
      </Container>
    );
  }

  if (heldBooths.length === 0) {
    return (
      <Container className="py-5">
        <EmptyState
          icon="bi-grid-3x3-gap"
          title="No Booths Held"
          description="You do not currently hold an assigned or reserved booth in any expo. Apply to an expo and reserve a booth space once your application is approved."
          actionLabel="View My Applications"
          onAction={() => (window.location.href = '/exhibitor/applications')}
        />
      </Container>
    );
  }

  const currentBooth = selectedBoothItem?.booth;
  const currentExpo = selectedBoothItem?.expo;
  const currentNeighbours = selectedBoothItem?.neighbours || [];

  return (
    <Container className="py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1">Booth Management</h2>
          <p className="text-muted mb-0">
            Customize booth showcase details, assign on-duty staff, and view neighbouring exhibitors.
          </p>
        </div>
        {heldBooths.length > 1 && (
          <Form.Select
            style={{ maxWidth: '300px' }}
            value={currentBooth?.id || currentBooth?._id}
            onChange={(e) => {
              const found = heldBooths.find(
                (it) => (it.booth.id || it.booth._id) === e.target.value
              );
              if (found) selectBooth(found);
            }}
          >
            {heldBooths.map((it) => (
              <option key={it.booth.id || it.booth._id} value={it.booth.id || it.booth._id}>
                Booth {it.booth.code} — {it.expo?.title || 'Expo'}
              </option>
            ))}
          </Form.Select>
        )}
      </div>

      <Row className="g-4">
        {/* Left Column: Booth Specs & Neighbours */}
        <Col lg={4}>
          {/* Booth Overview Card */}
          <Card className="border-0 shadow-sm p-3 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge bg-primary fs-6">Booth {currentBooth?.code}</span>
              <StatusPill status={currentBooth?.status} />
            </div>
            <h5 className="fw-bold mt-1 mb-1">{currentExpo?.title}</h5>
            <div className="text-muted small mb-3">
              <i className="bi bi-geo-alt me-1"></i>
              Size: <strong className="text-capitalize">{currentBooth?.size}</strong> ({currentBooth?.geometry?.w}×{currentBooth?.geometry?.h}m)
            </div>

            <div className="border-top pt-3 d-flex flex-column gap-2">
              <Link
                to={`/expos/${currentExpo?.slug || currentExpo?._id || currentExpo?.id}`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="bi bi-map me-1"></i> View on Floor Plan
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setShowReleaseModal(true)}
              >
                <i className="bi bi-box-arrow-right me-1"></i> Release This Booth
              </button>
            </div>
          </Card>

          {/* Neighbouring Exhibitors (FR-EXP-07) */}
          <Card className="border-0 shadow-sm p-3">
            <h6 className="fw-bold mb-1">
              <i className="bi bi-people me-1 text-primary"></i> Expo Neighbours ({currentNeighbours.length})
            </h6>
            <p className="text-muted small mb-3">
              Fellow exhibitors with allocated spaces in <strong>{currentExpo?.title}</strong>.
            </p>

            <div className="d-flex flex-column gap-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {currentNeighbours.map((nb) => (
                <div key={nb.id || nb._id} className="p-2 border rounded bg-light small">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Booth {nb.code}</span>
                    <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.65rem' }}>
                      {nb.size}
                    </span>
                  </div>
                  {nb.details?.showcase && (
                    <div className="text-muted mt-1 fst-italic text-truncate">
                      "{nb.details.showcase}"
                    </div>
                  )}
                </div>
              ))}
              {currentNeighbours.length === 0 && (
                <span className="text-muted small fst-italic">No other exhibitors in this expo yet.</span>
              )}
            </div>
          </Card>
        </Col>

        {/* Right Column: Edit Showcase Details (FR-EXP-05) */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-1">Booth Presentation Details</h5>
            <p className="text-muted small mb-4">
              Information entered here is displayed to attendees when they click your booth on the floor plan.
            </p>

            <Form onSubmit={handleSaveDetails}>
              {/* Showcase Message */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Showcase Headline / Promotional Blurb</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="e.g. Visit us for live AI demos, interactive workshops, and exclusive prize giveaways!"
                  value={showcase}
                  onChange={(e) => setShowcase(e.target.value)}
                  maxLength={500}
                />
                <div className="text-end small text-muted mt-1">{showcase.length} / 500</div>
              </Form.Group>

              {/* Featured Products */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Featured Products at this Booth</Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <Form.Control
                    placeholder="Add product or demo title"
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addProduct();
                      }
                    }}
                  />
                  <Button type="button" variant="outline-primary" onClick={addProduct}>
                    Add
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {products.map((p, idx) => (
                    <Badge key={idx} bg="primary" className="p-2 d-flex align-items-center gap-2 fs-6 fw-normal">
                      <span>{p}</span>
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        style={{ fontSize: '0.65rem' }}
                        onClick={() => removeProduct(idx)}
                      />
                    </Badge>
                  ))}
                  {products.length === 0 && (
                    <span className="text-muted small fst-italic">No products showcased.</span>
                  )}
                </div>
              </Form.Group>

              {/* On-Duty Staff */}
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">On-Duty Booth Staff</Form.Label>
                <Row className="g-2 mb-2">
                  <Col md={4}>
                    <Form.Control
                      size="sm"
                      placeholder="Name"
                      value={staffInput.name}
                      onChange={(e) => setStaffInput({ ...staffInput, name: e.target.value })}
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Control
                      size="sm"
                      placeholder="Title"
                      value={staffInput.title}
                      onChange={(e) => setStaffInput({ ...staffInput, title: e.target.value })}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      size="sm"
                      placeholder="Email"
                      value={staffInput.email}
                      onChange={(e) => setStaffInput({ ...staffInput, email: e.target.value })}
                    />
                  </Col>
                  <Col md={1}>
                    <Button type="button" size="sm" variant="outline-primary" onClick={addStaff}>
                      +
                    </Button>
                  </Col>
                </Row>

                <div className="list-group">
                  {staff.map((member, idx) => (
                    <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                      <div>
                        <strong>{member.name}</strong> <span className="text-muted small">({member.title || 'Staff'})</span>
                        {member.email && <div className="text-muted small">{member.email}</div>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeStaff(idx)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </Form.Group>

              {/* Submit */}
              <div className="d-flex justify-content-end">
                <Button type="submit" variant="primary" isLoading={saving}>
                  Save Booth Presentation
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Release Confirmation Dialog */}
      <ConfirmDialog
        show={showReleaseModal}
        title="Release Booth Space?"
        message={`Are you sure you want to release Booth ${currentBooth?.code} in "${currentExpo?.title}"? It will become available for other exhibitors.`}
        confirmText="Release Booth"
        variant="danger"
        loading={releasing}
        onConfirm={handleReleaseConfirm}
        onHide={() => setShowReleaseModal(false)}
      />
    </Container>
  );
}
