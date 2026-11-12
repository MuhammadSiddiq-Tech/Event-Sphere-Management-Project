/**
 * @fileoverview Admin / Organizer Dashboard Layout.
 * Obsidian Navy Command-Center sidebar + Royal Cobalt & Electric Lime accents.
 * T-2.10.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Offcanvas, Button } from 'react-bootstrap';
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

  const activeLinkObj = ADMIN_LINKS.find((link) =>
    link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to)
  );

  const renderSidebarBrand = () => (
    <div className="px-2 pt-2 pb-4 mb-3 border-bottom border-white border-opacity-10">
      <Link
        to="/"
        className="brand-logo-font text-white text-decoration-none fs-5 d-flex align-items-center gap-2 text-uppercase"
      >
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary text-white flex-shrink-0"
          style={{ width: '30px', height: '30px' }}
        >
          <i className="bi bi-globe-americas" style={{ fontSize: '0.9rem' }}></i>
        </span>
        <span className="text-truncate">
          EventSphere<span className="text-lime">.</span>
        </span>
      </Link>
      <div className="mt-2 d-flex align-items-center gap-2">
        <span
          className="badge bg-lime text-dark fw-bold text-uppercase"
          style={{ fontSize: '0.65rem', letterSpacing: '0.06em' }}
        >
          Admin Console
        </span>
        <span className="text-white-50 small font-monospace" style={{ fontSize: '0.72rem' }}>
          v1.1
        </span>
      </div>
    </div>
  );

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
            className={`d-flex align-items-center gap-3 px-3 py-2 rounded-3 small transition-all ${
              isActive
                ? 'bg-lime text-dark fw-bold shadow-sm'
                : 'text-white-50 fw-medium'
            }`}
          >
            <i
              className={`bi ${link.icon} fs-6 ${
                isActive ? 'text-dark' : 'text-primary'
              }`}
            ></i>
            <span>{link.label}</span>
          </Nav.Link>
        );
      })}
    </Nav>
  );

  return (
    <div className="min-vh-100 d-flex">
      {/* Desktop Obsidian Navy Command Sidebar */}
      <aside
        className="d-none d-lg-flex flex-column bg-navy p-3 flex-shrink-0"
        style={{ width: '270px' }}
      >
        {renderSidebarBrand()}

        <div
          className="text-white-50 text-uppercase fw-semibold px-3 mb-2"
          style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
        >
          Operations &amp; Control
        </div>

        <div className="flex-grow-1 overflow-auto">{renderNavLinks()}</div>

        <div className="mt-4 pt-3 border-top border-white border-opacity-10 px-2">
          <Link
            to="/expos"
            className="btn btn-outline-light btn-sm w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 opacity-75"
          >
            <i className="bi bi-box-arrow-up-right"></i>
            <span>Public View</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer (Offcanvas — only mounted for mobile/tablet) */}
      <Offcanvas
        show={showMobileNav}
        onHide={() => setShowMobileNav(false)}
        className="bg-navy text-white d-lg-none"
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="brand-logo-font text-uppercase fs-5">
            EventSphere<span className="text-lime">.</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-3 d-flex flex-column">
          <div
            className="text-white-50 text-uppercase fw-semibold px-3 mb-2"
            style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            Operations &amp; Control
          </div>
          {renderNavLinks()}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Right Column: Top Bar + Main Command Workspace */}
      <div className="flex-grow-1 d-flex flex-column min-w-0">
        <Navbar
          bg="white"
          className="border-bottom px-3 px-md-4 py-3 sticky-top"
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

              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-dark fs-5">
                    {activeLinkObj?.label || 'Admin Command'}
                  </span>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-none d-sm-inline-flex align-items-center gap-1">
                    <span
                      className="rounded-circle bg-primary d-inline-block"
                      style={{ width: '6px', height: '6px' }}
                    />
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <NotificationBell />
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="light"
                  id="admin-user-menu"
                  className="d-flex align-items-center gap-2 border rounded-pill px-3 py-1 fw-medium"
                >
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-navy text-lime fw-bold"
                    style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                  <span className="d-none d-sm-inline">{user?.name}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 mt-2">
                  <Dropdown.Header className="small">{user?.email}</Dropdown.Header>
                  <Dropdown.Item as={Link} to="/profile">
                    <i className="bi bi-person me-2"></i>My Profile
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

        {/* Main Content Area */}
        <main className="flex-grow-1 p-3 p-md-4">
          <Container fluid className="px-0">
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
}