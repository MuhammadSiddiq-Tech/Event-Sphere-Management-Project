/**
 * @fileoverview Enhanced Card component with hover states and structured layout slots.
 * T-2.12. Design §5.5, §6.
 */

import React from 'react';
import { Card as BsCard } from 'react-bootstrap';

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  hoverEffect = false,
  className = '',
  bodyClassName = '',
  ...props
}) {
  const hoverClass = hoverEffect ? 'card-hover transition-all cursor-pointer' : '';

  return (
    <BsCard className={`border-0 shadow-sm rounded-3 ${hoverClass} ${className}`} {...props}>
      {(title || headerAction) && (
        <BsCard.Header className="bg-transparent border-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
          <div>
            {title && <h3 className="h6 fw-bold mb-0 text-dark">{title}</h3>}
            {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </BsCard.Header>
      )}

      <BsCard.Body className={`p-3 ${bodyClassName}`}>{children}</BsCard.Body>

      {footer && (
        <BsCard.Footer className="bg-transparent border-top py-2 px-3 text-muted small">
          {footer}
        </BsCard.Footer>
      )}
    </BsCard>
  );
}
