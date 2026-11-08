/**
 * @fileoverview Public layout for visitor/guest views and auth pages.
 * T-2.10.
 */

import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';

export default function PublicLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'exhibitor') return '/exhibitor';
    return '/attendee';
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar bg="white" expand="lg" className="border-bottom shadow-sm sticky-top">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold text-primary fs-4 d-flex align-items-center gap-2">
            <i className="bi bi-globe-americas"></i>
            EventSphere
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="public-nav" />
          <Navbar.Collapse id="public-nav">
            <Nav className="me-auto ms-lg-3">
              <Nav.Link as={Link} to="/expos">Expos</Nav.Link>
              <Nav.Link as={Link} to="/privacy">Privacy</Nav.Link>
            </Nav>
            <Nav className="align-items-lg-center gap-2">
              {isAuthenticated ? (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="outline-primary" id="user-menu" className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-circle"></i>
                    <span>{user.name}</span>
                    <span className="badge bg-secondary ms-1">{user.role}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to={getDashboardPath()}>Dashboard</Dropdown.Item>
                    <Dropdown.Item as={Link} to="/profile">Profile & Settings</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <>
                  <Button as={Link} to="/login" variant="outline-primary" size="sm">
                    Log In
                  </Button>
                  <Button as={Link} to="/register" variant="primary" size="sm">
                    Register
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-white border-top py-4 text-center text-muted small">
        <Container>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <div>&copy; {new Date().getFullYear()} EventSphere Management. All rights reserved.</div>
            <div className="d-flex gap-3">
              <Link to="/privacy" className="text-muted text-decoration-none">Privacy Policy</Link>
              <Link to="/help" className="text-muted text-decoration-none">Help & FAQ</Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
