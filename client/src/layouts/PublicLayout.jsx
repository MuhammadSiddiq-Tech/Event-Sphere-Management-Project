/**
 * @fileoverview Public layout for visitor/guest views and auth pages.
 * T-2.10.
 */

import React from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from '../components/ui/NotificationBell.jsx';

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
    <div className="min-vh-100 d-flex flex-column">
      {/* Editorial Top Navigation */}
      <Navbar
        expand="lg"
        className="bg-white border-bottom py-3 sticky-top"
        style={{ borderColor: 'rgba(10, 17, 40, 0.08)' }}
      >
        <Container>
          <Navbar.Brand
            as={Link}
            to="/"
            className="brand-logo-font text-dark fs-4 d-flex align-items-center gap-2 text-uppercase"
          >
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary text-white"
              style={{ width: '34px', height: '34px' }}
            >
              <i className="bi bi-globe-americas fs-6"></i>
            </span>
            <span>
              EventSphere<span className="text-primary">.</span>
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="public-nav" className="border-0 shadow-none" />

          <Navbar.Collapse id="public-nav">
            <Nav className="mx-auto gap-lg-3 my-2 my-lg-0">
              <Nav.Link
                as={NavLink}
                to="/expos"
                className="fw-medium text-dark px-3"
              >
                Explore Expos
              </Nav.Link>
              <Nav.Link
                as={NavLink}
                to="/privacy"
                className="fw-medium text-secondary px-3"
              >
                Privacy
              </Nav.Link>
            </Nav>

            <Nav className="align-items-lg-center gap-2">
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <Dropdown align="end">
                    <Dropdown.Toggle
                      variant="light"
                      id="user-menu"
                      className="d-flex align-items-center gap-2 border rounded-pill px-3 py-1 fw-medium"
                    >
                      <i className="bi bi-person-circle text-primary"></i>
                      <span>{user.name}</span>
                      <span className="badge bg-lime text-uppercase" style={{ fontSize: '0.68rem' }}>
                        {user.role}
                      </span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow border-0 mt-2">
                      <Dropdown.Item as={Link} to={getDashboardPath()} className="fw-medium">
                        <i className="bi bi-grid-1x2 me-2 text-primary"></i>Dashboard
                      </Dropdown.Item>
                      <Dropdown.Item as={Link} to="/profile">
                        <i className="bi bi-gear me-2"></i>Profile & Settings
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={handleLogout} className="text-danger">
                        <i className="bi bi-box-arrow-right me-2"></i>Logout
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              ) : (
                <>
                  <Button
                    as={Link}
                    to="/login"
                    variant="link"
                    className="text-dark text-decoration-none fw-semibold px-3"
                  >
                    Log In
                  </Button>
                  <Button
                    as={Link}
                    to="/register"
                    variant="primary"
                    className="rounded-pill px-4 py-2 fw-semibold"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content */}
      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* Deep Obsidian Navy Editorial Footer */}
      <footer className="bg-navy py-5 mt-auto">
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-4 pb-4 border-bottom border-secondary border-opacity-25">
            <div>
              <Link
                to="/"
                className="brand-logo-font text-white text-decoration-none fs-4 text-uppercase d-inline-flex align-items-center gap-2"
              >
                EventSphere<span className="text-lime">.</span>
              </Link>
              <p className="text-white-50 small mb-0 mt-1">
                Live expo discovery, interactive floor plans, and seamless event management.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-4 small fw-medium">
              <Link to="/expos" className="text-white text-decoration-none">
                Browse Expos
              </Link>
              <Link to="/privacy" className="text-white-50 text-decoration-none">
                Privacy Policy
              </Link>
              <Link to="/help" className="text-white-50 text-decoration-none">
                Help & FAQ
              </Link>
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 pt-3 small text-white-50">
            <div>&copy; {new Date().getFullYear()} EventSphere Management. All rights reserved.</div>
            <div>Built for live global exhibitions.</div>
          </div>
        </Container>
      </footer>
    </div>
  );
}