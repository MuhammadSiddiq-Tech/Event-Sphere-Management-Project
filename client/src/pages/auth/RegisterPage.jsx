/**
 * @fileoverview User Registration Page.
 * Split-screen editorial Swiss-grid layout with interactive role selector cards.
 * Supports Attendee and Exhibitor registration (Rule BR-1: Admin cannot register publicly).
 * Enforces explicit privacy policy consent and password requirements.
 * T-2.13. FR-AUTH-01, BR-1.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
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
    <Container className="py-5 my-lg-2">
      <Row className="justify-content-center">
        <Col lg={11} xl={10}>
          <Card
            className="border-0 shadow-sm rounded-4 overflow-hidden"
            style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
          >
            <Row className="g-0">
              {/* Left Dynamic Editorial Brand Panel (Desktop) */}
              <Col
                lg={5}
                className="d-none d-lg-flex flex-column justify-content-between bg-navy text-white p-5 position-relative"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 85% 20%, rgba(0, 87, 255, 0.45), transparent 50%), radial-gradient(circle at 15% 85%, rgba(217, 249, 91, 0.16), transparent 45%)',
                }}
              >
                <div>
                  <span
                    className="badge bg-lime text-dark fw-bold text-uppercase px-3 py-2 rounded-pill mb-4"
                    style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}
                  >
                    {selectedRole === 'exhibitor' ? 'Exhibitor Onboarding' : 'Attendee Pass'}
                  </span>

                  <h2
                    className="fw-bold display-6 text-white mb-3"
                    style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
                  >
                    {selectedRole === 'exhibitor' ? (
                      <>
                        Showcase your brand on the <span className="text-lime">main</span> floor<span className="text-lime">.</span>
                      </>
                    ) : (
                      <>
                        Curate your <span className="text-lime">live</span> conference experience<span className="text-lime">.</span>
                      </>
                    )}
                  </h2>

                  <p className="text-white-50 small mb-4">
                    {selectedRole === 'exhibitor'
                      ? 'Apply to global trade shows, select prime booth coordinates on interactive floor maps, and connect with verified buyers.'
                      : 'Discover upcoming expos, bookmark keynote sessions to your personal agenda, and explore interactive venue directories.'}
                  </p>

                  {/* Dynamic Perks List */}
                  <div className="d-flex flex-column gap-3 mt-4">
                    {(selectedRole === 'exhibitor'
                      ? [
                          { icon: 'bi-bounding-box', text: 'Real-time interactive booth selection & hold' },
                          { icon: 'bi-briefcase', text: 'Dedicated company showcase profile' },
                          { icon: 'bi-chat-dots', text: 'Direct messaging with organizers & leads' },
                        ]
                      : [
                          { icon: 'bi-ticket-perforated', text: 'Instant digital expo pass & session booking' },
                          { icon: 'bi-calendar-check', text: 'Personalized conflict-free event agenda' },
                          { icon: 'bi-building', text: 'Full access to exhibitor & booth directories' },
                        ]
                    ).map((perk) => (
                      <div key={perk.text} className="d-flex align-items-center gap-3">
                        <span
                          className="d-inline-flex align-items-center justify-content-center rounded-2 bg-white bg-opacity-10 text-lime flex-shrink-0"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <i className={`bi ${perk.icon}`}></i>
                        </span>
                        <span className="small text-white-50">{perk.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-top border-white border-opacity-10">
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                    Already registered on EventSphere?{' '}
                    <Link to="/login" className="text-lime fw-bold text-decoration-none">
                      Sign in here &rarr;
                    </Link>
                  </div>
                </div>
              </Col>

              {/* Right Registration Form Panel */}
              <Col lg={7} className="bg-white p-4 p-sm-5">
                <div className="mb-4">
                  <span className="text-uppercase fw-bold text-primary small">
                    Get Started Free
                  </span>
                  <h1 className="h3 fw-bold text-dark mt-1 mb-1">Create Your Account</h1>
                  <p className="text-secondary small mb-0">
                    Choose your workspace role and complete your profile
                  </p>
                </div>

                {serverError && (
                  <Alert variant="danger" className="py-2 small rounded-3 border-0" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {serverError}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                  {/* Interactive Editorial Role Cards */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small d-block mb-2">
                      Select Account Type
                    </Form.Label>
                    <Controller
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <Row className="g-2">
                          <Col xs={6}>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label="Attendee / Visitor"
                              onClick={() => field.onChange('attendee')}
                              onKeyDown={(e) => e.key === 'Enter' && field.onChange('attendee')}
                              className={`p-3 rounded-3 border transition-all h-100 ${
                                field.value === 'attendee'
                                  ? 'border-primary bg-primary-subtle'
                                  : 'bg-white'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <i className="bi bi-person-badge fs-5 text-primary"></i>
                                {field.value === 'attendee' && (
                                  <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.65rem' }}>
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="fw-bold small text-dark">Attendee</div>
                              <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                                Visit expos &amp; book sessions
                              </div>
                            </div>
                          </Col>

                          <Col xs={6}>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label="Exhibitor / Company"
                              onClick={() => field.onChange('exhibitor')}
                              onKeyDown={(e) => e.key === 'Enter' && field.onChange('exhibitor')}
                              className={`p-3 rounded-3 border transition-all h-100 ${
                                field.value === 'exhibitor'
                                  ? 'border-primary bg-primary-subtle'
                                  : 'bg-white'
                              }`}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <i className="bi bi-briefcase fs-5 text-primary"></i>
                                {field.value === 'exhibitor' && (
                                  <span className="badge bg-lime text-dark rounded-pill" style={{ fontSize: '0.65rem' }}>
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="fw-bold small text-dark">Exhibitor</div>
                              <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                                Reserve booths &amp; exhibit
                              </div>
                            </div>
                          </Col>
                        </Row>
                      )}
                    />
                  </Form.Group>

                  {/* Name & Phone Row */}
                  <Row className="g-3">
                    <Col sm={6}>
                      <Input
                        label={selectedRole === 'exhibitor' ? 'Contact Representative' : 'Full Name'}
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
                    </Col>

                    <Col sm={6}>
                      <Input
                        label="Phone (Optional)"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        autoComplete="tel"
                        error={errors.phone}
                        {...register('phone')}
                      />
                    </Col>
                  </Row>

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
                        helperText="At least 8 characters including 1 letter and 1 number."
                      />
                    )}
                  />

                  {/* Privacy Consent (Strictly Required - Rule BR-1 / FR-AUTH-01) */}
                  <Form.Group className="mb-2 mt-3" controlId="privacyAccepted">
                    <Form.Check
                      type="checkbox"
                      id="privacyAccepted"
                      isInvalid={Boolean(errors.privacyAccepted)}
                      {...register('privacyAccepted', {
                        required: 'You must accept the Privacy Policy to create an account',
                      })}
                      label={
                        <span className="small text-secondary">
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
                        <span className="small text-secondary">
                          Send me updates on upcoming trade shows and event announcements.
                        </span>
                      }
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 py-2 rounded-pill fw-semibold"
                    loading={isSubmitting}
                  >
                    Create {selectedRole === 'exhibitor' ? 'Exhibitor' : 'Attendee'} Account{' '}
                    <i className="bi bi-arrow-right ms-1"></i>
                  </Button>
                </Form>

                <div className="text-center mt-4 pt-3 border-top d-lg-none">
                  <span className="text-secondary small">Already have an account? </span>
                  <Link to="/login" className="small text-primary text-decoration-none fw-bold">
                    Sign in
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