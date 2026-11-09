/**
 * @fileoverview Attendee Personal Agenda Page.
 * T-6.9. FR-ATT-08.
 *
 * Displays all sessions the attendee has registered for or bookmarked.
 * Features:
 *   - Filter tabs: All, Registered, Bookmarked
 *   - Change / Cancellation notices (BR-8)
 *   - Grouped by day
 *   - Interactive unregister & unbookmark
 *   - Calendar (.ics) export (T-6.10)
 */

import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Nav,
  Badge,
  Alert,
  Card as BsCard,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyAgenda,
  unregisterFromSession,
  unbookmarkSession,
} from '../../api/attendee.js';
import {
  Button,
  StatusPill,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui/index.js';
import { generateIcsForSession, downloadIcsFile } from '../../lib/calendarExport.js';

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AttendeeAgendaPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'registered' | 'bookmark'

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['myAgendaFull'],
    queryFn: () => fetchMyAgenda({ limit: 100 }),
    staleTime: 15_000,
  });

  const engagements = data?.items ?? [];

  // Filter engagements by tab
  const filteredEngagements = useMemo(() => {
    if (activeTab === 'all') return engagements;
    return engagements.filter((e) => e.kind === activeTab);
  }, [engagements, activeTab]);

  // Group engagements chronologically by day
  const groupedByDay = useMemo(() => {
    const groups = {};
    filteredEngagements.forEach((item) => {
      const session = item.session;
      if (!session) return;
      const dayKey = session.startTime
        ? session.startTime.split('T')[0]
        : 'Undated';
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(item);
    });

    // Sort items within each day by startTime
    Object.keys(groups).forEach((dayKey) => {
      groups[dayKey].sort((a, b) => {
        const tA = new Date(a.session?.startTime || 0).getTime();
        const tB = new Date(b.session?.startTime || 0).getTime();
        return tA - tB;
      });
    });

    return groups;
  }, [filteredEngagements]);

  // ── Mutations ──
  const unregisterMutation = useMutation({
    mutationFn: (sessionId) => unregisterFromSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgendaFull'] });
      addToast({
        title: 'Seat Released',
        message: 'You have unregistered from this session.',
        variant: 'info',
      });
    },
  });

  const unbookmarkMutation = useMutation({
    mutationFn: (sessionId) => unbookmarkSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgendaFull'] });
      addToast({
        title: 'Bookmark Removed',
        message: 'Session removed from wishlist.',
        variant: 'secondary',
      });
    },
  });

  const handleExportIcs = (session, expo) => {
    try {
      const ics = generateIcsForSession(session, expo);
      const safeTitle = (session.title || 'agenda-session')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30);
      downloadIcsFile(`${safeTitle}.ics`, ics);
      addToast({
        title: 'Calendar File Downloaded',
        message: 'Import into Google Calendar or Apple Calendar.',
        variant: 'info',
      });
    } catch (e) {
      addToast({ title: 'Export Failed', message: e.message, variant: 'danger' });
    }
  };

  return (
    <Container fluid className="py-4 px-md-4">
      {/* ── Page Header ── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1 text-dark">My Personal Agenda</h1>
          <p className="text-muted small mb-0">
            Keep track of your registered session seats and bookmarked keynotes.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Link to="/expos" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-calendar3 me-1.5" /> Explore Expos
          </Link>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <Nav
        variant="pills"
        className="bg-light p-1.5 rounded-3 mb-4 d-inline-flex gap-1"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
      >
        <Nav.Item>
          <Nav.Link eventKey="all" className="fw-semibold px-3 py-1.5">
            All Agenda ({engagements.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="registered" className="fw-semibold px-3 py-1.5">
            <i className="bi bi-ticket-perforated me-1" />
            Registered (
            {engagements.filter((e) => e.kind === 'registered').length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="bookmark" className="fw-semibold px-3 py-1.5">
            <i className="bi bi-star me-1" />
            Wishlist (
            {engagements.filter((e) => e.kind === 'bookmark').length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="py-3">
          <Skeleton variant="card" className="mb-3" />
          <Skeleton variant="card" className="mb-3" />
        </div>
      ) : isError ? (
        <Alert variant="danger">Failed to load your agenda. {error?.message}</Alert>
      ) : Object.keys(groupedByDay).length === 0 ? (
        <EmptyState
          icon="bi-calendar-check"
          title="Your Agenda is Empty"
          message={
            activeTab === 'all'
              ? 'You have not registered or bookmarked any sessions yet. Browse expo schedules to build your agenda!'
              : `You have no ${activeTab} sessions.`
          }
          actionLabel="Browse Expos"
          onAction={() => (window.location.href = '/expos')}
        />
      ) : (
        <div className="d-flex flex-column gap-4">
          {Object.entries(groupedByDay).map(([dayKey, items]) => (
            <div key={dayKey}>
              {/* Day Header Banner */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-calendar2-day text-primary fs-5" />
                <h2 className="h6 fw-bold mb-0 text-dark">
                  {formatDateHeader(items[0]?.session?.startTime)}
                </h2>
                <Badge bg="light" text="dark" className="border fw-normal small ms-2">
                  {items.length} session{items.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {/* Sessions in this day */}
              <div className="d-flex flex-column gap-3">
                {items.map((item) => {
                  const session = item.session;
                  if (!session) return null;

                  const isCancelled = session.status === 'cancelled';
                  const isUpdated = session.status === 'updated';
                  const isRegistered = item.kind === 'registered';

                  return (
                    <BsCard
                      key={item.id}
                      className={`border shadow-sm ${
                        isCancelled
                          ? 'border-danger-subtle bg-danger-subtle bg-opacity-10'
                          : ''
                      }`}
                    >
                      <BsCard.Body className="p-3.5">
                        {/* Top: Time, Type, Kind Badge & Actions */}
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            {/* Time */}
                            <span className="badge bg-light text-dark border px-2.5 py-1.5 font-monospace small fw-semibold">
                              <i className="bi bi-clock me-1 text-primary" />
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </span>

                            <StatusPill status={session.type} />

                            {/* Kind badge */}
                            {isRegistered ? (
                              <Badge bg="success-subtle" text="success-emphasis" className="fw-semibold">
                                <i className="bi bi-check-circle me-1" />
                                Registered Seat
                              </Badge>
                            ) : (
                              <Badge bg="warning-subtle" text="warning-emphasis" className="fw-semibold">
                                <i className="bi bi-star-fill me-1" />
                                Bookmarked
                              </Badge>
                            )}

                            {isCancelled && <StatusPill status="cancelled" />}
                            {isUpdated && <StatusPill status="updated" />}
                          </div>

                          {/* Quick Actions */}
                          <div className="d-flex align-items-center gap-1.5">
                            {/* Calendar .ics Export (T-6.10) */}
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="px-2"
                              onClick={() => handleExportIcs(session, item.expo)}
                              title="Add to Calendar (.ics)"
                            >
                              <i className="bi bi-calendar-plus me-1" /> .ics
                            </Button>

                            {/* Remove action */}
                            {isRegistered ? (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => unregisterMutation.mutate(session.id || session._id)}
                                loading={unregisterMutation.isPending}
                                title="Release registered seat"
                              >
                                Release Seat
                              </Button>
                            ) : (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => unbookmarkMutation.mutate(session.id || session._id)}
                                loading={unbookmarkMutation.isPending}
                                title="Remove bookmark"
                              >
                                <i className="bi bi-x-lg" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Cancellation Notice Banner (BR-8) */}
                        {isCancelled && (
                          <Alert variant="danger" className="py-2 px-3 mb-2 small d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-octagon-fill" />
                            <div>
                              <strong>Session Cancelled:</strong> {session.cancelledReason || 'No reason provided.'}
                            </div>
                          </Alert>
                        )}

                        {/* Update Notice Banner */}
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
                          className={`h6 fw-bold mb-1.5 ${
                            isCancelled
                              ? 'text-decoration-line-through text-muted'
                              : 'text-dark'
                          }`}
                        >
                          {session.title}
                        </h3>

                        {/* Meta details */}
                        <div className="d-flex flex-wrap align-items-center gap-3 text-muted small mt-2">
                          {item.expo && (
                            <Link
                              to={`/expos/${item.expo.slug || item.expo.id || item.expo._id}`}
                              className="text-primary text-decoration-none fw-medium"
                            >
                              <i className="bi bi-building me-1" />
                              {item.expo.title}
                            </Link>
                          )}

                          {session.room && (
                            <span>
                              <i className="bi bi-geo-alt me-1 text-danger" />
                              {session.room}
                            </span>
                          )}

                          {session.speakers?.length > 0 && (
                            <span>
                              <i className="bi bi-person me-1" />
                              {session.speakers.map((s) => s.name).join(', ')}
                            </span>
                          )}
                        </div>
                      </BsCard.Body>
                    </BsCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
