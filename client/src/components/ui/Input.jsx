/**
 * @fileoverview Form Input component with integrated label, validation, and helper text.
 * Integrates with React Hook Form and Bootstrap form classes.
 * T-2.12. Design §6, §6.1.
 */

import React, { useId } from 'react';
import { Form } from 'react-bootstrap';

export const Input = React.forwardRef(function Input(
  {
    label,
    name,
    type = 'text',
    error,
    helperText,
    required = false,
    className = '',
    id: explicitId,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = explicitId || name || generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  const ariaDescribedBy = [
    helperText ? helperId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Form.Group className={`mb-3 ${className}`} controlId={id}>
      {label && (
        <Form.Label className="fw-semibold small">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
      )}

      <Form.Control
        ref={ref}
        name={name}
        type={type}
        isInvalid={Boolean(error)}
        aria-describedby={ariaDescribedBy || undefined}
        aria-invalid={Boolean(error)}
        required={required}
        {...props}
      />

      {helperText && !error && (
        <Form.Text id={helperId} className="text-muted small">
          {helperText}
        </Form.Text>
      )}

      {error && (
        <Form.Control.Feedback id={errorId} type="invalid">
          {typeof error === 'string' ? error : error.message}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
});
