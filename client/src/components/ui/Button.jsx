/**
 * @fileoverview Reusable Button component.
 * Extends React-Bootstrap Button with inline loading state, icons, and accessible markup.
 * T-2.12. Design §6, §6.1.
 */

import React from 'react';
import { Button as BsButton, Spinner } from 'react-bootstrap';

export const Button = React.forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size,
    loading = false,
    disabled = false,
    icon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const isGhost = variant === 'ghost';
  const resolvedVariant = isGhost ? 'link' : variant;
  const customClass = `${isGhost ? 'text-decoration-none' : ''} ${className}`.trim();

  return (
    <BsButton
      ref={ref}
      type={type}
      variant={resolvedVariant}
      size={size}
      disabled={disabled || loading}
      className={customClass}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="d-inline-flex align-items-center gap-2">
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <span>{children}</span>
        </span>
      ) : (
        <span className="d-inline-flex align-items-center gap-2">
          {icon && <i className={`bi ${icon}`} aria-hidden="true"></i>}
          <span>{children}</span>
        </span>
      )}
    </BsButton>
  );
});
