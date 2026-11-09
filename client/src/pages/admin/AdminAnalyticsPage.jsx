/**
 * @fileoverview Admin Analytics & Reports Dashboard.
 * T-8.4, T-8.5, T-8.6. FR-ANA-01, FR-ANA-02, FR-ANA-03.
 *
 * Visualizes:
 *  - StatCards for high-level KPIs (with real-time updates via socket room admin:{expoId})
 *  - Engagement over time line chart
 *  - Top booth traffic bar chart
 *  - Event distribution donut chart
 *  - Toggle for "View as Chart" / "View as Table"
 *  - Date range filtering
 *  - CSV export
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Table,
  Badge,
  ButtonGroup,
} from 'react-bootstrap';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminExpos } from '../../api/expos.js';
import {
  fetchKpis,
  fetchEngagementOverTime,
  fetchBoothTraffic,
  fetchSessionPopularity,
  buildCsvExportUrl,
} from '../../api/analytics.js';
import { Button, Skeleton, EmptyState, useToast } from '../../components/ui/index.js';
import { useSocket } from '../../context/SocketContext.jsx';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#0dcaf0', '#6f42c1', '#d63384'];

export default function AdminAnalyticsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const [selectedExpoId, setSelectedExpoId] = useState('');
  const [days, setDays] = useState(30);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  const [liveKpi, setLiveKpi] = useState(null);

  // 1. Fetch expos to populate expo selector
  const { data: exposData, isLoading: loadingExpos } = useQuery({
    queryKey: ['adminExposForAnalytics'],
    queryFn: () => fetchAdminExpos({ limit: 50 }),
  });

  const expos = exposData?.items ?? [];

  // Auto-select first expo when loaded
  useEffect(() => {
    if (!selectedExpoId && expos.length > 0) {
      setSelectedExpoId(expos[0].id || expos[0]._id);
    }
  }, [expos, selectedExpoId]);

  // 2. Real-time KPI listener (T-8.5)
  useEffect(() => {
    if (!socket || !selectedExpoId) return;

    socket.emit('join:admin', { expoId: selectedExpoId });

    const handleKpiTick = (kpi) => {
      setLiveKpi(kpi);
      queryClient.setQueryData(['analyticsKpis', selectedExpoId], kpi);
    };

    socket.on('analytics:kpi', handleKpiTick);

    return () => {
      socket.emit('leave:admin', { expoId: selectedExpoId });
      socket.off('analytics:kpi', handleKpiTick);
    };
  }, [socket, selectedExpoId, queryClient]);

  // 3. Fetch KPI summary
  const { data: kpiData, isLoading: loadingKpi } = useQuery({
    queryKey: ['analyticsKpis', selectedExpoId],
    queryFn: () => fetchKpis(selectedExpoId),
    enabled: !!selectedExpoId,
  });

  const currentKpi = liveKpi || kpiData || {
    totalEvents: 0,
    uniqueVisitors: 0,
    boothViews: 0,
    sessionViews: 0,
    sessionCheckins: 0,
    searches: 0,
  };

  // 4. Fetch Engagement Over Time
  const { data: engagementData = [], isLoading: loadingEngagement } = useQuery({
    queryKey: ['analyticsEngagement', selectedExpoId, days],
    queryFn: () => fetchEngagementOverTime(selectedExpoId, { days }),
    enabled: !!selectedExpoId,
  });

  // 5. Fetch Booth Traffic
  const { data: boothTraffic = [], isLoading: loadingBooths } = useQuery({
    queryKey: ['analyticsBoothTraffic', selectedExpoId],
    queryFn: () => fetchBoothTraffic(selectedExpoId, 10),
    enabled: !!selectedExpoId,
  });

  // 6. Fetch Session Popularity
  const { data: sessionPopularity = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['analyticsSessionPopularity', selectedExpoId],
    queryFn: () => fetchSessionPopularity(selectedExpoId, 10),
    enabled: !!selectedExpoId,
  });

  // Aggregate engagement by date for line chart
  const timelineChartData = React.useMemo(() => {
    const map = new Map();
    engagementData.forEach((item) => {
      if (!map.has(item.date)) {
        map.set(item.date, { date: item.date, total: 0 });
      }
      const entry = map.get(item.date);
      entry[item.type] = (entry[item.type] || 0) + item.count;
      entry.total += item.count;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [engagementData]);

  // Donut chart data for event breakdown
  const eventDistribution = React.useMemo(() => {
    return [
      { name: 'Booth Views', value: currentKpi.boothViews || 0 },
      { name: 'Session Views', value: currentKpi.sessionViews || 0 },
      { name: 'Session Check-ins', value: currentKpi.sessionCheckins || 0 },
      { name: 'Searches', value: currentKpi.searches || 0 },
    ].filter((item) => item.value > 0);
  }, [currentKpi]);

  const handleExportCsv = () => {
    if (!selectedExpoId) return;
    const url = buildCsvExportUrl(selectedExpoId);
    window.open(url, '_blank');
    toast?.success?.('Export started — CSV downloading');
  };

  return (
    <Container fluid className="py-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="h3 fw-bold text-dark mb-0">Analytics & Reports</h1>
            {isConnected && (
              <Badge bg="success-subtle" text="success-emphasis" className="border d-flex align-items-center gap-1">
                <span className="spinner-grow spinner-grow-sm" style={{ width: '8px', height: '8px' }} />
                Live Feed
              </Badge>
            )}
          </div>
          <p className="text-muted small mb-0">
            Real-time KPIs, attendee engagement trends, booth traffic, and session popularity.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Expo selector */}
          <Form.Select
            size="sm"
            value={selectedExpoId}
            onChange={(e) => {
              setSelectedExpoId(e.target.value);
              setLiveKpi(null);
            }}
            style={{ minWidth: '220px' }}
            disabled={loadingExpos}
            aria-label="Select Expo"
          >
            {expos.map((expo) => (
              <option key={expo.id || expo._id} value={expo.id || expo._id}>
                {expo.title}
              </option>
            ))}
          </Form.Select>

          {/* Date range filter */}
          <Form.Select
            size="sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: '130px' }}
            aria-label="Filter Days"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </Form.Select>

          {/* View mode toggle */}
          <div className="btn-group btn-group-sm" role="group" aria-label="View toggle">
            <button
              type="button"
              className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('chart')}
            >
              <i className="bi bi-graph-up me-1" />
              Chart
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('table')}
            >
              <i className="bi bi-table me-1" />
              Table
            </button>
          </div>

          {/* CSV Export */}
          <Button variant="outline-success" size="sm" onClick={handleExportCsv} disabled={!selectedExpoId}>
            <i className="bi bi-download me-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {loadingExpos || !selectedExpoId ? (
        <Skeleton count={4} height={120} className="mb-4" />
      ) : (
        <>
          {/* StatCards Row */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-primary-subtle text-primary rounded-3">
                    <i className="bi bi-activity fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Total Events</div>
                    <div className="fs-4 fw-bold">{currentKpi.totalEvents}</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-success-subtle text-success rounded-3">
                    <i className="bi bi-people fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Unique Visitors</div>
                    <div className="fs-4 fw-bold">{currentKpi.uniqueVisitors}</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-warning-subtle text-warning rounded-3">
                    <i className="bi bi-shop fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Booth Views</div>
                    <div className="fs-4 fw-bold">{currentKpi.boothViews}</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-info-subtle text-info rounded-3">
                    <i className="bi bi-easel fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Session Views</div>
                    <div className="fs-4 fw-bold">{currentKpi.sessionViews}</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-danger-subtle text-danger rounded-3">
                    <i className="bi bi-check2-circle fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Check-ins</div>
                    <div className="fs-4 fw-bold">{currentKpi.sessionCheckins}</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={12} sm={6} xl={2}>
              <Card className="border-0 shadow-sm p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2.5 bg-secondary-subtle text-secondary rounded-3">
                    <i className="bi bi-search fs-4" />
                  </div>
                  <div>
                    <div className="text-muted small">Searches</div>
                    <div className="fs-4 fw-bold">{currentKpi.searches}</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Main Visualizations Row */}
          {viewMode === 'chart' ? (
            <Row className="g-4 mb-4">
              {/* Engagement Over Time */}
              <Col xs={12} lg={8}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold text-dark mb-0">Engagement Over Time</h5>
                    <span className="small text-muted">Daily Total Interactions</span>
                  </Card.Header>
                  <Card.Body className="p-4" style={{ height: '340px' }}>
                    {timelineChartData.length === 0 ? (
                      <EmptyState icon="bi-graph-up" title="No activity recorded" description="Events will appear here as users interact with the expo." />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total" stroke="#0d6efd" strokeWidth={2} name="Total Activity" />
                          <Line type="monotone" dataKey="booth_view" stroke="#ffc107" strokeWidth={2} name="Booth Views" />
                          <Line type="monotone" dataKey="session_view" stroke="#0dcaf0" strokeWidth={2} name="Session Views" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Event Distribution Donut */}
              <Col xs={12} lg={4}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
                    <h5 className="fw-bold text-dark mb-0">Event Distribution</h5>
                  </Card.Header>
                  <Card.Body className="p-4 d-flex align-items-center justify-content-center" style={{ height: '340px' }}>
                    {eventDistribution.length === 0 ? (
                      <EmptyState icon="bi-pie-chart" title="No events recorded" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={eventDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {eventDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Top Booth Traffic Bar Chart */}
              <Col xs={12} lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
                    <h5 className="fw-bold text-dark mb-0">Top Booth Traffic</h5>
                  </Card.Header>
                  <Card.Body className="p-4" style={{ height: '300px' }}>
                    {boothTraffic.length === 0 ? (
                      <EmptyState icon="bi-bar-chart" title="No booth views recorded" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={boothTraffic} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="label" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="views" fill="#0d6efd" radius={[0, 4, 4, 0]} name="Views" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Session Popularity Bar Chart */}
              <Col xs={12} lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
                    <h5 className="fw-bold text-dark mb-0">Top Sessions</h5>
                  </Card.Header>
                  <Card.Body className="p-4" style={{ height: '300px' }}>
                    {sessionPopularity.length === 0 ? (
                      <EmptyState icon="bi-mic" title="No session interactions" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessionPopularity}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="title" tick={false} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="views" fill="#0dcaf0" name="Views" />
                          <Bar dataKey="checkins" fill="#198754" name="Check-ins" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            /* Table View */
            <Row className="g-4 mb-4">
              <Col xs={12} lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
                    <h5 className="fw-bold text-dark mb-0">Booth Traffic Ranking</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover className="align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase text-muted">
                          <th className="ps-4">Rank</th>
                          <th>Booth</th>
                          <th className="text-end pe-4">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boothTraffic.map((b, i) => (
                          <tr key={b.boothId}>
                            <td className="ps-4 fw-bold text-muted">#{i + 1}</td>
                            <td className="fw-semibold text-dark">{b.label}</td>
                            <td className="text-end pe-4 fw-bold">{b.views}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} lg={6}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-2">
                    <h5 className="fw-bold text-dark mb-0">Session Popularity</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover className="align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-uppercase text-muted">
                          <th className="ps-4">Session</th>
                          <th>Views</th>
                          <th className="text-end pe-4">Check-ins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionPopularity.map((s) => (
                          <tr key={s.sessionId}>
                            <td className="ps-4 fw-semibold text-dark">{s.title}</td>
                            <td>{s.views}</td>
                            <td className="text-end pe-4 fw-bold text-success">{s.checkins}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}
    </Container>
  );
}
