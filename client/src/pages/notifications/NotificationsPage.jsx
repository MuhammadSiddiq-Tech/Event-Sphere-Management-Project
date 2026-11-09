/**
 * @fileoverview Notifications Page — full paginated list of user notifications.
 * T-7.7. FR-SYS-03.
 *
 * Accessible to any authenticated user.
 * Features:
 *  - Tabbed filter: All / Unread
 *  - Paginated list (20 per page)
 *  - Click-to-read (marks single notification read)
 *  - "Mark all read" button
 *  - Empty state with illustration
 *  - Loading skeletons
 *  - Screen-reader live region for status changes
 */

import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Nav, Button, Spinner, Pagination, Alert } from 'react-bootstrap';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications.js';
import { formatDistanceToNow, formatDateTime } from '../../lib/dateUtils.js';
import { Skeleton } from '../../components/ui/index.js';

/** Map notification type → human-readable label + Bootstrap color variant */
const TYPE_META = {
  application_result: { label: 'Application Result', icon: 'bi-clipboard-check', color: 'primary' },
  booth_changed:      { label: 'Booth Update',        icon: 'bi-grid-3x3-gap',   color: 'warning' },
  session_updated:    { label: 'Session Update',      icon: 'bi-calendar-event', color: 'info'    },
  session_reminder:   { label: 'Session Reminder',    icon: 'bi-alarm',          color: 'success' },
  new_message:        { label: 'New Message',         icon: 'bi-chat-dots',      color: 'secondary'},
};

function notifMeta(type) {
  return TYPE_META[type] ?? { label: 'Notice', icon: 'bi-bell', color: 'secondary' };
}

/** Build a human-readable summary from notification type + payload */
function notifSummary(type, payload) {
  switch (type) {
    case 'application_result':
      return payload.status === 'approved'
        ? 'Your exhibitor application was approved!'
        : 'Your exhibitor application was rejected.';
    case 'booth_changed':
      return payload.action === 'assigned'
        ? `Booth ${payload.boothCode ?? ''} has been assigned to you.`
        : `Booth ${payload.boothCode ?? ''} details were updated.`;
    case 'session_updated':
      return payload.action === 'cancelled'
        ? `Session "${payload.sessionTitle ?? 'Session'}" has been cancelled.`
        : `Session "${payload.sessionTitle ?? 'Session'}" has been updated.`;
    case 'session_reminder':
      return `Reminder: "${payload.sessionTitle ?? 'Session'}" starts in 15 minutes.`;
    case 'new_message':
      return 'You have received a new message.';
    default:
      return 'You have a new notification.';
  }
}

