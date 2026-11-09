/**
 * @fileoverview Public & Attendee Schedule Timeline Component.
 * T-5.6. FR-ATT-06.
 *
 * Displays sessions in a chronological timeline grouped by day and time slot.
 * Features:
 *   - Day selector tabs (derived from expo dates)
 *   - Multi-facet filters: Track, Session Type, Room, Text Search
 *   - Session cards with time range, room, track, capacity
 *   - Status chips: Updated (with reason tooltip) & Cancelled (with cancellation banner)
 *   - Speaker list with avatar/initials, name, and organization
 *   - Expandable descriptions & tags
 *   - Empty state when no sessions match filters
 */

import React, { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Nav,
  Badge,
  Form,
  InputGroup,
  Alert,
  Card as BsCard,
  Collapse,
} from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchExpoSessions } from '../../api/sessions.js';
import { StatusPill, Skeleton, EmptyState, Button } from '../ui/index.js';

/**
 * Format ISO datetime into a friendly time string (e.g., "09:30 AM").
 */
function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date string into readable day label (e.g., "Mon, Jun 1").
 */
function formatDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Compute array of calendar days (YYYY-MM-DD) between start and end dates.
 */
function getDaysRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const days = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);

  // Set to midnight UTC for clean calendar comparisons
  curr.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (curr <= end) {
    days.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return days;
}

