/**
 * @fileoverview Password Input with show/hide toggle and password strength meter.
 * T-2.12. Design §6, §6.1.
 */

import React, { useState, useId } from 'react';
import { Form, InputGroup, Button as BsButton, ProgressBar } from 'react-bootstrap';

export function calculatePasswordStrength(password = '') {
  if (!password) return { score: 0, label: '', variant: 'secondary' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 20, label: 'Very Weak', variant: 'danger' };
  if (score === 2) return { score: 40, label: 'Weak', variant: 'warning' };
  if (score === 3) return { score: 65, label: 'Fair', variant: 'info' };
  if (score === 4) return { score: 85, label: 'Good', variant: 'primary' };
  return { score: 100, label: 'Strong', variant: 'success' };
}

export const PasswordInput = React.forwardRef(function PasswordInput(
  {
    label = 'Password',
    name = 'password',
    error,
    helperText,
    required = false,
    showStrengthMeter = false,
    value,
    onChange,
    className = '',
    id: explicitId,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState('');
  const generatedId = useId();
  const id = explicitId || name || generatedId;

  const currentPasswordValue = value !== undefined ? value : internalValue;
  const strength = calculatePasswordStrength(currentPasswordValue);

  const handleChange = (e) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Form.Group className={`mb-3 ${className}`} controlId={id}>
      {label && (
        <Form.Label className="fw-semibold small">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
      )}

      <InputGroup hasValidation>
        <Form.Control
          ref={ref}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          isInvalid={Boolean(error)}
          required={required}
          {...props}
        />
        <BsButton
          variant="outline-secondary"
          onClick={() => setShowPassword((prev) => !prev)}
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
        </BsButton>

        {error && (
          <Form.Control.Feedback type="invalid">
            {typeof error === 'string' ? error : error.message}
          </Form.Control.Feedback>
        )}
      </InputGroup>

      {showStrengthMeter && currentPasswordValue && (
        <div className="mt-2" aria-live="polite">
          <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
            <span>Password strength:</span>
            <span className={`fw-bold text-${strength.variant}`}>{strength.label}</span>
          </div>
          <ProgressBar
            now={strength.score}
            variant={strength.variant}
            style={{ height: '4px' }}
          />
        </div>
      )}

      {helperText && !error && (
        <Form.Text className="text-muted small">{helperText}</Form.Text>
      )}
    </Form.Group>
  );
});
