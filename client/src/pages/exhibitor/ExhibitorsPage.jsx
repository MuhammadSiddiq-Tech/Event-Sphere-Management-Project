/**
 * @fileoverview Standalone Public Exhibitor Directory Page.
 * T-6.7. FR-ATT-03.
 * Route: /exhibitors
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import { ExhibitorsDirectory } from '../../components/exhibitor/ExhibitorsDirectory.jsx';

export default function ExhibitorsPage() {
  return (
    <div className="py-4">
      <Container>
        <div className="mb-4">
          <h1 className="h3 fw-bold text-dark mb-1">Exhibitor Directory</h1>
          <p className="text-muted small mb-0">
            Discover leading companies, innovate products, and locate exhibition booths.
          </p>
        </div>

        <ExhibitorsDirectory />
      </Container>
    </div>
  );
}