export default function ScheduleTimeline({
  expoId,
  expo,
  isEditable = false,
  onEditSession,
  onCancelSession,
  onDeleteSession,
  className = '',
}) {
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  // Calculate days for tabs
  const daysList = useMemo(() => {
    return getDaysRange(expo?.startDate, expo?.endDate);
  }, [expo?.startDate, expo?.endDate]);

  // Query sessions for this expo
  const queryParams = useMemo(() => {
    const params = { limit: 100 };
    if (selectedDay !== 'all') params.day = selectedDay;
    if (selectedType) params.type = selectedType;
    if (selectedTrack) params.track = selectedTrack;
    if (selectedRoom) params.room = selectedRoom;
    return params;
  }, [selectedDay, selectedType, selectedTrack, selectedRoom]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expoSessions', expoId, queryParams],
    queryFn: () => fetchExpoSessions(expoId, queryParams),
    enabled: !!expoId,
    staleTime: 30_000,
  });

  const rawSessions = data?.items ?? [];

  // Client-side text search (title, speaker name, description, tags)
  const sessions = useMemo(() => {
    if (!searchQuery.trim()) return rawSessions;
    const q = searchQuery.toLowerCase().trim();
    return rawSessions.filter((s) => {
      const inTitle = s.title?.toLowerCase().includes(q);
      const inDesc = s.description?.toLowerCase().includes(q);
      const inSpeakers = s.speakers?.some(
        (sp) => sp.name?.toLowerCase().includes(q) || sp.org?.toLowerCase().includes(q)
      );
      const inTags = s.tags?.some((t) => t.toLowerCase().includes(q));
      const inRoom = s.room?.toLowerCase().includes(q);
      const inTrack = s.track?.toLowerCase().includes(q);
      return inTitle || inDesc || inSpeakers || inTags || inRoom || inTrack;
    });
  }, [rawSessions, searchQuery]);

  // Extract distinct tracks and rooms from fetched sessions
  const availableTracks = useMemo(() => {
    const set = new Set();
    rawSessions.forEach((s) => {
      if (s.track) set.add(s.track);
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  const availableRooms = useMemo(() => {
    const set = new Set();
    rawSessions.forEach((s) => {
      if (s.room) set.add(s.room);
    });
    return Array.from(set).sort();
  }, [rawSessions]);

  const toggleDescription = (id) => {
    setExpandedDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setSelectedDay('all');
    setSelectedType('');
    setSelectedTrack('');
    setSelectedRoom('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedDay !== 'all' || selectedType || selectedTrack || selectedRoom || searchQuery;

  if (isLoading) {
    return (
      <div className={`py-3 ${className}`}>
        <Skeleton variant="text" width="60%" className="mb-4" />
        <Skeleton variant="card" className="mb-3" />
        <Skeleton variant="card" className="mb-3" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger" className="my-4 d-flex align-items-center justify-content-between">
        <div>
          <i className="bi bi-exclamation-triangle-fill me-2" />
          <span>Failed to load session schedule. {error?.message}</span>
        </div>
        <Button variant="outline-danger" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className={`schedule-timeline ${className}`}>
      {/* ── Day Tabs ── */}
      {daysList.length > 0 && (
        <Nav
          variant="pills"
          className="bg-light p-1.5 rounded-3 mb-4 d-flex flex-wrap gap-1"
          activeKey={selectedDay}
          onSelect={(k) => setSelectedDay(k)}
          role="tablist"
          aria-label="Filter schedule by day"
        >
          <Nav.Item>
            <Nav.Link eventKey="all" className="fw-semibold px-3 py-2">
              All Days
            </Nav.Link>
          </Nav.Item>
          {daysList.map((day, idx) => (
            <Nav.Item key={day}>
              <Nav.Link eventKey={day} className="fw-semibold px-3 py-2">
                Day {idx + 1}
                <span className="d-none d-md-inline ms-1 text-muted small">
                  ({formatDayLabel(day)})
                </span>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-white border rounded-3 p-3 mb-4 shadow-sm">
        <Row className="g-2 align-items-center">
          {/* Search */}
          <Col lg={4} md={6}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-white">
                <i className="bi bi-search text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search title, speaker, keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search schedule"
              />
            </InputGroup>
          </Col>

          {/* Type Filter */}
          <Col lg={2} sm={6}>
            <Form.Select
              size="sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by session type"
            >
              <option value="">All Types</option>
              <option value="keynote">Keynote</option>
              <option value="session">Session</option>
              <option value="workshop">Workshop</option>
            </Form.Select>
          </Col>

          {/* Track Filter */}
          <Col lg={3} sm={6}>
            <Form.Select
              size="sm"
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              aria-label="Filter by track"
            >
              <option value="">All Tracks</option>
              {availableTracks.map((t) => (
                <option key={t} value={t}>
                  Track: {t}
                </option>
              ))}
            </Form.Select>
          </Col>

          {/* Room Filter */}
          <Col lg={2} sm={6}>
            <Form.Select
              size="sm"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              aria-label="Filter by room"
            >
              <option value="">All Rooms</option>
              {availableRooms.map((r) => (
                <option key={r} value={r}>
                  Room: {r}
                </option>
              ))}
            </Form.Select>
          </Col>

          {/* Clear button */}
          {hasActiveFilters && (
            <Col lg={1} xs={12} className="text-lg-end">
              <Button
                variant="outline-secondary"
                size="sm"
                className="w-100"
                onClick={clearFilters}
                title="Reset filters"
              >
                Clear
              </Button>
            </Col>
          )}
        </Row>
      </div>

      {/* ── Sessions List / Timeline ── */}
      {sessions.length === 0 ? (
        <EmptyState
          icon="bi-calendar-x"
          title="No Sessions Found"
          message={
            hasActiveFilters
              ? 'No sessions match the selected filters. Try resetting the filters.'
              : 'The session schedule for this expo will be published soon.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="timeline-container d-flex flex-column gap-3">
          {sessions.map((session) => {
            const isCancelled = session.status === 'cancelled';
            const isUpdated = session.status === 'updated';
            const isDescExpanded = !!expandedDescriptions[session.id];
            const hasLongDesc = (session.description?.length ?? 0) > 160;

            return (
              <BsCard
                key={session.id}
                className={`border shadow-sm transition-all ${
                  isCancelled ? 'border-danger-subtle bg-danger-subtle bg-opacity-10' : ''
                }`}
              >
                <BsCard.Body className="p-3 p-md-4">
                  {/* Top Bar: Time, Type, Status & Admin Actions */}
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      {/* Time pill */}
                      <span className="badge bg-light text-dark border px-2.5 py-1.5 fw-semibold font-monospace small">
                        <i className="bi bi-clock me-1 text-primary" />
                        {formatTime(session.startTime)} – {formatTime(session.endTime)}
                      </span>

                      {/* Session Type */}
                      <StatusPill status={session.type} />

                      {/* Status chip if updated or cancelled */}
                      {isCancelled && <StatusPill status="cancelled" />}
                      {isUpdated && <StatusPill status="updated" />}

                      {/* Track badge */}
                      {session.track && (
                        <Badge bg="secondary-subtle" text="secondary" className="fw-normal">
                          <i className="bi bi-bookmark me-1" />
                          {session.track}
                        </Badge>
                      )}
                    </div>

                    {/* Admin actions (if editable) */}
                    {isEditable && (
                      <div className="d-inline-flex gap-1">
                        {!isCancelled && onEditSession && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => onEditSession(session)}
                            title="Edit session"
                          >
                            <i className="bi bi-pencil" />
                          </Button>
                        )}
                        {!isCancelled && onCancelSession && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => onCancelSession(session)}
                            title="Cancel session"
                          >
                            <i className="bi bi-slash-circle" />
                          </Button>
                        )}
                        {onDeleteSession && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDeleteSession(session)}
                            title="Delete session"
                          >
                            <i className="bi bi-trash" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cancellation Alert Banner */}
                  {isCancelled && (
                    <Alert variant="danger" className="py-2 px-3 mb-2 small d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-octagon-fill" />
                      <div>
                        <strong>Session Cancelled:</strong> {session.cancelledReason || 'No reason provided.'}
                      </div>
                    </Alert>
                  )}

                  {/* Update Reason Banner */}
                  {isUpdated && session.updatedReason && (
                    <Alert variant="warning" className="py-1 px-3 mb-2 small d-flex align-items-center gap-2">
                      <i className="bi bi-info-circle-fill" />
                      <div>
                        <strong>Schedule Notice:</strong> {session.updatedReason}
                      </div>
                    </Alert>
                  )}

                  {/* Title */}
                  <h3
                    className={`h5 fw-bold mb-2 ${
                      isCancelled ? 'text-decoration-line-through text-muted' : 'text-dark'
                    }`}
                  >
                    {session.title}
                  </h3>

                  {/* Description */}
                  {session.description && (
                    <div className="text-secondary small mb-3">
                      <div>
                        {hasLongDesc && !isDescExpanded
                          ? `${session.description.slice(0, 160)}…`
                          : session.description}
                      </div>
                      {hasLongDesc && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-primary fw-semibold small mt-1 text-decoration-none"
                          onClick={() => toggleDescription(session.id)}
                        >
                          {isDescExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Meta details: Room, Capacity, Speakers */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-2 border-top mt-2">
                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
                      {session.room && (
                        <span className="d-inline-flex align-items-center gap-1">
                          <i className="bi bi-geo-alt text-primary" />
                          <strong className="text-dark">{session.room}</strong>
                        </span>
                      )}

                      {session.capacity && (
                        <span className="d-inline-flex align-items-center gap-1">
                          <i className="bi bi-people" />
                          Capacity: {session.capacity}
                        </span>
                      )}

                      {session.tags && session.tags.length > 0 && (
                        <div className="d-inline-flex flex-wrap gap-1">
                          {session.tags.map((tag) => (
                            <Badge key={tag} bg="light" text="dark" className="border fw-normal">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Speakers list */}
                    {session.speakers && session.speakers.length > 0 && (
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted small fw-semibold">Speakers:</span>
                        {session.speakers.map((sp, idx) => (
                          <div
                            key={idx}
                            className="d-inline-flex align-items-center gap-1 bg-light border rounded-pill px-2 py-0.5 small"
                          >
                            {sp.avatarUrl ? (
                              <img
                                src={sp.avatarUrl}
                                alt={sp.name}
                                className="rounded-circle"
                                style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                                style={{ width: '20px', height: '20px', fontSize: '10px' }}
                              >
                                {sp.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="fw-medium text-dark">{sp.name}</span>
                            {sp.org && <span className="text-muted small">({sp.org})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </BsCard.Body>
              </BsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
