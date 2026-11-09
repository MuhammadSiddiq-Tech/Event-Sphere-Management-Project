/**
 * @fileoverview Admin Schedule Manager Page.
 * T-5.5. FR-SCH-01, FR-SCH-02, FR-SCH-03, BR-6.
 *
 * Features:
 *   - Expo picker (if visited via /admin/schedule) or bound to expo (/admin/expos/:id/schedule)
 *   - Day selector tabs (derived from expo start/end dates)
 *   - View mode toggle: Room × Time Grid (Desktop) vs Chronological List (Mobile / Responsive)
 *   - Add / Edit Session Modal with speakers repeater
 *   - Conflict error handling (displays 409 room overlap error from backend)
 *   - Cancel Session flow with mandatory reason
 *   - Hard-delete session with confirmation
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Nav,
  Badge,
  Form,
  ButtonGroup,
  Alert,
  Card as BsCard,
  Dropdown,
} from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPublicExpos, fetchExpoById } from '../../api/expos.js';
import {
  fetchExpoSessions,
  createSession,
  updateSession,
  cancelSession,
  deleteSession,
} from '../../api/sessions.js';
import { SessionModal } from '../../components/admin/SessionModal.jsx';
import { CancelSessionModal } from '../../components/admin/CancelSessionModal.jsx';
import { ScheduleTimeline } from '../../components/schedule/index.js';
import {
  Button,
  StatusPill,
  ConfirmDialog,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui/index.js';
import { formatExpoDateRange } from '../../lib/dateUtils.js';

/** Format time (e.g. "09:00 AM") */
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Compute days between two dates */
function getDaysRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const days = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);
  curr.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (curr <= end) {
    days.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return days;
}