/** Skeleton loading placeholder for a single notification row */
function NotificationSkeleton() {
  return (
    <div className="d-flex align-items-start gap-3 p-3 border-bottom">
      <Skeleton width="40px" height="40px" className="rounded-circle flex-shrink-0" />
      <div className="flex-grow-1">
        <Skeleton width="30%" height="14px" className="mb-1" />
        <Skeleton width="80%" height="14px" className="mb-1" />
        <Skeleton width="20%" height="12px" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const queryParams = {
    page,
    limit: 20,
    ...(activeTab === 'unread' ? { unread: 'true' } : {}),
  };

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => fetchNotifications(queryParams),
    keepPreviousData: true,
    staleTime: 15_000,
  });

  const { data: countData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 30_000,
  });
  const unreadCount = countData?.count ?? 0;

  const items = data?.items ?? [];
  const meta = data?.meta ?? {};
  const totalPages = meta.totalPages ?? 1;

  // Mark single read
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  // Mark all read
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  const handleNotifClick = useCallback((notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
  }, [markReadMutation]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Build pagination items
  const paginationItems = [];
  for (let p = 1; p <= totalPages; p++) {
    paginationItems.push(
      <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
        {p}
      </Pagination.Item>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: '800px' }}>
      {/* Page header */}
      <Row className="align-items-center mb-4">
        <Col>
          <h1 className="h3 mb-0 fw-bold">
            <i className="bi bi-bell me-2 text-primary" aria-hidden="true" />
            Notifications
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-2 fs-6 align-middle">
                {unreadCount}
              </span>
            )}
          </h1>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || unreadCount === 0}
            aria-label="Mark all notifications as read"
          >
            {markAllMutation.isPending ? (
              <><Spinner size="sm" animation="border" className="me-1" />Marking…</>
            ) : (
              <><i className="bi bi-check2-all me-1" aria-hidden="true" />Mark all read</>
            )}
          </Button>
        </Col>
      </Row>

      {/* Error state */}
      {isError && (
        <Alert variant="warning" className="mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          Unable to load notifications. Please try again later.
        </Alert>
      )}

      {/* Filter tabs */}
      <Nav
        variant="tabs"
        className="mb-3"
        role="tablist"
        aria-label="Notification filter"
      >
        <Nav.Item>
          <Nav.Link
            active={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            className="cursor-pointer"
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            All
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            active={activeTab === 'unread'}
            onClick={() => handleTabChange('unread')}
            className="cursor-pointer"
            role="tab"
            aria-selected={activeTab === 'unread'}
          >
            Unread
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-1" aria-hidden="true">
                {unreadCount}
              </span>
            )}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Notifications list */}
      <div
        className="bg-white rounded-3 border shadow-sm overflow-hidden"
        role="list"
        aria-label="Notifications list"
        aria-live="polite"
        aria-relevant="additions"
      >
        {/* Loading skeletons */}
        {isLoading && (
          <>
            {[...Array(5)].map((_, i) => <NotificationSkeleton key={i} />)}
          </>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-bell-slash d-block fs-1 mb-2" aria-hidden="true" />
            <p className="mb-0 fw-semibold">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="small">
              {activeTab === 'unread'
                ? "You're all caught up!"
                : 'Notifications about your applications, sessions, and booth will appear here.'}
            </p>
          </div>
        )}

        {/* Notification rows */}
        {!isLoading &&
          items.map((notif) => {
            const meta = notifMeta(notif.type);
            const summary = notifSummary(notif.type, notif.payload ?? {});
            return (
              <div
                key={notif.id}
                role="listitem"
                className={`d-flex align-items-start gap-3 p-3 border-bottom ${
                  notif.isRead ? '' : 'bg-primary bg-opacity-5'
                }`}
                style={{ cursor: notif.isRead ? 'default' : 'pointer' }}
                onClick={() => handleNotifClick(notif)}
                onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(notif)}
                tabIndex={notif.isRead ? -1 : 0}
                aria-label={`${notif.isRead ? '' : 'Unread: '}${summary}. ${
                  notif.createdAt
                    ? formatDistanceToNow(new Date(notif.createdAt))
                    : ''
                }`}
              >
                {/* Icon circle */}
                <div
                  className={`d-flex align-items-center justify-content-center rounded-circle bg-${meta.color} bg-opacity-10 flex-shrink-0`}
                  style={{ width: '44px', height: '44px' }}
                  aria-hidden="true"
                >
                  <i className={`bi ${meta.icon} text-${meta.color} fs-5`} />
                </div>

                {/* Text content */}
                <div className="flex-grow-1 overflow-hidden">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="small fw-semibold text-dark">{meta.label}</span>
                    {!notif.isRead && (
                      <span
                        className="badge bg-primary rounded-pill"
                        style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                        aria-label="Unread"
                      >
                        New
                      </span>
                    )}
                  </div>
                  <p className="mb-1 text-secondary" style={{ fontSize: '0.9rem' }}>
                    {summary}
                  </p>
                  <div className="d-flex gap-3 align-items-center">
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-clock me-1" aria-hidden="true" />
                      {notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt))
                        : ''}
                    </span>
                    {notif.createdAt && (
                      <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.75rem' }}>
                        {formatDateTime(notif.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread dot indicator */}
                {!notif.isRead && (
                  <div className="flex-shrink-0 mt-2">
                    <span
                      className="rounded-circle bg-primary d-block"
                      style={{ width: '8px', height: '8px' }}
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination size="sm" aria-label="Notifications pagination">
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {paginationItems}
            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </Container>
  );
}
