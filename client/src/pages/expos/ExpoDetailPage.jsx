/**
 * @fileoverview Expo Detail Page — public/authenticated view.
 * Editorial Swiss-grid design with Obsidian Navy hero, pill tab navigation,
 * and elevated event details & digital pass card.
 * T-3.10. FR-ATT-01, Design §7.11.
 */

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Nav,
  Tab,
  Alert,
  Button,
  Spinner,
} from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchExpoById, fetchExpoBySlug, fetchExpoBooths, reserveBooth } from '../../api/expos.js';
import { StatusPill, Skeleton, useToast } from '../../components/ui/index.js';
import { FloorPlan, BoothReservationModal } from '../../components/floorplan/index.js';
import { ScheduleTimeline } from '../../components/schedule/index.js';
import { ExhibitorsDirectory } from '../../components/exhibitor/ExhibitorsDirectory.jsx';
import { TicketModal } from '../../components/attendee/TicketModal.jsx';
import { registerForExpo, fetchMyExpoRegistration } from '../../api/attendee.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtimeExpo } from '../../context/SocketContext.jsx';
import { formatExpoDateRange, formatDate, relativeDays } from '../../lib/dateUtils.js';

/** Determine if the idOrSlug param looks like a MongoDB ObjectId */
function isObjectId(str) {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

/** Expo detail tabs */
const TABS = [
  { key: 'overview', label: 'Overview', icon: 'bi-info-circle' },
  { key: 'schedule', label: 'Schedule', icon: 'bi-calendar3' },
  { key: 'exhibitors', label: 'Exhibitors', icon: 'bi-briefcase' },
  { key: 'floorplan', label: 'Floor Plan', icon: 'bi-diagram-3' },
];

export default function ExpoDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Fetch expo by id or slug
  const {
    data: expo,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['expo', idOrSlug],
    queryFn: () =>
      isObjectId(idOrSlug) ? fetchExpoById(idOrSlug) : fetchExpoBySlug(idOrSlug),
    staleTime: 60_000,
  });

  const expoActualId = expo?.id || expo?._id;

  // Real-time updates subscription for expo, booths, and schedule (T-7.3, T-7.4)
  useRealtimeExpo(expoActualId);

  // Check attendee registration status (T-6.5)
  const { data: registrationData } = useQuery({
    queryKey: ['myExpoRegistration', expoActualId],
    queryFn: () => fetchMyExpoRegistration(expoActualId),
    enabled: !!isAuthenticated && !!expoActualId,
    staleTime: 30_000,
  });

  const isRegisteredForExpo = Boolean(registrationData?.registered);
  const ticketCode = registrationData?.ticketCode;

  // Expo Registration Mutation (T-6.5)
  const registerForExpoMutation = useMutation({
    mutationFn: () => registerForExpo(expoActualId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myExpoRegistration', expoActualId] });
      queryClient.invalidateQueries({ queryKey: ['myExpoRegistrations'] });
      setTicketModalOpen(true);
      addToast({
        title: 'Registration Confirmed!',
        message: 'Your official event entry pass has been issued.',
        variant: 'success',
      });
    },
    onError: (err) => {
      addToast({
        title: 'Registration Error',
        message: err.response?.data?.error?.message || err.message || 'Could not register for expo.',
        variant: 'danger',
      });
    },
  });

  // Fetch booths for floor plan tab (lazy when tab is selected)
  const { data: booths = [], isLoading: boothsLoading } = useQuery({
    queryKey: ['expoBooths', expo?.id ?? expo?._id],
    queryFn: () => fetchExpoBooths(expo?.id ?? expo?._id),
    enabled: !!expo && activeTab === 'floorplan',
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Container className="py-5">
        <Skeleton variant="card" className="mb-4" />
        <Skeleton lines={5} />
      </Container>
    );
  }

  if (isError) {
    const is404 = error?.response?.status === 404;
    return (
      <Container className="py-5 text-center">
        <div className="mb-4">
          <i className={`bi ${is404 ? 'bi-calendar-x' : 'bi-exclamation-triangle'} display-1 text-secondary`} aria-hidden="true" />
        </div>
        <h1 className="h3 fw-bold">{is404 ? 'Expo Not Found' : 'Failed to Load'}</h1>
        <p className="text-secondary mb-4">
          {is404
            ? 'This expo does not exist or is no longer available.'
            : (error?.response?.data?.error?.message || 'Something went wrong. Please try again.')}
        </p>
        <div className="d-flex justify-content-center gap-2">
          <Button variant="primary" as={Link} to="/expos" className="rounded-pill px-4">
            <i className="bi bi-arrow-left me-1" /> Browse Expos
          </Button>
          {!is404 && (
            <Button variant="outline-dark" onClick={() => navigate(0)} className="rounded-pill px-4">
              <i className="bi bi-arrow-clockwise me-1" /> Retry
            </Button>
          )}
        </div>
      </Container>
    );
  }

  const {
    id,
    _id,
    title,
    bannerUrl,
    description,
    category,
    tags = [],
    status,
    startDate,
    endDate,
    venue = {},
    maxBooths,
  } = expo;

  const expoId = id || _id;
  const dateRange = formatExpoDateRange(startDate, endDate);
  const relativeStart = startDate ? relativeDays(startDate) : null;

  return (
    <div>
      {/* ── Editorial Obsidian Navy Hero Banner ── */}
      <div
        className="position-relative bg-navy overflow-hidden text-white"
        style={{
          minHeight: '280px',
          backgroundImage:
            'radial-gradient(circle at 85% 20%, rgba(0, 87, 255, 0.35), transparent 50%), radial-gradient(circle at 10% 85%, rgba(217, 249, 91, 0.12), transparent 40%)',
        }}
      >
        {bannerUrl && (
          <img
            src={bannerUrl}
            alt={`${title} banner`}
            className="w-100 h-100 position-absolute top-0 start-0"
            style={{ objectFit: 'cover', opacity: 0.25 }}
          />
        )}

        <Container className="position-relative py-5">
          {/* Back link */}
          <Link
            to="/expos"
            className="d-inline-flex align-items-center gap-2 text-white-50 text-decoration-none mb-4 small fw-medium"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to Directory
          </Link>

          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <StatusPill status={status} />
            {category && (
              <span
                className="badge bg-lime text-dark fw-bold text-uppercase px-3 py-1 rounded-pill"
                style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}
              >
                {category}
              </span>
            )}
          </div>

          <h1
            className="text-white fw-bold display-5 mb-3"
            style={{ letterSpacing: '-0.03em' }}
          >
            {title}<span className="text-lime">.</span>
          </h1>

          <div className="d-flex flex-wrap gap-3 gap-md-4 text-white-50 small">
            {dateRange && (
              <span className="d-inline-flex align-items-center gap-1">
                <i className="bi bi-calendar3 text-lime" aria-hidden="true" />
                <strong className="text-white">{dateRange}</strong>
                {relativeStart && <span>· {relativeStart}</span>}
              </span>
            )}
            {(venue.city || venue.country) && (
              <span className="d-inline-flex align-items-center gap-1">
                <i className="bi bi-geo-alt text-lime" aria-hidden="true" />
                <strong className="text-white">
                  {[venue.name, venue.city, venue.country].filter(Boolean).join(', ')}
                </strong>
              </span>
            )}
            {maxBooths && (
              <span className="d-inline-flex align-items-center gap-1">
                <i className="bi bi-grid text-lime" aria-hidden="true" />
                <span>Up to {maxBooths} booths</span>
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="badge bg-white bg-opacity-10 text-white border border-white border-opacity-15 rounded-pill px-3 py-1 small fw-normal"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </Container>
      </div>

      {/* ── Pill Workspace Tabs + Content ── */}
      <Container className="py-4 py-md-5">
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          {/* Editorial Pill Tab Navigation */}
          <div className="mb-4 overflow-auto pb-1">
            <Nav
              variant="pills"
              className="d-inline-flex flex-nowrap gap-1 bg-white p-1 rounded-pill shadow-sm border"
            >
              {TABS.map((tab) => {
                const isSelected = activeTab === tab.key;
                return (
                  <Nav.Item key={tab.key}>
                    <Nav.Link
                      eventKey={tab.key}
                      className={`d-flex align-items-center gap-2 rounded-pill px-3 px-md-4 py-2 small fw-semibold text-nowrap transition-all ${
                        isSelected ? 'bg-primary text-white shadow-sm' : 'text-secondary'
                      }`}
                    >
                      <i className={`bi ${tab.icon}`} aria-hidden="true" />
                      <span>{tab.label}</span>
                    </Nav.Link>
                  </Nav.Item>
                );
              })}
            </Nav>
          </div>

          <Tab.Content>
            {/* ── Overview ── */}
            <Tab.Pane eventKey="overview">
              <Row className="g-4">
                <Col lg={8}>
                  <div
                    className="bg-white rounded-4 shadow-sm p-4 p-md-5 h-100"
                    style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
                  >
                    <span className="text-uppercase fw-bold text-primary small">
                      Exhibition Brief
                    </span>
                    <h2 className="h4 fw-bold mt-1 mb-3">About This Expo</h2>
                    {description ? (
                      <p className="text-secondary lh-lg mb-0" style={{ whiteSpace: 'pre-line' }}>
                        {description}
                      </p>
                    ) : (
                      <p className="text-secondary fst-italic mb-0">No description provided.</p>
                    )}
                  </div>
                </Col>

                <Col lg={4}>
                  <div
                    className="bg-white rounded-4 shadow-sm p-4 d-flex flex-column gap-3"
                    style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
                  >
                    <h3 className="h5 fw-bold mb-1">Event Logistics</h3>

                    {dateRange && (
                      <div className="p-3 rounded-3 bg-ice">
                        <div className="text-secondary small fw-semibold mb-1">
                          <i className="bi bi-calendar3 text-primary me-2" aria-hidden="true" />
                          Dates
                        </div>
                        <div className="fw-bold text-dark">{dateRange}</div>
                        {startDate && (
                          <div className="text-secondary small">
                            {formatDate(startDate, 'EEEE, MMMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    )}

                    {(venue.name || venue.address || venue.city) && (
                      <div className="p-3 rounded-3 bg-ice">
                        <div className="text-secondary small fw-semibold mb-1">
                          <i className="bi bi-geo-alt text-primary me-2" aria-hidden="true" />
                          Venue Location
                        </div>
                        {venue.name && <div className="fw-bold text-dark">{venue.name}</div>}
                        {venue.address && <div className="text-secondary small">{venue.address}</div>}
                        <div className="text-secondary small">
                          {[venue.city, venue.country].filter(Boolean).join(', ')}
                        </div>
                        {venue.coordinates?.lat && venue.coordinates?.lng && (
                          <a
                            href={`https://maps.google.com/?q=${venue.coordinates.lat},${venue.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="d-inline-flex align-items-center gap-1 text-primary text-decoration-none small fw-semibold mt-2"
                          >
                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                            Open in Google Maps
                          </a>
                        )}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center px-1">
                      <span className="text-secondary small fw-semibold">Current Status</span>
                      <StatusPill status={status} />
                    </div>

                    {/* Attendee Registration & Pass (T-6.5) */}
                    {['published', 'ongoing'].includes(status) && (
                      <div className="pt-3 border-top d-flex flex-column gap-2">
                        {isRegisteredForExpo ? (
                          <div className="bg-navy text-white rounded-4 p-3 text-center">
                            <span className="badge bg-lime text-dark fw-bold rounded-pill mb-2">
                              <i className="bi bi-check-circle me-1" /> Pass Issued
                            </span>
                            <div className="small text-white mb-2 font-monospace fw-bold">
                              {ticketCode}
                            </div>
                            <Button
                              variant="outline-light"
                              size="sm"
                              className="w-100 rounded-pill fw-semibold"
                              onClick={() => setTicketModalOpen(true)}
                            >
                              <i className="bi bi-qr-code me-1" /> View Entry Pass
                            </Button>
                          </div>
                        ) : isAuthenticated ? (
                          <Button
                            variant="primary"
                            className="w-100 py-2 rounded-pill fw-bold"
                            onClick={() => registerForExpoMutation.mutate()}
                            loading={registerForExpoMutation.isPending}
                          >
                            <i className="bi bi-ticket-perforated me-2" />
                            Register to Attend (Free)
                          </Button>
                        ) : (
                          <Link
                            to={`/login?redirect=/expos/${expo.slug || expoId}`}
                            className="btn btn-primary w-100 py-2 rounded-pill fw-bold"
                          >
                            <i className="bi bi-box-arrow-in-right me-2" />
                            Login to Register
                          </Link>
                        )}

                        <Link
                          to={`/expos/${expo.slug || expoId}/apply`}
                          className="btn btn-outline-dark w-100 py-2 rounded-pill small fw-semibold"
                        >
                          <i className="bi bi-pencil-square me-1" />
                          Apply as Exhibitor
                        </Link>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Tab.Pane>

            {/* ── Schedule (T-5.6) ── */}
            <Tab.Pane eventKey="schedule">
              <ScheduleTimeline expoId={expo?.id || expo?._id} expo={expo} />
            </Tab.Pane>

            {/* ── Exhibitors (T-6.7) ── */}
            <Tab.Pane eventKey="exhibitors">
              <ExhibitorsDirectory
                expoId={expoActualId}
                onShowOnFloorPlan={() => {
                  setActiveTab('floorplan');
                }}
              />
            </Tab.Pane>

            {/* ── Floor Plan (view & select mode — T-3.12, T-3.14) ── */}
            <Tab.Pane eventKey="floorplan">
              <FloorPlanTab expo={expo} expoId={expoId} booths={booths} isLoading={boothsLoading} />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>

      {/* ── Attendee Ticket Pass Modal (T-6.5) ── */}
      <TicketModal
        show={ticketModalOpen}
        onHide={() => setTicketModalOpen(false)}
        expo={expo}
        registration={registrationData}
        user={user}
      />
    </div>
  );
}

/**
 * Floor Plan Tab — interactive SVG component with pan/zoom, legend, status colors,
 * booth details drawer, exhibitor booth reservation, 409 conflict handling,
 * and an accessible table alternative view.
 * T-3.12, T-3.14. Design §8, FR-EXP-03/04.
 */
function FloorPlanTab({ expo, expoId, booths, isLoading }) {
  const [viewFormat, setViewFormat] = useState('svg'); // 'svg' | 'table'
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isExhibitor = user?.role === 'exhibitor';
  const isOngoingOrPublished = expo?.status === 'published' || expo?.status === 'ongoing';
  const canSelectBooth = isExhibitor && isOngoingOrPublished;

  // Reservation modal state
  const [reservingBooth, setReservingBooth] = useState(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationError, setReservationError] = useState(null);

  // Check if current user already holds a booth in this expo
  const myHeldBooth = booths.find((b) => {
    const userId = user?.id || user?._id;
    if (!userId) return false;
    const reservedId = b.reservedBy?.id || b.reservedBy?._id || b.reservedBy;
    const assignedId = b.assignedTo?.id || b.assignedTo?._id || b.assignedTo;
    return reservedId === userId || assignedId === userId;
  });

  const reserveMutation = useMutation({
    mutationFn: (booth) => reserveBooth(booth.id || booth._id),
    onSuccess: (data, booth) => {
      queryClient.invalidateQueries({ queryKey: ['expoBooths', expoId] });
      setReservationModalOpen(false);
      setReservingBooth(null);
      setReservationError(null);
      toast?.success?.(`Booth ${booth.code} reserved successfully!`);
    },
    onError: (err) => {
      // Immediately invalidate to refresh floor plan statuses (essential for 409 race conditions)
      queryClient.invalidateQueries({ queryKey: ['expoBooths', expoId] });
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      setReservationError({ status, message: msg });
    },
  });

  const handleOpenReserve = (booth) => {
    setReservingBooth(booth);
    setReservationError(null);
    setReservationModalOpen(true);
  };

  const handleConfirmReserve = (booth) => {
    reserveMutation.mutate(booth);
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading floor plan…</span>
        </Spinner>
        <p className="mt-2 text-secondary small">Loading floor plan…</p>
      </div>
    );
  }

  if (!booths || booths.length === 0) {
    return (
      <div className="text-center py-5 text-secondary bg-white rounded-4 border p-4">
        <i className="bi bi-diagram-3 display-3 mb-3 d-block opacity-50" aria-hidden="true" />
        <h3 className="h5 fw-bold text-dark">Floor Plan Not Available</h3>
        <p className="small mb-0">The floor plan for this expo hasn&apos;t been configured yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Exhibitor / Attendee Helper Banners ── */}
      {isExhibitor ? (
        myHeldBooth ? (
          <Alert variant="success" className="d-flex align-items-center gap-2 mb-3 rounded-3 border-0 shadow-sm">
            <i className="bi bi-patch-check-fill fs-5" />
            <div>
              <strong>Booth Space Confirmed:</strong> Your organization currently holds{' '}
              <strong>Booth {myHeldBooth.code}</strong> in this expo.
            </div>
          </Alert>
        ) : isOngoingOrPublished ? (
          <Alert variant="info" className="d-flex align-items-center gap-2 mb-3 rounded-3 border-0 shadow-sm">
            <i className="bi bi-info-circle-fill fs-5" />
            <div>
              <strong>Exhibitor Selection Mode:</strong> Click any available green booth on the floor
              plan to view specifications and reserve space for your company.
            </div>
          </Alert>
        ) : null
      ) : !user ? (
        <div className="bg-white rounded-3 p-3 mb-3 small d-flex flex-wrap gap-2 justify-content-between align-items-center border shadow-sm">
          <span className="text-secondary">
            <i className="bi bi-briefcase me-2 text-primary" /> Are you an approved exhibitor looking to reserve booth space?
          </span>
          <Link to="/login" className="btn btn-outline-primary btn-sm rounded-pill py-1 px-3 fw-semibold">
            Log in to Reserve
          </Link>
        </div>
      ) : null}

      {/* Format Switcher */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h5 fw-bold mb-0">Floor Plan &amp; Booth Availability</h2>
          <p className="text-secondary small mb-0">
            Click on any booth or use the zoom &amp; pan controls to explore the venue layout.
          </p>
        </div>
        <div className="btn-group btn-group-sm rounded-pill overflow-hidden border" role="group" aria-label="Floor plan view format">
          <button
            type="button"
            className={`btn px-3 ${viewFormat === 'svg' ? 'btn-primary fw-semibold' : 'btn-white text-secondary'}`}
            onClick={() => setViewFormat('svg')}
            aria-pressed={viewFormat === 'svg'}
          >
            <i className="bi bi-diagram-3 me-1" />
            Interactive Map
          </button>
          <button
            type="button"
            className={`btn px-3 ${viewFormat === 'table' ? 'btn-primary fw-semibold' : 'btn-white text-secondary'}`}
            onClick={() => setViewFormat('table')}
            aria-pressed={viewFormat === 'table'}
          >
            <i className="bi bi-table me-1" />
            Table View
          </button>
        </div>
      </div>

      {viewFormat === 'svg' ? (
        <FloorPlan
          booths={booths}
          mode={canSelectBooth && !myHeldBooth ? 'select' : 'view'}
          height={520}
          onReserveClick={handleOpenReserve}
          reserveActionLabel="Reserve This Booth"
          actionLoading={reserveMutation.isPending}
        />
      ) : (
        <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" aria-label="Booth list">
              <thead className="table-light small">
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Size</th>
                  <th scope="col">Dimensions</th>
                  <th scope="col">Status</th>
                  <th scope="col">Price / Day</th>
                  <th scope="col">Label</th>
                  {canSelectBooth && !myHeldBooth && <th scope="col" className="text-end">Action</th>}
                </tr>
              </thead>
              <tbody>
                {booths.map((booth) => (
                  <tr key={booth.id || booth._id}>
                    <td className="font-monospace fw-semibold">{booth.code}</td>
                    <td className="text-capitalize text-secondary small">{booth.size || 'medium'}</td>
                    <td className="small text-secondary">
                      {booth.geometry?.w || 2} × {booth.geometry?.h || 2} m
                    </td>
                    <td>
                      <StatusPill status={booth.status} />
                    </td>
                    <td className="text-secondary small">
                      {booth.pricePerDay > 0 ? `$${booth.pricePerDay.toLocaleString()}` : 'Free'}
                    </td>
                    <td className="text-secondary small">{booth.label || '—'}</td>
                    {canSelectBooth && !myHeldBooth && (
                      <td className="text-end">
                        {booth.status === 'available' ? (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => handleOpenReserve(booth)}
                          >
                            Reserve
                          </Button>
                        ) : (
                          <span className="text-secondary small">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reservation Confirmation Modal ── */}
      <BoothReservationModal
        show={reservationModalOpen}
        onHide={() => {
          setReservationModalOpen(false);
          setReservationError(null);
        }}
        booth={reservingBooth}
        expo={expo}
        onConfirm={handleConfirmReserve}
        isLoading={reserveMutation.isPending}
        error={reservationError}
        onDismissError={() => setReservationError(null)}
      />
    </div>
  );
}