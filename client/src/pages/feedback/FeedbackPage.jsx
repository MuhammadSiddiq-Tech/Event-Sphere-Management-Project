/**
 * @fileoverview User Feedback & Support Page.
 * T-7.12. FR-SYS-02.
 * Allows any authenticated user (attendee, exhibitor, admin) to submit suggestions,
 * report issues, or request support with optional ratings.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { Button, useToast } from '../../components/ui/index.js';
import { submitFeedback } from '../../api/feedback.js';

const CATEGORIES = [
  {
    id: 'suggestion',
    label: 'Suggestion',
    icon: 'bi-lightbulb',
    description: 'Feature idea or improvement proposal',
    color: 'info',
  },
  {
    id: 'issue',
    label: 'Issue / Bug',
    icon: 'bi-exclamation-triangle',
    description: 'Something is broken or not working as expected',
    color: 'danger',
  },
  {
    id: 'support',
    label: 'Support Request',
    icon: 'bi-question-circle',
    description: 'Need help with your account, tickets, or booth',
    color: 'secondary',
  },
];

export default function FeedbackPage() {
  const toast = useToast();
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (message.trim().length < 5) {
      setErrorMsg('Please enter a message of at least 5 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        category,
        message: message.trim(),
        ...(rating > 0 ? { rating } : {}),
      };

      const result = await submitFeedback(payload);
      setSubmittedRef(result.id);
      setMessage('');
      setRating(0);
      toast?.success?.(`Feedback received! Reference ID: #${result.id}`);
    } catch (err) {
      const errDetail =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to submit feedback. Please try again.';
      setErrorMsg(errDetail);
      toast?.error?.(errDetail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-4 py-md-5" style={{ maxWidth: '800px' }}>
      <div className="mb-4 text-center">
        <h1 className="h2 fw-bold text-dark mb-2">Feedback & Support</h1>
        <p className="text-muted">
          Your input shapes EventSphere. Share suggestions, report bugs, or get in touch.
        </p>
      </div>

      {submittedRef && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSubmittedRef(null)}
          className="d-flex align-items-center gap-3 mb-4 shadow-sm"
        >
          <i className="bi bi-check-circle-fill fs-3 text-success" aria-hidden="true"></i>
          <div>
            <h6 className="mb-1 fw-bold">Thank you for your feedback!</h6>
            <div className="small">
              Your feedback reference ID is <code className="fw-bold">#{submittedRef}</code>.
              Our team regularly reviews all submissions.
            </div>
          </div>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="mb-4">
          <i className="bi bi-exclamation-octagon me-2" aria-hidden="true"></i>
          {errorMsg}
        </Alert>
      )}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4 p-md-5">
          <Form onSubmit={handleSubmit}>
            {/* Category selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-dark mb-2">
                What kind of feedback are you sharing?
              </Form.Label>
              <Row className="g-3">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <Col xs={12} sm={4} key={cat.id}>
                      <button
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`w-100 text-start p-3 rounded border text-decoration-none transition-all ${
                          isSelected
                            ? `border-${cat.color} bg-${cat.color}-subtle shadow-sm`
                            : 'border-light-subtle bg-white hover-bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                        aria-pressed={isSelected}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <i
                            className={`bi ${cat.icon} text-${cat.color} fs-5`}
                            aria-hidden="true"
                          ></i>
                          <span className={`fw-bold ${isSelected ? `text-${cat.color}` : 'text-dark'}`}>
                            {cat.label}
                          </span>
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                          {cat.description}
                        </div>
                      </button>
                    </Col>
                  );
                })}
              </Row>
            </Form.Group>

            {/* Rating (optional) */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold text-dark mb-1">
                Rate your overall platform experience (optional)
              </Form.Label>
              <div className="d-flex align-items-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      className="btn btn-link p-1 text-decoration-none border-0"
                      onClick={() => setRating(rating === star ? 0 : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <i
                        className={`bi ${filled ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-3`}
                        aria-hidden="true"
                      ></i>
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span className="ms-2 text-muted small">
                    {rating} of 5 star{rating > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Form.Group>

            {/* Message input */}
            <Form.Group className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="fw-semibold text-dark mb-0">
                  Your Message <span className="text-danger">*</span>
                </Form.Label>
                <span
                  className={`small ${
                    message.length > 2000 ? 'text-danger fw-bold' : 'text-muted'
                  }`}
                >
                  {message.length} / 2000
                </span>
              </div>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Describe your feedback, issue, or question with as much detail as possible..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                required
                className="form-control"
              />
              <Form.Text className="text-muted">Minimum 5 characters required.</Form.Text>
            </Form.Group>

            {/* Action buttons */}
            <div className="d-flex justify-content-end gap-2">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitting || message.trim().length < 5}
                className="px-4"
              >
                <i className="bi bi-send me-2" aria-hidden="true"></i>
                Submit Feedback
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
