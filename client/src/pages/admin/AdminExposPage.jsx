/**
 * @fileoverview Admin Expos Management Page.
 * Displays all expos (including drafts and cancelled) with search, status filters,
 * publish/unpublish toggles, create/edit modal, and typed-title delete confirmation.
 * T-3.11. FR-EXPO-01, FR-EXPO-02, BR-2, Design §7.3, §7.4.
 */

import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Table,
  Badge,
  InputGroup,
  Form,
  Dropdown,
  Alert,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPublicExpos,
  publishExpo,
  unpublishExpo,
  deleteExpo,
} from '../../api/expos.js';
import { ExpoFormModal } from '../../components/admin/ExpoFormModal.jsx';
import {
  Button,
  StatusPill,
  ConfirmDialog,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui/index.js';
import { formatExpoDateRange } from '../../lib/dateUtils.js';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminExposPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingExpo, setEditingExpo] = useState(null);

  // Delete confirm state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expoToDelete, setExpoToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Action feedback
  const [actionError, setActionError] = useState('');

  // Fetch admin expos
  const queryParams = useMemo(
    () => ({
      q: search,
      status: statusFilter,
      page,
      limit: 50,
      sort: '-createdAt',
    }),
    [search, statusFilter, page]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminExpos', queryParams],
    queryFn: () => fetchPublicExpos(queryParams),
    staleTime: 30_000,
  });

  const expos = data?.items ?? [];
  const pagination = data?.meta ?? {};

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: (id) => publishExpo(id),
    onSuccess: (updatedExpo) => {
      queryClient.invalidateQueries({ queryKey: ['adminExpos'] });
      queryClient.invalidateQueries({ queryKey: ['expos'] });
      addToast({
        title: 'Expo Published',
        message: `"${updatedExpo.title}" is now visible to the public.`,
        variant: 'success',
      });
    },
    onError: (err) => {
      setActionError(
        err.response?.data?.error?.message ||
          'Failed to publish expo. Ensure dates, venue, and at least 1 booth are set.'
      );
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: (id) => unpublishExpo(id),
    onSuccess: (updatedExpo) => {
      queryClient.invalidateQueries({ queryKey: ['adminExpos'] });
      queryClient.invalidateQueries({ queryKey: ['expos'] });
      addToast({
        title: 'Expo Unpublished',
        message: `"${updatedExpo.title}" reverted to Draft status.`,
        variant: 'info',
      });
    },
    onError: (err) => {
      setActionError(
        err.response?.data?.error?.message || 'Failed to unpublish expo.'
      );
    },
  });

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!expoToDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      const expoId = expoToDelete.id || expoToDelete._id;
      await deleteExpo(expoId);
      queryClient.invalidateQueries({ queryKey: ['adminExpos'] });
      queryClient.invalidateQueries({ queryKey: ['expos'] });
      addToast({
        title: 'Expo Deleted',
        message: `"${expoToDelete.title}" was successfully deleted.`,
        variant: 'success',
      });
      setDeleteDialogOpen(false);
      setExpoToDelete(null);
    } catch (err) {
      setActionError(
        err.response?.data?.error?.message ||
          'Cannot delete expo. Active reservations or applications may be blocking deletion.'
      );
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingExpo(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (expo) => {
    setEditingExpo(expo);
    setFormModalOpen(true);
  };

  const handleOpenDelete = (expo) => {
    setExpoToDelete(expo);
    setDeleteDialogOpen(true);
  };

  return (
    <Container fluid className="p-4">
      {/* ── Page Header ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">
            <i className="bi bi-building me-2 text-primary" />
            Expos &amp; Floor Plans
          </h1>
          <p className="text-muted small mb-0">
            Create and manage trade shows, configure floor plans, and control publishing status.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => refetch()}
            icon="bi-arrow-clockwise"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon="bi-plus-lg"
          >
            Create Expo
          </Button>
        </div>
      </div>

      {/* Action error banner */}
      {actionError && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setActionError('')}
          className="d-flex align-items-center gap-2 mb-4"
        >
          <i className="bi bi-exclamation-triangle-fill" />
          <span>{actionError}</span>
        </Alert>
      )}

      {/* ── Filters & Search ── */}
      <div className="bg-white rounded-3 shadow-sm p-3 mb-4">
        <Row className="g-3 align-items-center">
          <Col md={6} lg={4}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-white">
                <i className="bi bi-search text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search by title, description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search expos"
              />
            </InputGroup>
          </Col>

          <Col md={6} lg={4}>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={12} lg={4} className="text-lg-end text-muted small">
            {!isLoading && (
              <span>
                Total: <strong>{pagination.total ?? expos.length}</strong> expos
              </span>
            )}
          </Col>
        </Row>
      </div>

      {/* ── Loading Skeleton ── */}
      {isLoading && (
        <div className="bg-white rounded-3 shadow-sm p-3">
          <Skeleton lines={5} />
        </div>
      )}

      {/* ── Error State ── */}
      {isError && (
        <Alert variant="danger" className="d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-circle-fill" />
          <span>
            Failed to load expos: {error?.response?.data?.error?.message || error?.message}
          </span>
        </Alert>
      )}

      {/* ── Expos Table ── */}
      {!isLoading && !isError && (
        <div className="bg-white rounded-3 shadow-sm overflow-hidden">
          {expos.length === 0 ? (
            <EmptyState
              icon="bi-building-slash"
              title="No expos found"
              description={
                search || statusFilter
                  ? 'No expos match your current filters. Try resetting search or status.'
                  : 'You have not created any expos yet. Click "Create Expo" to get started.'
              }
              actionLabel={!search && !statusFilter ? 'Create Your First Expo' : 'Clear Filters'}
              onAction={
                !search && !statusFilter
                  ? handleOpenCreate
                  : () => {
                      setSearch('');
                      setStatusFilter('');
                      setPage(1);
                    }
              }
              actionIcon={!search && !statusFilter ? 'bi-plus-lg' : 'bi-x-circle'}
            />
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0 text-nowrap">
                <thead className="table-light text-muted small fw-semibold">
                  <tr>
                    <th scope="col" style={{ width: '30%' }}>Expo / Details</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Venue</th>
                    <th scope="col">Status</th>
                    <th scope="col">Capacity</th>
                    <th scope="col" className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expos.map((expo) => {
                    const expoId = expo.id || expo._id;
                    const dateRange = formatExpoDateRange(expo.startDate, expo.endDate);

                    return (
                      <tr key={expoId}>
                        {/* Title & Category */}
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            {expo.bannerUrl ? (
                              <img
                                src={expo.bannerUrl}
                                alt=""
                                className="rounded object-fit-cover flex-shrink-0"
                                style={{ width: '48px', height: '36px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="rounded bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '48px', height: '36px' }}
                              >
                                <i className="bi bi-building fs-6" />
                              </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark">{expo.title}</div>
                              <div className="text-muted small">
                                <span className="font-monospace text-secondary">{expo.slug}</span>
                                {expo.category && (
                                  <Badge bg="secondary" pill className="ms-2 fw-normal small">
                                    {expo.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="small">
                          {dateRange ? (
                            <div>
                              <i className="bi bi-calendar3 me-1 text-muted" />
                              {dateRange}
                            </div>
                          ) : (
                            <span className="text-muted fst-italic">Dates not set</span>
                          )}
                        </td>

                        {/* Venue */}
                        <td className="small">
                          {expo.venue?.city || expo.venue?.country ? (
                            <div>
                              <i className="bi bi-geo-alt me-1 text-muted" />
                              {[expo.venue.name, expo.venue.city, expo.venue.country]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          ) : (
                            <span className="text-muted fst-italic">Venue not set</span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <StatusPill status={expo.status} />
                        </td>

                        {/* Capacity */}
                        <td className="small text-muted">
                          <i className="bi bi-grid me-1" />
                          {expo.maxBooths || 100} booths
                        </td>

                        {/* Actions Dropdown */}
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            {/* Publish / Unpublish shortcuts */}
                            {expo.status === 'draft' && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => publishMutation.mutate(expoId)}
                                loading={
                                  publishMutation.isPending &&
                                  publishMutation.variables === expoId
                                }
                                title="Publish expo"
                              >
                                Publish
                              </Button>
                            )}

                            {expo.status === 'published' && (
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => unpublishMutation.mutate(expoId)}
                                loading={
                                  unpublishMutation.isPending &&
                                  unpublishMutation.variables === expoId
                                }
                                title="Revert to Draft"
                              >
                                Unpublish
                              </Button>
                            )}

                            <Button
                              as={Link}
                              to={`/admin/expos/${expoId}/floor-plan`}
                              variant="outline-primary"
                              size="sm"
                              title="Floor Plan Editor"
                              className="d-none d-md-inline-flex align-items-center"
                            >
                              <i className="bi bi-grid-3x3-gap me-1" />
                              Floor Plan
                            </Button>

                            <Dropdown align="end">
                              <Dropdown.Toggle
                                variant="light"
                                size="sm"
                                className="border py-1 px-2"
                                id={`action-dropdown-${expoId}`}
                              >
                                <i className="bi bi-three-dots-vertical" />
                              </Dropdown.Toggle>

                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleOpenEdit(expo)}>
                                  <i className="bi bi-pencil me-2 text-primary" />
                                  Edit Metadata
                                </Dropdown.Item>

                                <Dropdown.Item as={Link} to={`/admin/expos/${expoId}/floor-plan`}>
                                  <i className="bi bi-grid-3x3-gap me-2 text-primary" />
                                  Floor Plan Editor
                                </Dropdown.Item>

                                <Dropdown.Item as={Link} to={`/expos/${expo.slug || expoId}`}>
                                  <i className="bi bi-box-arrow-up-right me-2 text-muted" />
                                  View Public Page
                                </Dropdown.Item>

                                <Dropdown.Divider />

                                <Dropdown.Item
                                  onClick={() => handleOpenDelete(expo)}
                                  className="text-danger"
                                >
                                  <i className="bi bi-trash me-2" />
                                  Delete Expo
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <ExpoFormModal
        show={formModalOpen}
        onHide={() => setFormModalOpen(false)}
        expo={editingExpo}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['adminExpos'] });
          queryClient.invalidateQueries({ queryKey: ['expos'] });
          addToast({
            title: editingExpo ? 'Expo Updated' : 'Expo Created',
            message: editingExpo
              ? 'Expo details have been saved.'
              : 'New expo created successfully in Draft status.',
            variant: 'success',
          });
        }}
      />

      {/* ── Typed Title Delete Confirmation Dialog ── */}
      <ConfirmDialog
        show={deleteDialogOpen}
        onHide={() => {
          setDeleteDialogOpen(false);
          setExpoToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Expo"
        message={
          <div>
            <p className="text-danger fw-semibold mb-2">
              Warning: This action cannot be undone.
            </p>
            <p className="text-muted small mb-0">
              Deleting this expo will remove all associated booth allocations and configurations.
              Expos with active reservations or confirmed exhibitors may be blocked from deletion.
            </p>
          </div>
        }
        confirmText="Delete Expo"
        variant="danger"
        loading={deleting}
        requiredMatchText={expoToDelete?.title || ''}
      />
    </Container>
  );
}
