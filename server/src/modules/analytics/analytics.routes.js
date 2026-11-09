/**
 * @fileoverview Analytics REST Routes.
 * T-8.1 (track), T-8.3 (aggregation), T-8.5 (KPI), T-8.6 (CSV export).
 * FR-ANA-01, FR-ANA-02, FR-ANA-03.
 *
 * Routes:
 *  POST /api/v1/analytics/events                              track event (authenticated)
 *  GET  /api/v1/analytics/expos/:expoId/kpis                 summary KPIs (admin)
 *  GET  /api/v1/analytics/expos/:expoId/engagement           engagement over time (admin)
 *  GET  /api/v1/analytics/expos/:expoId/booth-traffic        booth traffic ranking (admin)
 *  GET  /api/v1/analytics/expos/:expoId/session-popularity   session popularity (admin)
 *  GET  /api/v1/analytics/expos/:expoId/export.csv           CSV export (admin)
 */

import { router } from '../../core/router.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import { analyticsController } from './analytics.controller.js';
import { trackEventSchema } from './analytics.schema.js';

const BASE = '/api/v1/analytics';

// Any authenticated user can track events
router.post(
  `${BASE}/events`,
  requireAuth,
  validate({ body: trackEventSchema }),
  analyticsController.track
);

// Admin-only aggregation endpoints
router.get(
  `${BASE}/expos/:expoId/kpis`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  analyticsController.getKpis
);

router.get(
  `${BASE}/expos/:expoId/engagement`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  analyticsController.getEngagement
);

router.get(
  `${BASE}/expos/:expoId/booth-traffic`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  analyticsController.getBoothTraffic
);

router.get(
  `${BASE}/expos/:expoId/session-popularity`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  analyticsController.getSessionPopularity
);

// CSV export (admin, T-8.6)
router.get(
  `${BASE}/expos/:expoId/export.csv`,
  requireAuth,
  requireRole(ROLES.ADMIN),
  analyticsController.exportCsv
);
