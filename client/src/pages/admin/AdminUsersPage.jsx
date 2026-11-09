/**
 * @fileoverview Admin User Management Page.
 * T-8.7. FR-ADM-01.
 * Lists all registered users across roles with search, role filters,
 * pagination, and account deactivation / reactivation controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Badge,
} from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminUsers,
  deactivateUser,
  reactivateUser,
} from '../../api/admin.js';
import {
  Button,
  StatusPill,
  Skeleton,
  EmptyState,
  ConfirmDialog,
  useToast,
} from '../../components/ui/index.js';
import { formatDate } from '../../lib/dateUtils.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminUsersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  // Dialog state for deactivation / reactivation
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogAction, setDialogAction] = useState(null); // 'deactivate' | 'reactivate'

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', { q: searchQuery, role: roleFilter, active: activeFilter, page }],
    queryFn: () =>
      fetchAdminUsers({
        q: searchQuery,
        role: roleFilter,
        active: activeFilter,
        page,
        limit: 15,
      }),
  });

  const users = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, limit: 15, total: 0, pages: 1 };

  const deactivateMutation = useMutation({
    mutationFn: (userId) => deactivateUser(userId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast?.success?.(`User ${updated.name} has been deactivated.`);
      setSelectedUser(null);
    },
    onError: (err) => {
      toast?.error?.(err.response?.data?.error?.message || err.message || 'Failed to deactivate user');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId) => reactivateUser(userId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast?.success?.(`User ${updated.name} has been reactivated.`);
      setSelectedUser(null);
    },
    onError: (err) => {
      toast?.error?.(err.response?.data?.error?.message || err.message || 'Failed to reactivate user');
    },
  });

  const handleConfirmAction = () => {
    if (!selectedUser) return;
    if (dialogAction === 'deactivate') {
      deactivateMutation.mutate(selectedUser.id || selectedUser._id);
    } else {
      reactivateMutation.mutate(selectedUser.id || selectedUser._id);
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Page Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">User Management</h1>
          <p className="text-muted small mb-0">
            View, search, and manage platform user accounts and access permissions.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {/* Search Input */}
            <Col xs={12} md={5}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <Form.Control
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="border-start-0"
                  aria-label="Search users"
                />
              </div>
            </Col>

            {/* Role Filter */}
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                <option value="attendee">Attendee</option>
                <option value="exhibitor">Exhibitor</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Col>

            {/* Active Status Filter */}
            <Col xs={6} md={4}>
              <Form.Select
                size="sm"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="">All Account Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Deactivated Only</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Main Content Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton count={5} height={45} className="mb-2" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="bi-people"
                title="No users found"
                description="No user accounts matched your search or filter criteria."
              />
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-uppercase text-muted">
                    <th className="ps-4">User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = (u.id || u._id) === currentAdmin?.id;
                    return (
                      <tr key={u.id || u._id}>
                        <td className="ps-4">
                          <div className="fw-semibold text-dark">
                            {u.name} {isSelf && <span className="text-muted small">(You)</span>}
                          </div>
                          <div className="text-muted small">{u.email}</div>
                        </td>
                        <td>
                          <StatusPill status={u.role} />
                        </td>
                        <td>
                          <StatusPill status={u.isActive ? 'active' : 'inactive'} />
                        </td>
                        <td className="text-muted small">{formatDate(u.createdAt)}</td>
                        <td className="text-end pe-4">
                          {isSelf ? (
                            <span className="text-muted small">Current User</span>
                          ) : u.isActive ? (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setDialogAction('deactivate');
                              }}
                            >
                              <i className="bi bi-person-x me-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setDialogAction('reactivate');
                              }}
                            >
                              <i className="bi bi-person-check me-1" />
                              Reactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <span className="small text-muted">
                Showing {users.length} of {meta.total} users
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1 || isLoading}
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
                  disabled={page >= meta.pages || isLoading}
                  onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        show={Boolean(selectedUser)}
        title={dialogAction === 'deactivate' ? 'Deactivate User Account' : 'Reactivate User Account'}
        message={
          dialogAction === 'deactivate'
            ? `Are you sure you want to deactivate ${selectedUser?.name} (${selectedUser?.email})? They will no longer be able to log in or access their account.`
            : `Are you sure you want to reactivate ${selectedUser?.name} (${selectedUser?.email})? They will be able to log in again.`
        }
        confirmText={dialogAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        variant={dialogAction === 'deactivate' ? 'danger' : 'success'}
        onConfirm={handleConfirmAction}
        onHide={() => setSelectedUser(null)}
        loading={deactivateMutation.isPending || reactivateMutation.isPending}
      />
    </Container>
  );
}
