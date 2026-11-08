/**
 * @fileoverview ProtectedRoute component for role-based route guarding.
 * Redirects unauthenticated users to /login preserving intended destination.
 * Redirects unauthorized roles to 403 Forbidden.
 * T-2.10. FR-AUTH-03, NFR-SEC-03.
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" role="status">
            <span className="visually-hidden">Loading session...</span>
          </Spinner>
          <p className="mt-3 text-muted">Checking authentication...</p>
        </div>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return children ? children : <Outlet />;
}
