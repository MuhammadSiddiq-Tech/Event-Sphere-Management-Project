/**
 * @fileoverview EmptyState component for lists and tables with zero records.
 * T-2.12. Design §6, §6.1.
 */

import React from 'react';
import { Card } from 'react-bootstrap';
import { Button } from './Button.jsx';

export function EmptyState({
  icon = 'bi-inbox',
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <Card className={`border-0 bg-transparent text-center py-5 ${className}`}>
      <Card.Body>
        <div className="d-inline-flex align-items-center justify-content-center p-4 bg-light rounded-circle text-muted mb-3">
          <i className={`bi ${icon} display-5`}></i>
        </div>
        <h3 className="h5 fw-bold text-dark mb-2">{title}</h3>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '420px' }}>
          {description}
        </p>
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction} icon={actionIcon}>
            {actionLabel}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}
