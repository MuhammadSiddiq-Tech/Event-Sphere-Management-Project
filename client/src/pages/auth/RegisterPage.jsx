/**
 * @fileoverview User Registration Page.
 * Supports Attendee and Exhibitor registration (Rule BR-1: Admin cannot register publicly).
 * Enforces explicit privacy policy consent and password requirements.
 * T-2.13. FR-AUTH-01, BR-1.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Alert, ButtonGroup, Button as BsButton } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input, PasswordInput, Button } from '../../components/ui/index.js';

export default function RegisterPage() {
  const { register: registerAuth, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'attendee',
      phone: '',
      privacyAccepted: false,
      marketingConsent: false,
    },
  });

  const selectedRole = watch('role');

  const getRedirectPath = (role) => {
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
      const registeredUser = await registerAuth({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
        phone: data.phone?.trim() || undefined,
        privacyAccepted: Boolean(data.privacyAccepted),
        marketingConsent: Boolean(data.marketingConsent),
      });
      navigate(getRedirectPath(registeredUser.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        'Registration failed. Please check the information provided.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5 my-sm-4">
      <Row className="justify-content-center">
        <Col md={9} lg={7} xl={5}>
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-dark mb-1">Create Your Account</h1>
            <p className="text-muted small">Join EventSphere as an Attendee or Exhibitor</p>
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
                {/* Role Selector Tabs */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small d-block text-center mb-2">
                    I am registering as an:
                  </Form.Label>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <ButtonGroup className="w-100">
                        <BsButton
                          type="button"
                          variant={field.value === 'attendee' ? 'primary' : 'outline-secondary'}
                          onClick={() => field.onChange('attendee')}
                          className="py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                        >
                          <i className="bi bi-person"></i>
                          Attendee / Visitor
                        </BsButton>
                        <BsButton
                          type="button"
                          variant={field.value === 'exhibitor' ? 'primary' : 'outline-secondary'}
                          onClick={() => field.onChange('exhibitor')}
                          className="py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                        >
                          <i className="bi bi-briefcase"></i>
                          Exhibitor / Company
                        </BsButton>
                      </ButtonGroup>
                    )}
                  />
                  <div className="text-muted text-center mt-2" style={{ fontSize: '0.78rem' }}>
                    {selectedRole === 'attendee'
                      ? 'Browse expos, register for sessions, and save your personal agenda.'
                      : 'Apply to expos, reserve booth locations, and promote your products.'}
                  </div>
                </Form.Group>

                {/* Name */}
                <Input
                  label={selectedRole === 'exhibitor' ? 'Contact Name / Representative' : 'Full Name'}
                  placeholder={selectedRole === 'exhibitor' ? 'Jane Smith' : 'Alex Johnson'}
                  autoComplete="name"
                  required
                  error={errors.name}
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                    maxLength: {
                      value: 80,
                      message: 'Name cannot exceed 80 characters',
                    },
                  })}
                />

                {/* Email */}
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

                {/* Phone (Optional) */}
                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  error={errors.phone}
                  {...register('phone')}
                />

                {/* Password with Strength Meter */}
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                      message: 'Password must contain at least one letter and one number',
                    },
                  }}
                  render={({ field }) => (
                    <PasswordInput
                      label="Password"
                      autoComplete="new-password"
                      required
                      showStrengthMeter
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.password}
                      helperText="Must be at least 8 characters with at least one letter and one number."
                    />
                  )}
                />

                {/* Privacy Consent (Strictly Required - Rule BR-1 / FR-AUTH-01) */}
                <Form.Group className="mb-3" controlId="privacyAccepted">
                  <Form.Check
                    type="checkbox"
                    id="privacyAccepted"
                    isInvalid={Boolean(errors.privacyAccepted)}
                    {...register('privacyAccepted', {
                      required: 'You must accept the Privacy Policy to create an account',
                    })}
                    label={
                      <span className="small text-muted">
                        I agree to the{' '}
                        <Link to="/privacy" target="_blank" className="text-primary text-decoration-none fw-semibold">
                          Privacy Policy
                        </Link>{' '}
                        and terms of service. <span className="text-danger">*</span>
                      </span>
                    }
                  />
                  {errors.privacyAccepted && (
                    <Form.Control.Feedback type="invalid" className="d-block small">
                      {errors.privacyAccepted.message}
                    </Form.Control.Feedback>
                  )}
                </Form.Group>

                {/* Marketing Consent (Optional) */}
                <Form.Group className="mb-4" controlId="marketingConsent">
                  <Form.Check
                    type="checkbox"
                    id="marketingConsent"
                    {...register('marketingConsent')}
                    label={
                      <span className="small text-muted">
                        Send me updates on upcoming trade shows and event announcements.
                      </span>
                    }
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 py-2 fw-semibold"
                  loading={isSubmitting}
                >
                  Create {selectedRole === 'exhibitor' ? 'Exhibitor' : 'Attendee'} Account
                </Button>
              </Form>
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <span className="text-muted small">Already have an account? </span>
            <Link to="/login" className="small text-primary text-decoration-none fw-bold">
              Sign in
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
