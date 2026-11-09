/**
 * @fileoverview Analytics client instrumentation hook.
 * T-8.2. FR-ANA-01.
 *
 * Provides useTrackEvent() — a lightweight hook to fire one analytics event
 * per mount (or on demand) for booth views, profile views, session views, etc.
 *
 * Usage:
 *   useTrackEvent('booth_view', { expoId, target: boothId, targetModel: 'Booth' });
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { trackEvent } from '../api/analytics.js';

/**
 * Fire an analytics event once per mount (when user is authenticated).
 * @param {string|null} type   - ANALYTICS_EVENT_TYPE value or null to disable
 * @param {Object} [params]    - { expoId?, target?, targetModel?, meta? }
 */
export function useTrackEvent(type, params = {}) {
  const { isAuthenticated } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!type || !isAuthenticated || firedRef.current) return;
    firedRef.current = true;

    trackEvent({
      type,
      ...params,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isAuthenticated]);
}
