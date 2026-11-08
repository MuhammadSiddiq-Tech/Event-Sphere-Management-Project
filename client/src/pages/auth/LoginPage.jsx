/**
 * @fileoverview User Login Page.
 * Authenticates with email and password, stores JWT access token in memory,
 * and redirects to the role-specific dashboard or requested return URL.
 * T-2.13. FR-AUTH-02, NFR-SEC-02.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input, PasswordInput, Button } from '../../components/ui/index.js';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getRedirectPath = (role) => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login') return from;
    if (role === 'admin') return '/admin';
    if (role === 'exhibitor') return '/exhibitor';
    return '/attendee';
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRedirectPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const loggedInUser = await login({
        email: data.email.trim(),
        password: data.password,
      });
      navigate(getRedirectPath(loggedInUser.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        'Unable to log in. Please check your credentials and try again.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5 my-sm-4">
      <Row className="justify-content-center">
        <Col md={8} lg={5} xl={4}>
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-dark mb-1">Welcome Back</h1>
            <p className="text-muted small">Sign in to your EventSphere account</p>
          </div>

          <Card className="shadow-sm border-0 rounded-3 p-3 p-sm-4">
            <Card.Body>
              {serverError && (
                <Alert variant="danger" className="py-2 small" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {serverError}
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

                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  required
                  error={errors.password}
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />

                <div className="d-flex justify-content-end mb-4">
                  <Link
                    to="/forgot-password"
                    className="small text-primary text-decoration-none fw-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 py-2 fw-semibold"
                  loading={isSubmitting}
                >
                  Sign In
                </Button>
              </Form>
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <span className="text-muted small">Don't have an account? </span>
            <Link to="/register" className="small text-primary text-decoration-none fw-bold">
              Create an account
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
