/**
 * @fileoverview Admin Dashboard Landing Page.
 * Executive Command-Center connected to real backend APIs via React Query.
 */

import React, { useMemo } from 'react';
import { Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchAdminExpos } from '../../api/expos.js';
import { fetchAdminUsers } from '../../api/admin.js';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // Fetch real expos from backend
  const { data: exposData, isLoading: exposLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'expos'],
    queryFn: () => fetchAdminExpos({ limit: 100 }),
    staleTime: 30_000,
  });

  // Fetch real users from backend
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'users'],
    queryFn: () => fetchAdminUsers({ limit: 100 }),
    staleTime: 30_000,
  });

  const isLoading = exposLoading || usersLoading;

  const stats = useMemo(() => {
    const expos = exposData?.items ?? [];
    const totalExpos = exposData?.meta?.total ?? expos.length;
    const liveExpos = expos.filter((e) => ['published', 'ongoing'].includes(e.status)).length;
    const draftExpos = expos.filter((e) => e.status === 'draft').length;
    const completedExpos = expos.filter((e) => e.status === 'completed').length;

    const users = usersData?.items ?? [];
    const totalUsers = usersData?.meta?.total ?? users.length;
    const attendeesCount = users.filter((u) => u.role === 'attendee').length;
    const exhibitorsCount = users.filter((u) => u.role === 'exhibitor').length;
    const adminsCount = users.filter((u) => u.role === 'admin').length;

    // Expo status distribution for Donut Chart
    const statusBreakdown = [
      { name: 'Published / Live', value: liveExpos, color: '#0057ff' },
      { name: 'Drafts', value: draftExpos, color: '#d97706' },
      { name: 'Completed', value: completedExpos, color: '#16a34a' },
    ].filter((item) => item.value > 0);

    // Category distribution for Bar Chart
    const categoryMap = {};
    expos.forEach((e) => {
      const cat = e.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .slice(0, 6);

    // Recent user signups grouped by date for Area Chart
    const dateMap = {};
    [...users]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((u) => {
        if (!u.createdAt) return;
        const label = new Date(u.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        dateMap[label] = (dateMap[label] || 0) + 1;
      });

    let cumulative = 0;
    const growthTrend = Object.entries(dateMap)
      .slice(-7)
      .map(([date, count]) => {
        cumulative += count;
        return { date, signups: cumulative };
      });

    return {
      totalExpos,
      liveExpos,
      draftExpos,
      totalUsers,
      attendeesCount,
      exhibitorsCount,
      adminsCount,
      statusBreakdown:
        statusBreakdown.length > 0
          ? statusBreakdown
          : [{ name: 'No Expos Yet', value: 1, color: '#cbd5e1' }],
      categoryData:
        categoryData.length > 0
          ? categoryData
          : [{ category: 'No Data', count: 0 }],
      growthTrend:
        growthTrend.length > 0
          ? growthTrend
          : [{ date: 'Today', signups: totalUsers }],
    };
  }, [exposData, usersData]);

  return (
    <div>
      {/* ── Top Command Header ── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <span className="text-uppercase fw-bold text-primary small">
            Command Overview
          </span>
          <h1 className="h3 fw-bold mb-1">Welcome back, {user?.name || 'Admin'}</h1>
          <p className="text-secondary small mb-0">
            Live platform telemetry across expos, exhibitor accounts, and attendee sign-ups.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button
            as={Link}
            to="/admin/analytics"
            variant="outline-dark"
            className="rounded-pill px-3 fw-semibold"
          >
            <i className="bi bi-graph-up-arrow me-2"></i>Full Analytics
          </Button>
          <Button
            as={Link}
            to="/admin/expos"
            variant="primary"
            className="rounded-pill px-4 fw-semibold"
          >
            <i className="bi bi-plus-circle me-2"></i>Create New Expo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-secondary small mt-2">Syncing live database metrics...</p>
        </div>
      ) : (
        <>
          {/* ── 4 Live KPI Metric Cards ── */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} xl={3}>
              <Card className="border-0 shadow-sm rounded-4 p-3 h-100 card-hover">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="bi bi-building fs-5"></i>
                  </div>
                  <Badge bg="primary-subtle" text="primary" className="rounded-pill">
                    {stats.liveExpos} Live
                  </Badge>
                </div>
                <div className="text-secondary small fw-medium">Total Expos</div>
                <div className="h3 fw-bold mb-0">{stats.totalExpos}</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={3}>
              <Card className="border-0 shadow-sm rounded-4 p-3 h-100 card-hover">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 bg-lime text-dark"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="bi bi-file-earmark-check fs-5"></i>
                  </div>
                  <Badge bg="warning-subtle" text="warning" className="rounded-pill">
                    {stats.draftExpos} Drafts
                  </Badge>
                </div>
                <div className="text-secondary small fw-medium">Exhibitor Accounts</div>
                <div className="h3 fw-bold mb-0">{stats.exhibitorsCount}</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={3}>
              <Card className="border-0 shadow-sm rounded-4 p-3 h-100 card-hover">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 bg-success-subtle text-success"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="bi bi-person-badge fs-5"></i>
                  </div>
                  <Badge bg="success-subtle" text="success" className="rounded-pill">
                    Verified
                  </Badge>
                </div>
                <div className="text-secondary small fw-medium">Registered Attendees</div>
                <div className="h3 fw-bold mb-0">{stats.attendeesCount}</div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={3}>
              <Card className="border-0 shadow-sm rounded-4 p-3 h-100 card-hover bg-navy text-white">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-3 bg-white bg-opacity-10 text-lime"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <i className="bi bi-people fs-5"></i>
                  </div>
                  <Badge className="bg-lime text-dark rounded-pill">All Roles</Badge>
                </div>
                <div className="text-white-50 small fw-medium">Total Platform Users</div>
                <div className="h3 fw-bold mb-0 text-white">{stats.totalUsers}</div>
              </Card>
            </Col>
          </Row>

          {/* ── Primary Charts Row: User Growth Area Chart + Expo Status Donut ── */}
          <Row className="g-4 mb-4">
            <Col xs={12} lg={8}>
              <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 h-100">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h2 className="h5 fw-bold mb-0">Platform User Growth</h2>
                    <p className="text-secondary small mb-0">
                      Cumulative registered users across recent onboarding dates
                    </p>
                  </div>
                  <Badge bg="primary-subtle" text="primary" className="px-3 py-2 rounded-pill">
                    Live Database
                  </Badge>
                </div>

                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <AreaChart
                      data={stats.growthTrend}
                      margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="cobaltGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0057ff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0057ff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 8px 24px rgba(10,17,40,0.12)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="signups"
                        name="Cumulative Users"
                        stroke="#0057ff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#cobaltGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={12} lg={4}>
              <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 h-100">
                <div className="mb-2">
                  <h2 className="h5 fw-bold mb-0">Expo Lifecycle Status</h2>
                  <p className="text-secondary small mb-0">Current event portfolio breakdown</p>
                </div>

                <div style={{ width: '100%', height: 210 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={stats.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                      >
                        {stats.statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="d-flex flex-column gap-2 mt-2">
                  {stats.statusBreakdown.map((item) => (
                    <div key={item.name} className="d-flex justify-content-between align-items-center small">
                      <span className="d-flex align-items-center gap-2 fw-medium">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{ width: '10px', height: '10px', backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="fw-bold font-monospace">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {/* ── Secondary Row: Expos by Category Bar Chart + Command Shortcuts ── */}
          <Row className="g-4">
            <Col xs={12} lg={7}>
              <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h2 className="h5 fw-bold mb-0">Expos by Category</h2>
                    <p className="text-secondary small mb-0">Active &amp; planned industry verticals</p>
                  </div>
                  <Link to="/admin/expos" className="btn btn-sm btn-outline-primary rounded-pill px-3">
                    Manage Expos
                  </Link>
                </div>

                <div style={{ width: '100%', height: 230 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={stats.categoryData}
                      margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(0, 87, 255, 0.06)' }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 8px 24px rgba(10,17,40,0.12)',
                        }}
                      />
                      <Bar dataKey="count" name="Expos" fill="#0a1128" radius={[8, 8, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={12} lg={5}>
              <Card className="border-0 shadow-sm rounded-4 p-3 p-md-4 h-100">
                <h2 className="h5 fw-bold mb-1">Quick Command Actions</h2>
                <p className="text-secondary small mb-3">Jump directly to high-priority tasks</p>

                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/admin/applications"
                    className="p-3 rounded-3 border text-decoration-none text-dark d-flex align-items-center justify-content-between card-hover"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="p-2 rounded-2 bg-lime text-dark">
                        <i className="bi bi-clipboard-check fs-5"></i>
                      </span>
                      <div>
                        <div className="fw-bold small">Review Exhibitor Applications</div>
                        <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                          Approve companies &amp; assign booths
                        </div>
                      </div>
                    </div>
                    <i className="bi bi-arrow-right text-primary"></i>
                  </Link>

                  <Link
                    to="/admin/expos"
                    className="p-3 rounded-3 border text-decoration-none text-dark d-flex align-items-center justify-content-between card-hover"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="p-2 rounded-2 bg-primary-subtle text-primary">
                        <i className="bi bi-bounding-box fs-5"></i>
                      </span>
                      <div>
                        <div className="fw-bold small">Open Floor Plan Editor</div>
                        <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                          Configure booth grid &amp; pricing
                        </div>
                      </div>
                    </div>
                    <i className="bi bi-arrow-right text-primary"></i>
                  </Link>

                  <Link
                    to="/admin/users"
                    className="p-3 rounded-3 border text-decoration-none text-dark d-flex align-items-center justify-content-between card-hover"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="p-2 rounded-2 bg-ice text-dark">
                        <i className="bi bi-people fs-5"></i>
                      </span>
                      <div>
                        <div className="fw-bold small">Manage Users &amp; Roles</div>
                        <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                          Audit exhibitors and attendee accounts
                        </div>
                      </div>
                    </div>
                    <i className="bi bi-arrow-right text-primary"></i>
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}