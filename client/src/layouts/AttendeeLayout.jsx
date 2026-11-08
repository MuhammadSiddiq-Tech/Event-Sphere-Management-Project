/**
 * @fileoverview Attendee Dashboard Layout.
 * Tailored navigation for attendees (Agenda, Registrations, Exhibitor Directory, Messages).
 * T-2.10.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Offcanvas, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';

const ATTENDEE_LINKS = [
  { to: '/attendee', label: 'Dashboard', icon: 'bi-speedometer2', exact: true },
  { to: '/attendee/agenda', label: 'My Agenda', icon: 'bi-calendar-check' },
  { to: '/attendee/registrations', label: 'My Tickets & Expos', icon: 'bi-ticket-perforated' },
  { to: '/attendee/exhibitors', label: 'Exhibitor Directory', icon: 'bi-grid' },
  { to: '/attendee/messages', label: 'Messages', icon: 'bi-chat-dots' },
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
            className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? 'bg-primary text-white fw-bold' : 'text-dark'
            }`}
          >
            <i className={`bi ${link.icon}`}></i>
            <span>{link.label}</span>
          </Nav.Link>
        );
      })}
    </Nav>
  );

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar bg="white" className="border-bottom shadow-sm px-3 sticky-top">
        <Container fluid>
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-lg-none"
              onClick={() => setShowMobileNav(true)}
              aria-label="Toggle navigation"
            >
              <i className="bi bi-list fs-5"></i>
            </Button>
            <Link to="/" className="navbar-brand fw-bold text-primary fs-4 d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-globe-americas"></i>
              EventSphere
            </Link>
            <Badge bg="info" className="d-none d-sm-inline-block text-dark">Attendee</Badge>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Dropdown align="end">
              <Dropdown.Toggle variant="light" id="attendee-user-menu" className="d-flex align-items-center gap-2 border">
                <i className="bi bi-person-circle"></i>
                <span className="d-none d-sm-inline">{user?.name}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>{user?.email}</Dropdown.Header>
                <Dropdown.Item as={Link} to="/profile">Profile & Settings</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <i className="bi bi-box-arrow-right me-2"></i>Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Container>
      </Navbar>

      <div className="d-flex flex-grow-1">
        <aside className="d-none d-lg-block bg-white border-end p-3" style={{ width: '260px' }}>
          <div className="text-muted small text-uppercase fw-bold px-3 mb-2">My Event Experience</div>
          {renderNavLinks()}
        </aside>

        <Offcanvas show={showMobileNav} onHide={() => setShowMobileNav(false)} responsive="lg">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title className="fw-bold text-primary">My Event Experience</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <div className="text-muted small text-uppercase fw-bold px-3 mb-2">Navigation</div>
            {renderNavLinks()}
          </Offcanvas.Body>
        </Offcanvas>

        <main className="flex-grow-1 p-3 p-md-4">
          <Container fluid>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}