export default function AdminSchedulePage() {
  const { id: urlExpoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selectedExpoId, setSelectedExpoId] = useState(urlExpoId || '');
  const [selectedDay, setSelectedDay] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal states
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Error feedback for modals
  const [modalError, setModalError] = useState('');

  // 1. Fetch expos for expo selector
  const { data: exposData, isLoading: exposLoading } = useQuery({
    queryKey: ['adminExposListForSchedule'],
    queryFn: () => fetchPublicExpos({ limit: 100 }),
    staleTime: 60_000,
  });

  const expos = exposData?.items ?? [];

  // If no expo selected yet, default to first available
  const activeExpoId = selectedExpoId || (expos.length > 0 ? expos[0].id || expos[0]._id : '');

  // 2. Fetch active expo detail
  const { data: activeExpo, isLoading: expoLoading } = useQuery({
    queryKey: ['expoDetailForSchedule', activeExpoId],
    queryFn: () => fetchExpoById(activeExpoId),
    enabled: !!activeExpoId,
    staleTime: 60_000,
  });

  // Calculate day tabs
  const daysList = useMemo(() => {
    return getDaysRange(activeExpo?.startDate, activeExpo?.endDate);
  }, [activeExpo?.startDate, activeExpo?.endDate]);

  // 3. Fetch sessions for active expo
  const queryParams = useMemo(() => {
    const params = { limit: 100 };
    if (selectedDay !== 'all') params.day = selectedDay;
    return params;
  }, [selectedDay]);

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['expoSessions', activeExpoId, queryParams],
    queryFn: () => fetchExpoSessions(activeExpoId, queryParams),
    enabled: !!activeExpoId,
    staleTime: 15_000,
  });

  const sessions = sessionsData?.items ?? [];

  // Extract distinct rooms for grid view columns
  const gridRooms = useMemo(() => {
    const set = new Set();
    sessions.forEach((s) => {
      if (s.room) set.add(s.room);
    });
    if (set.size === 0) set.add('Main Hall');
    return Array.from(set).sort();
  }, [sessions]);

  // Group sessions by room for grid view
  const sessionsByRoom = useMemo(() => {
    const map = {};
    gridRooms.forEach((r) => {
      map[r] = [];
    });
    sessions.forEach((s) => {
      const room = s.room || 'Main Hall';
      if (!map[room]) map[room] = [];
      map[room].push(s);
    });
    // Sort each room's sessions chronologically
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    });
    return map;
  }, [gridRooms, sessions]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload) => createSession(activeExpoId, payload),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['expoSessions', activeExpoId] });
      setSessionModalOpen(false);
      setModalError('');
      addToast({
        title: 'Session Created',
        message: `"${newSession.title}" added to schedule.`,
        variant: 'success',
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create session.';
      setModalError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateSession(editingSession.id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['expoSessions', activeExpoId] });
      setSessionModalOpen(false);
      setEditingSession(null);
      setModalError('');
      addToast({
        title: 'Session Updated',
        message: `"${updated.title}" has been updated.`,
        variant: 'success',
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update session.';
      setModalError(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) =>
      cancelSession(sessionToCancel.id, { cancelledReason: reason }),
    onSuccess: (cancelled) => {
      queryClient.invalidateQueries({ queryKey: ['expoSessions', activeExpoId] });
      setCancelModalOpen(false);
      setSessionToCancel(null);
      setModalError('');
      addToast({
        title: 'Session Cancelled',
        message: `"${cancelled.title}" marked as cancelled.`,
        variant: 'warning',
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to cancel session.';
      setModalError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expoSessions', activeExpoId] });
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
      addToast({
        title: 'Session Deleted',
        message: 'The session was permanently deleted.',
        variant: 'success',
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to delete session.';
      addToast({
        title: 'Delete Failed',
        message: msg,
        variant: 'danger',
      });
    },
  });

  // Modal open handlers
  const handleOpenAdd = () => {
    setEditingSession(null);
    setModalError('');
    setSessionModalOpen(true);
  };

  const handleOpenEdit = (session) => {
    setEditingSession(session);
    setModalError('');
    setSessionModalOpen(true);
  };

  const handleOpenCancel = (session) => {
    setSessionToCancel(session);
    setModalError('');
    setCancelModalOpen(true);
  };

  const handleOpenDelete = (session) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = (payload) => {
    setModalError('');
    if (editingSession) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExpoChange = (newId) => {
    setSelectedExpoId(newId);
    setSelectedDay('all');
    if (urlExpoId) {
      navigate(`/admin/expos/${newId}/schedule`);
    }
  };

  return (
    <Container fluid className="py-4 px-md-4">
      {/* ── Page Header ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h3 fw-bold mb-0 text-dark">Schedule Manager</h1>
            <Badge bg="primary-subtle" text="primary" className="fw-semibold">
              Admin
            </Badge>
          </div>
          <p className="text-muted small mb-0">
            Create, schedule, and resolve session conflicts across rooms and tracks.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Expo selector dropdown */}
          {expos.length > 0 && (
            <Form.Select
              size="sm"
              value={activeExpoId}
              onChange={(e) => handleExpoChange(e.target.value)}
              className="w-auto"
              aria-label="Select expo"
            >
              {expos.map((exp) => (
                <option key={exp.id || exp._id} value={exp.id || exp._id}>
                  Expo: {exp.title}
                </option>
              ))}
            </Form.Select>
          )}

          {/* View Mode Toggle */}
          <ButtonGroup size="sm">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
              onClick={() => setViewMode('grid')}
              title="Room × Time Grid View"
            >
              <i className="bi bi-grid-3x2 me-1" /> Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline-secondary'}
              onClick={() => setViewMode('list')}
              title="Timeline List View"
            >
              <i className="bi bi-list-ul me-1" /> List
            </Button>
          </ButtonGroup>

          {/* Add Session CTA */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            disabled={!activeExpoId}
          >
            <i className="bi bi-plus-lg me-1" /> Add Session
          </Button>
        </div>
      </div>

      {/* ── Active Expo Banner ── */}
      {activeExpo && (
        <div className="bg-white border rounded-3 p-3 mb-4 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded bg-primary-subtle text-primary p-2 d-flex align-items-center justify-content-center">
              <i className="bi bi-calendar3 fs-4" />
            </div>
            <div>
              <div className="fw-bold text-dark">{activeExpo.title}</div>
              <div className="text-muted small d-flex flex-wrap gap-3">
                <span>
                  <i className="bi bi-clock me-1 text-primary" />
                  {formatExpoDateRange(activeExpo.startDate, activeExpo.endDate)}
                </span>
                {activeExpo.venue?.name && (
                  <span>
                    <i className="bi bi-geo-alt me-1 text-danger" />
                    {activeExpo.venue.name}
                  </span>
                )}
                <span>
                  <StatusPill status={activeExpo.status} />
                </span>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link
              to={`/expos/${activeExpo.slug || activeExpoId}`}
              className="btn btn-outline-secondary btn-sm"
              target="_blank"
            >
              <i className="bi bi-box-arrow-up-right me-1" />
              Public View
            </Link>
          </div>
        </div>
      )}

      {/* ── Day Tabs ── */}
      {daysList.length > 0 && (
        <Nav
          variant="pills"
          className="bg-light p-1.5 rounded-3 mb-4 d-flex flex-wrap gap-1"
          activeKey={selectedDay}
          onSelect={(k) => setSelectedDay(k)}
          role="tablist"
        >
          <Nav.Item>
            <Nav.Link eventKey="all" className="fw-semibold px-3 py-2">
              All Days ({sessions.length})
            </Nav.Link>
          </Nav.Item>
          {daysList.map((day, idx) => (
            <Nav.Item key={day}>
              <Nav.Link eventKey={day} className="fw-semibold px-3 py-2">
                Day {idx + 1}
                <span className="d-none d-md-inline ms-1 text-muted small">
                  ({day.slice(5)})
                </span>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}

      {/* ── Content View: Grid or List ── */}
      {sessionsLoading ? (
        <div className="py-4">
          <Skeleton variant="card" className="mb-3" />
          <Skeleton variant="card" className="mb-3" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="bi-calendar-plus"
          title="No Sessions Scheduled Yet"
          message="Start planning this expo schedule by adding keynotes, workshops, or track sessions."
          actionLabel="Add First Session"
          onAction={handleOpenAdd}
        />
      ) : viewMode === 'list' ? (
        /* List View (uses ScheduleTimeline in admin editable mode) */
        <ScheduleTimeline
          expoId={activeExpoId}
          expo={activeExpo}
          isEditable={true}
          onEditSession={handleOpenEdit}
          onCancelSession={handleOpenCancel}
          onDeleteSession={handleOpenDelete}
        />
      ) : (
        /* Room × Time Grid View (Desktop) */
        <div className="schedule-grid-container table-responsive pb-3">
          <Row className="g-3 flex-nowrap" style={{ minWidth: `${gridRooms.length * 280}px` }}>
            {gridRooms.map((room) => {
              const roomSessions = sessionsByRoom[room] || [];
              return (
                <Col key={room} style={{ minWidth: '280px', maxWidth: '380px' }}>
                  {/* Room Column Header */}
                  <div className="bg-light border rounded-3 p-2.5 mb-3 text-center">
                    <div className="fw-bold text-dark d-flex align-items-center justify-content-center gap-1.5">
                      <i className="bi bi-door-open text-primary" />
                      <span>{room}</span>
                    </div>
                    <span className="text-muted small">
                      {roomSessions.length} session{roomSessions.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Sessions in Room */}
                  <div className="d-flex flex-column gap-2.5">
                    {roomSessions.length === 0 ? (
                      <div className="border border-dashed rounded-3 p-4 text-center text-muted small bg-white">
                        <i className="bi bi-calendar2-x d-block fs-4 mb-1 opacity-50" />
                        No sessions in this room
                      </div>
                    ) : (
                      roomSessions.map((session) => {
                        const isCancelled = session.status === 'cancelled';
                        const isUpdated = session.status === 'updated';

                        return (
                          <BsCard
                            key={session.id}
                            className={`border shadow-sm position-relative ${
                              isCancelled
                                ? 'border-danger-subtle bg-danger-subtle bg-opacity-10'
                                : ''
                            }`}
                          >
                            <BsCard.Body className="p-3">
                              {/* Top Bar: Time & Dropdown */}
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="badge bg-light text-dark border px-2 py-1 font-monospace small">
                                  <i className="bi bi-clock me-1 text-primary" />
                                  {formatTime(session.startTime)} – {formatTime(session.endTime)}
                                </span>

                                <Dropdown align="end">
                                  <Dropdown.Toggle
                                    variant="light"
                                    size="sm"
                                    className="p-0 border-0 text-muted"
                                    id={`session-actions-${session.id}`}
                                  >
                                    <i className="bi bi-three-dots-vertical" />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu>
                                    {!isCancelled && (
                                      <Dropdown.Item onClick={() => handleOpenEdit(session)}>
                                        <i className="bi bi-pencil me-2 text-primary" />
                                        Edit Session
                                      </Dropdown.Item>
                                    )}
                                    {!isCancelled && (
                                      <Dropdown.Item
                                        onClick={() => handleOpenCancel(session)}
                                        className="text-warning-emphasis"
                                      >
                                        <i className="bi bi-slash-circle me-2 text-warning" />
                                        Cancel Session
                                      </Dropdown.Item>
                                    )}
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                      onClick={() => handleOpenDelete(session)}
                                      className="text-danger"
                                    >
                                      <i className="bi bi-trash me-2" />
                                      Delete Session
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>

                              {/* Badges: Type, Status, Track */}
                              <div className="d-flex flex-wrap gap-1 mb-2">
                                <StatusPill status={session.type} />
                                {isCancelled && <StatusPill status="cancelled" />}
                                {isUpdated && <StatusPill status="updated" />}
                                {session.track && (
                                  <Badge bg="secondary-subtle" text="secondary" className="fw-normal">
                                    {session.track}
                                  </Badge>
                                )}
                              </div>

                              {/* Title */}
                              <h3
                                className={`h6 fw-bold mb-1.5 ${
                                  isCancelled
                                    ? 'text-decoration-line-through text-muted'
                                    : 'text-dark'
                                }`}
                              >
                                {session.title}
                              </h3>

                              {/* Notice if updated or cancelled */}
                              {isCancelled && session.cancelledReason && (
                                <div className="text-danger small mb-2 fst-italic">
                                  Cancelled: {session.cancelledReason}
                                </div>
                              )}
                              {isUpdated && session.updatedReason && (
                                <div className="text-warning-emphasis small mb-2 fst-italic">
                                  Notice: {session.updatedReason}
                                </div>
                              )}

                              {/* Speakers summary */}
                              {session.speakers && session.speakers.length > 0 && (
                                <div className="text-muted small border-top pt-2 mt-2 d-flex align-items-center gap-1.5">
                                  <i className="bi bi-person text-secondary" />
                                  <span className="text-truncate">
                                    {session.speakers.map((sp) => sp.name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </BsCard.Body>
                          </BsCard>
                        );
                      })
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* ── Session Add / Edit Modal (T-5.5) ── */}
      <SessionModal
        show={sessionModalOpen}
        onHide={() => {
          setSessionModalOpen(false);
          setModalError('');
        }}
        session={editingSession}
        expo={activeExpo}
        defaultDay={selectedDay}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        serverError={modalError}
      />

      {/* ── Cancel Session Modal (T-5.3, T-5.5) ── */}
      <CancelSessionModal
        show={cancelModalOpen}
        onHide={() => {
          setCancelModalOpen(false);
          setModalError('');
        }}
        session={sessionToCancel}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
        isPending={cancelMutation.isPending}
        serverError={modalError}
      />

      {/* ── Delete Session Dialog ── */}
      <ConfirmDialog
        show={deleteDialogOpen}
        onHide={() => setDeleteDialogOpen(false)}
        title="Delete Session"
        message={`Are you sure you want to permanently delete "${sessionToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Session"
        variant="danger"
        onConfirm={() => deleteMutation.mutate(sessionToDelete.id)}
        isPending={deleteMutation.isPending}
      />
    </Container>
  );
}
