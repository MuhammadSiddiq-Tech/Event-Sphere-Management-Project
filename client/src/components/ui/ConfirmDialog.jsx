/**
 * @fileoverview Reusable Confirmation Dialog / Modal.
 * Supports destructive actions with optional typed-text confirmation guard.
 * T-2.12. Design §6, §6.1.
 */

import React, { useState } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { Button } from './Button.jsx';

export function ConfirmDialog({
  show,
  onHide,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
  requiredMatchText, // e.g. require typing "DELETE" or item title
  children,
}) {
  const [typedValue, setTypedValue] = useState('');

  const isConfirmed = requiredMatchText
    ? typedValue.trim() === requiredMatchText.trim()
    : true;

  const handleClose = () => {
    setTypedValue('');
    onHide();
  };

  const handleConfirm = async () => {
    if (!isConfirmed || loading) return;
    await onConfirm();
    setTypedValue('');
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static" keyboard={!loading}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title className="h5 fw-bold text-dark">{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="py-3">
        {typeof message === 'string' ? <p className="mb-0 text-muted">{message}</p> : message}

        {children}

        {requiredMatchText && (
          <div className="mt-3">
            <Form.Label className="small fw-semibold text-danger">
              To confirm, type <span className="font-monospace fw-bold">{requiredMatchText}</span> below:
            </Form.Label>
            <Form.Control
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requiredMatchText}
              disabled={loading}
              autoFocus
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={handleClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant}
          onClick={handleConfirm}
          disabled={!isConfirmed || loading}
          loading={loading}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
