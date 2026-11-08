/**
 * @fileoverview Forgot Password Request Page.
 * Dispatches password reset email without user enumeration (FR-AUTH-04).
 * T-2.13.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiClient } from '../../lib/axios.js';
import { Input, Button } from '../../components/ui/index.js';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', {
        email: data.email.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      // Non-enumerating fallback
      const msg = err.response?.data?.error?.message || 'Unable to submit request. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5 my-sm-4">
      <Row className="justify-content-center">
        <Col md={8} lg={5} xl={4}>
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-dark mb-1">Reset Password</h1>
            <p className="text-muted small">
              Enter your account email to receive a password recovery link
            </p>
          </div>

          <Card className="shadow-sm border-0 rounded-3 p-3 p-sm-4">
            <Card.Body>
              {submitted ? (
                <div className="text-center py-3">
                  <div className="text-success mb-3">
                    <i className="bi bi-check-circle-fill display-4"></i>
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-2">Check Your Inbox</h2>
                  <p className="text-muted small mb-4">
                    If that email is registered, you will receive a password reset link shortly.
                    The link will expire in 30 minutes.
                  </p>
                  <Button as={Link} to="/login" variant="primary" className="w-100">
                    Back to Login
                  </Button>
                </div>
              ) : (
                <>
                  {errorMessage && (
                    <Alert variant="danger" className="py-2 small" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {errorMessage}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      error={errors.email}
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Please enter a valid email address',
                        },
                      })}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100 py-2 fw-semibold mt-2"
                      loading={isSubmitting}
                    >
                      Send Reset Link
                    </Button>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <Link to="/login" className="small text-muted text-decoration-none d-inline-flex align-items-center gap-1">
              <i className="bi bi-arrow-left"></i>
              Back to Sign in
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
