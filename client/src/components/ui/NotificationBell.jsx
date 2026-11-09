/**
 * @fileoverview NotificationBell — header icon with animated unread badge.
 * T-7.7. FR-SYS-03.
 *
 * Shows a bell icon with an unread count badge. Clicking opens a dropdown
 * of the latest notifications with mark-as-read actions. A "View all" link
 * goes to /notifications. Badge pulses when new notifications arrive via
 * the notification:new socket event (via query invalidation in SocketContext).
 *
 * Uses @tanstack/react-query for data fetching (queryKey: ['unreadNotificationsCount']).
 * Keeps the component accessible: role="button", aria-label, aria-haspopup.
 */

import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Dropdown, Badge, Spinner } from 'react-bootstrap';
import {
  fetchUnreadNotificationCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications.js';
import { formatDistanceToNow } from '../../lib/dateUtils.js';

/** Map notification type → human-readable label + Bootstrap color variant */
const TYPE_META = {
  application_result: { label: 'Application', icon: 'bi-clipboard-check', color: 'primary' },
  booth_changed:      { label: 'Booth',        icon: 'bi-grid-3x3-gap',   color: 'warning' },
  session_updated:    { label: 'Session',       icon: 'bi-calendar-event', color: 'info'    },
  session_reminder:   { label: 'Reminder',      icon: 'bi-alarm',          color: 'success' },
  new_message:        { label: 'Message',       icon: 'bi-chat-dots',      color: 'secondary'},
};

function notifMeta(type) {
  return TYPE_META[type] ?? { label: 'Notice', icon: 'bi-bell', color: 'secondary' };
}

/** Build a human-readable summary from notification type + payload */
function notifSummary(type, payload) {
  switch (type) {
    case 'application_result':
      return payload.status === 'approved'
        ? 'Your application was approved!'
        : `Your application was rejected.`;
    case 'booth_changed':
      return payload.action === 'assigned'
        ? `Booth ${payload.boothCode ?? ''} was assigned to you.`
        : `Booth ${payload.boothCode ?? ''} details were updated.`;
    case 'session_updated':
      return payload.action === 'cancelled'
        ? `Session "${payload.sessionTitle ?? 'Session'}" was cancelled.`
        : `Session "${payload.sessionTitle ?? 'Session'}" was updated.`;
    case 'session_reminder':
      return `Reminder: "${payload.sessionTitle ?? 'Session'}" starts soon.`;
    case 'new_message':
      return 'You have a new message.';
    default:
      return 'You have a new notification.';
  }
}

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  // Unread count — lightweight poll every 60 s (supplemented by socket push)
  const { data: countData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unreadCount = countData?.count ?? 0;

  // Preview: latest 5 notifications for the dropdown
  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications', { page: 1, limit: 5 }],
    queryFn: () => fetchNotifications({ page: 1, limit: 5 }),
    staleTime: 30_000,
  });
  const previewItems = notifData?.items ?? [];

  // Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
    },
  });

  const handleNotifClick = (notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
  };

  const handleMarkAll = (e) => {
    e.stopPropagation();
    markAllReadMutation.mutate();
  };

  // Track count change for a brief visual pulse on new arrivals
  const isNew = unreadCount > prevCountRef.current;
  useEffect(() => {
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <Dropdown align="end" className="d-inline-block">
      <Dropdown.Toggle
        as="button"
        className="btn btn-link position-relative p-1 text-secondary border-0"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="true"
        id="notification-bell-toggle"
      >
        <i className={`bi bi-bell fs-5${isNew ? ' text-primary' : ''}`} aria-hidden="true" />
        {unreadCount > 0 && (
          <Badge
            pill
            bg="danger"
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.6rem', minWidth: '1.2em' }}
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu
        className="shadow-sm"
        style={{ minWidth: '340px', maxWidth: '400px' }}
        aria-labelledby="notification-bell-toggle"
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <span className="fw-semibold text-dark">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="btn btn-link btn-sm p-0 text-muted text-decoration-none small"
              onClick={handleMarkAll}
              disabled={markAllReadMutation.isPending}
              aria-label="Mark all notifications as read"
            >
              {markAllReadMutation.isPending ? (
                <Spinner size="sm" animation="border" />
              ) : (
                'Mark all read'
              )}
            </button>
          )}
        </div>

        {/* Notification list */}
        <div style={{ maxHeight: '340px', overflowY: 'auto' }} role="list">
          {notifLoading && (
            <div className="text-center py-4 text-muted small">
              <Spinner size="sm" animation="border" className="me-2" />
              Loading…
            </div>
          )}

          {!notifLoading && previewItems.length === 0 && (
            <div className="text-center py-4 text-muted small">
              <i className="bi bi-bell-slash d-block fs-3 mb-1" aria-hidden="true" />
              No notifications yet
            </div>
          )}

          {!notifLoading &&
            previewItems.map((notif) => {
              const meta = notifMeta(notif.type);
              return (
                <div
                  key={notif.id}
                  role="listitem"
                  className={`d-flex align-items-start gap-2 px-3 py-2 border-bottom ${
                    notif.isRead ? 'opacity-75' : 'bg-primary bg-opacity-5'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNotifClick(notif)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(notif)}
                  tabIndex={0}
                  aria-label={`${notif.isRead ? '' : 'Unread: '}${notifSummary(notif.type, notif.payload ?? {})}`}
                >
                  {/* Icon */}
                  <span className={`text-${meta.color} mt-1`} aria-hidden="true">
                    <i className={`bi ${meta.icon} fs-5`} />
                  </span>

                  {/* Content */}
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex align-items-center gap-1 mb-0">
                      <span className="small fw-semibold text-dark">
                        {meta.label}
                      </span>
                      {!notif.isRead && (
                        <span
                          className="rounded-circle bg-primary"
                          style={{ width: '6px', height: '6px', display: 'inline-block' }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className="mb-0 small text-secondary text-truncate">
                      {notifSummary(notif.type, notif.payload ?? {})}
                    </p>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>
                      {notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt))
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer — link to full notifications page */}
        <div className="text-center py-2 border-top">
          <Dropdown.Item
            as={Link}
            to="/notifications"
            className="small text-primary text-decoration-none d-inline"
          >
            View all notifications
          </Dropdown.Item>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
