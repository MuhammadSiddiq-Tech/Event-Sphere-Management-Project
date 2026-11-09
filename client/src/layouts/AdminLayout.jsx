/**
 * @fileoverview Admin / Organizer Dashboard Layout.
 * Persistent sidebar with navigation to Expos, Applications, Schedules, Analytics, and Users.
 * T-2.10.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Offcanvas, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from '../components/ui/NotificationBell.jsx';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', exact: true },
  { to: '/admin/expos', label: 'Expos & Floor Plans', icon: 'bi-building' },
  { to: '/admin/applications', label: 'Exhibitor Applications', icon: 'bi-clipboard-check' },
  { to: '/admin/schedule', label: 'Schedule Manager', icon: 'bi-calendar3' },
  { to: '/admin/messages', label: 'Support & Chat', icon: 'bi-chat-dots' },
  { to: '/admin/feedback', label: 'Feedback Inbox', icon: 'bi-inbox' },
  { to: '/admin/analytics', label: 'Analytics & Reports', icon: 'bi-graph-up' },
  { to: '/admin/users', label: 'User Management', icon: 'bi-people' },
  { to: '/admin/settings', label: 'Settings', icon: 'bi-gear' },
];

export default function AdminLayout() {
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
      {ADMIN_LINKS.map((link) => {
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
      {/* Top Header */}
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
            <Badge bg="danger" className="d-none d-sm-inline-block">Admin Portal</Badge>
          </div>

          <div className="d-flex align-items-center gap-2">
            <NotificationBell />
            <Dropdown align="end">
              <Dropdown.Toggle variant="light" id="admin-user-menu" className="d-flex align-items-center gap-2 border">
                <i className="bi bi-person-fill-gear"></i>
                <span className="d-none d-sm-inline">{user?.name}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>{user?.email}</Dropdown.Header>
                <Dropdown.Item as={Link} to="/profile">My Profile</Dropdown.Item>
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
        {/* Desktop Sidebar */}
        <aside className="d-none d-lg-block bg-white border-end p-3" style={{ width: '260px' }}>
          <div className="text-muted small text-uppercase fw-bold px-3 mb-2">Management</div>
          {renderNavLinks()}
        </aside>

        {/* Mobile Drawer (Offcanvas) */}
        <Offcanvas show={showMobileNav} onHide={() => setShowMobileNav(false)} responsive="lg">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title className="fw-bold text-primary">EventSphere Admin</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <div className="text-muted small text-uppercase fw-bold px-3 mb-2">Management</div>
            {renderNavLinks()}
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content Area */}
        <main className="flex-grow-1 p-3 p-md-4">
          <Container fluid>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}
