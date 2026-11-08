/**
 * @fileoverview Admin Floor Plan Builder & Editor Page.
 * Dedicated visual floor plan designer for Draft expos (FR-EXPO-03, FR-EXPO-04).
 * Supports adding booths, integer-snapped dragging and corner resizing,
 * code/property side-panel editing, overlap collision highlighting, and atomic bulk save.
 * Architecture §6.3, Design §7.5, §8. T-3.13.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Row, Col, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { fetchExpoById, fetchExpoBooths, saveFloorPlanBooths } from '../../api/expos.js';
import { FloorPlan } from '../../components/floorplan/FloorPlan.jsx';
import { FloorPlanSidePanel } from '../../components/floorplan/FloorPlanSidePanel.jsx';
import {
  findOverlappingBoothIds,
  findOverlappingPairs,
  findDuplicateCodes,
  generateNextBoothCode,
  findAvailablePosition,
} from '../../components/floorplan/floorplanUtils.js';
import { useToast } from '../../components/ui/index.js';

export default function AdminFloorPlanEditorPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const {
    data: expo,
    isLoading: isExpoLoading,
    isError: isExpoError,
    error: expoError,
  } = useQuery({
    queryKey: ['admin-expo', id],
    queryFn: () => fetchExpoById(id),
    staleTime: 60 * 1000,
  });

  const {
    data: initialBooths,
    isLoading: isBoothsLoading,
    isError: isBoothsError,
    error: boothsError,
  } = useQuery({
    queryKey: ['admin-expo-booths', id],
    queryFn: () => fetchExpoBooths(id),
    staleTime: 0,
  });

  // ── Local Interactive State ─────────────────────────────────────────────────
  const [booths, setBooths] = useState([]);
  const [selectedBoothId, setSelectedBoothId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Synchronize local booths when fetched from server
  useEffect(() => {
    if (initialBooths) {
      setBooths(initialBooths);
      setIsDirty(false);
    }
  }, [initialBooths]);

  // ── Conflict & Validation Analysis ──────────────────────────────────────────
  const overlapIds = useMemo(() => findOverlappingBoothIds(booths), [booths]);
  const overlapPairs = useMemo(() => findOverlappingPairs(booths), [booths]);
  const duplicateCodes = useMemo(() => findDuplicateCodes(booths), [booths]);

  const maxCapacity = expo?.maxBooths || 100;
  const isOverCapacity = booths.length > maxCapacity;
  const hasConflicts = overlapIds.size > 0 || duplicateCodes.size > 0;
  const isDraft = expo?.status === 'draft';

  // ── Selected Booth Reference ────────────────────────────────────────────────
  const selectedBooth = useMemo(() => {
    if (!selectedBoothId) return null;
    return booths.find((b) => (b.id || b._id || b.code) === selectedBoothId) || null;
  }, [booths, selectedBoothId]);

  // ── Save Mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (boothsToSave) => saveFloorPlanBooths(id, boothsToSave),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-expo-booths', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-expo', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-expos'] });
      setIsDirty(false);
      setSaveError('');
      toast?.success?.(`Floor plan saved successfully (${booths.length} booths)!`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save floor plan';
      setSaveError(msg);
      toast?.error?.(msg);
    },
  });

  // ── Interaction Handlers ────────────────────────────────────────────────────
  const handleBoothsChange = (updatedBooths) => {
    setBooths(updatedBooths);
    setIsDirty(true);
  };

  const handleAddBooth = () => {
    if (isOverCapacity) return;

    const nextCode = generateNextBoothCode(booths);
    const pos = findAvailablePosition(booths, 2, 2);

    const newBooth = {
      code: nextCode,
      label: '',
      description: '',
      size: 'medium',
      pricePerDay: 250,
      geometry: { x: pos.x, y: pos.y, w: 2, h: 2 },
      status: 'available',
    };

    const updated = [...booths, newBooth];
    setBooths(updated);
    setSelectedBoothId(nextCode);
    setIsDirty(true);
  };

  const handleUpdateBooth = (updatedBooth) => {
    const updated = booths.map((b) => {
      const bId = b.id || b._id || b.code;
      const targetId = updatedBooth.id || updatedBooth._id || updatedBooth.code;
      return bId === targetId ? updatedBooth : b;
    });
    setBooths(updated);
    setIsDirty(true);
  };

  const handleDeleteBooth = (boothIdentifier) => {
    const updated = booths.filter((b) => {
      const bId = b.id || b._id || b.code;
      return bId !== boothIdentifier;
    });
    setBooths(updated);
    if (selectedBoothId === boothIdentifier) {
      setSelectedBoothId(null);
    }
    setIsDirty(true);
  };

  const handleResetLayout = () => {
    if (initialBooths) {
      setBooths(initialBooths);
      setSelectedBoothId(null);
      setIsDirty(false);
      setSaveError('');
    }
  };

  const handleSave = () => {
    if (!isDraft || hasConflicts || isOverCapacity) return;
    saveMutation.mutate(booths);
  };

  // ── Loading & Error States ──────────────────────────────────────────────────
  if (isExpoLoading || isBoothsLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading floor plan layout…</p>
      </Container>
    );
  }

  if (isExpoError || !expo) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error loading expo</Alert.Heading>
          <p>{expoError?.message || 'Expo not found or unavailable.'}</p>
          <Link to="/admin/expos" className="btn btn-outline-danger btn-sm">
            ← Back to Expos
          </Link>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="admin-floorplan-editor d-flex flex-column gap-3 pb-5">
      {/* ── Top Header & Actions Bar ── */}
      <div className="bg-white border-bottom shadow-sm py-3 px-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          {/* Back link & Title */}
          <div>
            <div className="mb-1">
              <Link
                to="/admin/expos"
                className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1"
              >
                <i className="bi bi-arrow-left" />
                Back to Expos
              </Link>
            </div>
            <div className="d-flex align-items-center gap-2">
              <h4 className="mb-0 fw-bold">{expo.title}</h4>
              <Badge bg={expo.status === 'draft' ? 'secondary' : 'success'} pill>
                {expo.status.toUpperCase()}
              </Badge>
              {isDirty && (
                <Badge bg="warning" text="dark" pill>
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleAddBooth}
              disabled={!isDraft || isOverCapacity}
              className="d-inline-flex align-items-center gap-1"
            >
              <i className="bi bi-plus-lg" />
              Add Booth
            </Button>

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleResetLayout}
              disabled={!isDirty}
              className="d-inline-flex align-items-center gap-1"
            >
              <i className="bi bi-arrow-counterclockwise" />
              Reset
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isDraft || !isDirty || hasConflicts || isOverCapacity || saveMutation.isPending}
              className="d-inline-flex align-items-center gap-1"
            >
              {saveMutation.isPending ? (
                <>
                  <Spinner size="sm" animation="border" />
                  Saving…
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle" />
                  Save Floor Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Container fluid className="px-4">
        {/* ── Status Alerts ── */}
        {!isDraft && (
          <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-lock-fill fs-5" />
            <div>
              <strong>Read-Only Mode:</strong> This expo is currently{' '}
              <strong>{expo.status}</strong>. Floor plans can only be modified when the expo is in{' '}
              <strong>Draft</strong> status. Unpublish this expo to edit the layout.
            </div>
          </Alert>
        )}

        {saveError && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setSaveError('')}
            className="d-flex align-items-center gap-2 mb-3"
          >
            <i className="bi bi-exclamation-triangle-fill" />
            <span>{saveError}</span>
          </Alert>
        )}

        {overlapPairs.length > 0 && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-exclamation-octagon-fill fs-5" />
            <div>
              <strong>Booth Overlap Detected!</strong> The following booths collide:
              <ul className="mb-0 mt-1 ps-3">
                {overlapPairs.map((pair, idx) => (
                  <li key={idx}>
                    Booth <strong>{pair.booth1.code}</strong> overlaps with Booth{' '}
                    <strong>{pair.booth2.code}</strong>
                  </li>
                ))}
              </ul>
              Reposition the booths to resolve overlaps before saving.
            </div>
          </Alert>
        )}

        {duplicateCodes.size > 0 && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-exclamation-diamond-fill fs-5" />
            <div>
              <strong>Duplicate Booth Codes:</strong>{' '}
              {Array.from(duplicateCodes).map((c) => (
                <Badge key={c} bg="danger" className="me-1">
                  {c}
                </Badge>
              ))}
              Each booth must have a unique code.
            </div>
          </Alert>
        )}

        {isOverCapacity && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill fs-5" />
            <div>
              <strong>Capacity Exceeded:</strong> This expo has a limit of {maxCapacity} booths,
              but there are currently {booths.length} booths placed on the canvas.
            </div>
          </Alert>
        )}

        {/* ── Main Layout: Canvas + Side Panel ── */}
        <Row className="g-3">
          {/* Canvas Viewport (Left) */}
          <Col lg={8} xl={9}>
            <div className="bg-white rounded-3 shadow-sm p-3">
              <FloorPlan
                booths={booths}
                mode="edit"
                selectedBoothId={selectedBoothId}
                onSelectBooth={(b) => setSelectedBoothId(b ? b.id || b._id || b.code : null)}
                onBoothsChange={handleBoothsChange}
                onDeleteBooth={handleDeleteBooth}
                overlappingBoothIds={overlapIds}
                height={620}
                showLegend={true}
                showControls={true}
              />
            </div>
          </Col>

          {/* Side Panel Properties Editor (Right) */}
          <Col lg={4} xl={3}>
            <FloorPlanSidePanel
              selectedBooth={selectedBooth}
              onUpdateBooth={handleUpdateBooth}
              onDeleteBooth={handleDeleteBooth}
              onDeselect={() => setSelectedBoothId(null)}
              onAddBooth={handleAddBooth}
              totalBooths={booths.length}
              maxBooths={maxCapacity}
              isOverlapping={
                selectedBooth
                  ? overlapIds.has(selectedBooth.id || selectedBooth._id || selectedBooth.code)
                  : false
              }
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
