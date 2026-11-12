/**
 * @fileoverview User Login Page.
 * Split-screen editorial Swiss-grid layout with Obsidian Navy & Electric Lime accents.
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
    <Container className="py-5 my-lg-3">
      <Row className="justify-content-center">
        <Col lg={10} xl={9}>
          <Card
            className="border-0 shadow-sm rounded-4 overflow-hidden"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <Row className="g-0">
              {/* Left Editorial Brand Panel (Desktop) */}
              <Col
                lg={5}
                className="d-none d-lg-flex flex-column justify-content-between bg-navy text-white p-5 position-relative"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 85% 15%, rgba(0, 87, 255, 0.45), transparent 50%), radial-gradient(circle at 15% 90%, rgba(217, 249, 91, 0.15), transparent 45%)',
                }}
              >
                <div>
                  <span className="badge bg-lime text-dark fw-bold text-uppercase px-3 py-2 rounded-pill mb-4" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                    Member Access
                  </span>
                  <h2 className="fw-bold display-6 text-white mb-3" style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    Step back into the <span className="text-lime">live</span> expo floor<span className="text-lime">.</span>
                  </h2>
                  <p className="text-white-50 small mb-0">
                    Manage your booth reservations, personal session agenda, and real-time organizer updates from one unified workspace.
                  </p>
                </div>

                <div className="pt-4 border-top border-white border-opacity-10">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary text-white flex-shrink-0"
                      style={{ width: '40px', height: '40px' }}
                    >
                      <i className="bi bi-shield-check fs-5"></i>
                    </div>
                    <div>
                      <div className="small fw-bold text-white">Role-Based Workspaces</div>
                      <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                        Instant routing for Organizers, Exhibitors &amp; Attendees
                      </div>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Right Login Form Panel */}
              <Col lg={7} className="bg-white p-4 p-sm-5">
                <div className="mb-4">
                  <span className="text-uppercase fw-bold text-primary small">
                    Account Sign In
                  </span>
                  <h1 className="h3 fw-bold text-dark mt-1 mb-1">Welcome Back</h1>
                  <p className="text-secondary small mb-0">
                    Enter your credentials to access your EventSphere portal
                  </p>
                </div>

                {serverError && (
                  <Alert variant="danger" className="py-2 small rounded-3 border-0" role="alert">
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
                    className="w-100 py-2 rounded-pill fw-semibold"
                    loading={isSubmitting}
                  >
                    Sign In <i className="bi bi-arrow-right ms-1"></i>
                  </Button>
                </Form>

                <div className="text-center mt-4 pt-3 border-top">
                  <span className="text-secondary small">Don&apos;t have an account? </span>
                  <Link to="/register" className="small text-primary text-decoration-none fw-bold">
                    Create a free account
                  </Link>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}