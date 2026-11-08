/**
 * @fileoverview Skeleton loader component.
 * Prevents layout shift during async data fetching.
 * T-2.12. Design §6, §6.1.
 */

import React from 'react';
import { Placeholder, Card } from 'react-bootstrap';

export function Skeleton({ variant = 'text', lines = 3, className = '' }) {
  if (variant === 'card') {
    return (
      <Card className={`border-0 shadow-sm p-3 mb-3 ${className}`}>
        <Placeholder as="div" animation="glow" className="mb-3">
          <Placeholder xs={8} size="lg" className="rounded" />
        </Placeholder>
        <Placeholder as="div" animation="glow">
          <Placeholder xs={12} className="mb-1" />
          <Placeholder xs={10} className="mb-1" />
          <Placeholder xs={6} />
        </Placeholder>
      </Card>
    );
  }

  if (variant === 'tableRow') {
    return (
      <tr className={className}>
        <td colSpan={100} className="p-3">
          <Placeholder as="div" animation="glow" className="d-flex gap-3">
            <Placeholder xs={2} className="py-2" />
            <Placeholder xs={4} className="py-2" />
            <Placeholder xs={3} className="py-2" />
            <Placeholder xs={2} className="py-2" />
          </Placeholder>
        </td>
      </tr>
    );
  }

  if (variant === 'avatar') {
    return (
      <Placeholder
        as="div"
        animation="glow"
        className={`rounded-circle bg-secondary-subtle d-inline-block ${className}`}
        style={{ width: '48px', height: '48px' }}
      />
    );
  }

  // Default: text lines
  return (
    <Placeholder as="div" animation="glow" className={`py-1 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Placeholder
          key={idx}
          xs={idx === lines - 1 ? 7 : 12}
          className="mb-2 d-block"
        />
      ))}
    </Placeholder>
  );
}
