/**
 * @fileoverview Cancel Session Modal — prompt for cancellation reason.
 * T-5.3, T-5.5. FR-SCH-03.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Alert } from 'react-bootstrap';
import { Button } from '../ui/index.js';

export function CancelSessionModal({
  show,
  onHide,
  session,
  onConfirm,
  isPending,
  serverError,
}) {
  const [cancelledReason, setCancelledReason] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (show) {
      setCancelledReason('');
      setLocalError('');
    }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cancelledReason.trim()) {
      setLocalError('Please provide a reason for cancelling this session.');
      return;
    }
    onConfirm(cancelledReason.trim());
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-danger">
            <i className="bi bi-calendar-x me-2" />
            Cancel Session
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <p className="text-secondary mb-3">
            Are you sure you want to cancel the session{' '}
            <strong className="text-dark">"{session?.title}"</strong>?
          </p>

          <Alert variant="warning" className="small d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-info-circle flex-shrink-0" />
            <span>
              Cancelled sessions remain in the schedule marked as cancelled. Any registered attendees
              will receive a notification notice.
            </span>
          </Alert>

          {serverError && (
            <Alert variant="danger" className="small mb-3">
              {serverError}
            </Alert>
          )}

          {localError && (
            <Alert variant="warning" className="small mb-3">
              {localError}
            </Alert>
          )}

          <Form.Group controlId="cancelReason">
            <Form.Label className="small fw-semibold">
              Cancellation Reason <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="e.g. Speaker flight cancelled, emergency room maintenance…"
              value={cancelledReason}
              onChange={(e) => setCancelledReason(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isPending}>
            Keep Session
          </Button>
          <Button variant="danger" type="submit" loading={isPending}>
            Confirm Cancellation
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
