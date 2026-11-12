/**
 * @fileoverview Attendee Dashboard Layout.
 * Crisp Light Workspace Sidebar + Royal Cobalt & Electric Lime accents.
 * T-2.10.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Offcanvas, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from '../components/ui/NotificationBell.jsx';

const ATTENDEE_LINKS = [
  { to: '/attendee', label: 'Pass Hub', icon: 'bi-grid-1x2', exact: true },
  { to: '/attendee/agenda', label: 'My Agenda', icon: 'bi-calendar-check' },
  { to: '/attendee/registrations', label: 'My Tickets & Expos', icon: 'bi-ticket-perforated' },
  { to: '/attendee/exhibitors', label: 'Exhibitor Directory', icon: 'bi-building' },
  { to: '/attendee/messages', label: 'Messages', icon: 'bi-chat-dots' },
  { to: '/attendee/feedback', label: 'Feedback & Support', icon: 'bi-chat-heart' },
];

export default function AttendeeLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavLinks = () => (
    <Nav className="flex-column gap-1">
      {ATTENDEE_LINKS.map((link) => {
        const isActive = link.exact
          ? location.pathname === link.to
          : location.pathname.startsWith(link.to);
        return (
          <Nav.Link
            key={link.to}
            as={Link}
            to={link.to}
            onClick={() => setShowMobileNav(false)}
            className={`d-flex align-items-center gap-3 px-3 py-2 rounded-3 small transition-all ${
              isActive
                ? 'bg-primary text-white fw-bold shadow-sm'
                : 'text-dark fw-medium'
            }`}
          >
            <i className={`bi ${link.icon} fs-6 ${isActive ? 'text-lime' : 'text-primary'}`}></i>
            <span>{link.label}</span>
          </Nav.Link>
        );
      })}
    </Nav>
  );

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Slim Top Header */}
      <Navbar
        bg="white"
        className="border-bottom px-3 px-md-4 py-2 sticky-top"
        style={{ borderColor: 'rgba(10, 17, 40, 0.08)' }}
      >
        <Container fluid className="px-0">
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-dark"
              size="sm"
              className="d-lg-none rounded-2"
              onClick={() => setShowMobileNav(true)}
              aria-label="Toggle navigation"
            >
              <i className="bi bi-list fs-5"></i>
            </Button>

            <Link
              to="/"
              className="brand-logo-font text-dark text-decoration-none fs-5 d-flex align-items-center gap-2 text-uppercase"
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary text-white flex-shrink-0"
                style={{ width: '30px', height: '30px' }}
              >
                <i className="bi bi-globe-americas" style={{ fontSize: '0.9rem' }}></i>
              </span>
              <span>
                EventSphere<span className="text-primary">.</span>
              </span>
            </Link>

            <span
              className="badge bg-navy text-lime fw-bold text-uppercase d-none d-sm-inline-block px-3 py-1 rounded-pill"
              style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}
            >
              Attendee Pass
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link
              to="/expos"
              className="btn btn-lime btn-sm rounded-pill px-3 fw-semibold d-none d-md-inline-flex align-items-center gap-1"
            >
              <i className="bi bi-compass"></i> Explore Expos
            </Link>

            <NotificationBell />

            <Dropdown align="end">
              <Dropdown.Toggle
                variant="light"
                id="attendee-user-menu"
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-1 fw-medium"
              >
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-navy text-lime fw-bold"
                  style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="d-none d-sm-inline">{user?.name}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow border-0 mt-2">
                <Dropdown.Header className="small">{user?.email}</Dropdown.Header>
                <Dropdown.Item as={Link} to="/profile">
                  <i className="bi bi-gear me-2"></i>Profile &amp; Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <i className="bi bi-box-arrow-right me-2"></i>Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Container>
      </Navbar>

      {/* Body: Left Sidebar + Main Content */}
      <div className="d-flex flex-grow-1">
        <aside
          className="d-none d-lg-flex flex-column bg-white border-end p-3 flex-shrink-0"
          style={{ width: '250px' }}
        >
          <div
            className="text-secondary text-uppercase fw-bold px-3 mb-2"
            style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            My Event Experience
          </div>
          <div className="flex-grow-1">{renderNavLinks()}</div>
        </aside>

        {/* Mobile Drawer */}
        <Offcanvas
          show={showMobileNav}
          onHide={() => setShowMobileNav(false)}
          className="d-lg-none"
        >
          <Offcanvas.Header closeButton className="border-bottom">
            <Offcanvas.Title className="brand-logo-font text-uppercase fs-5">
              EventSphere<span className="text-primary">.</span>
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <div
              className="text-secondary text-uppercase fw-bold px-3 mb-2"
              style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
            >
              My Event Experience
            </div>
            {renderNavLinks()}
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Workspace */}
        <main className="flex-grow-1 p-3 p-md-4 min-w-0">
          <Container fluid className="px-0">
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}