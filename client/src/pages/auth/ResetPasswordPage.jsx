/**
 * @fileoverview Password Reset Page.
 * Validates reset token from query string and allows setting a new secure password.
 * T-2.13. FR-AUTH-04.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { apiClient } from '../../lib/axios.js';
import { PasswordInput, Button } from '../../components/ui/index.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      setServerError('Reset token is missing or malformed.');
      return;
    }

    setServerError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'Failed to reset password. The link may have expired or already been used.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5 my-sm-4">
      <Row className="justify-content-center">
        <Col md={8} lg={5} xl={4}>
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-dark mb-1">Set New Password</h1>
            <p className="text-muted small">Choose a strong password for your account</p>
          </div>

          <Card className="shadow-sm border-0 rounded-3 p-3 p-sm-4">
            <Card.Body>
              {!token ? (
                <div className="text-center py-3">
                  <Alert variant="warning" className="small text-start">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    No password reset token was found in your link. Please request a new reset link.
                  </Alert>
                  <Button as={Link} to="/forgot-password" variant="primary" className="w-100 mt-2">
                    Request New Link
                  </Button>
                </div>
              ) : isSuccess ? (
                <div className="text-center py-3">
                  <div className="text-success mb-3">
                    <i className="bi bi-check-circle-fill display-4"></i>
                  </div>
                  <h2 className="h5 fw-bold text-dark mb-2">Password Updated!</h2>
                  <p className="text-muted small mb-4">
                    Your password has been changed successfully. Redirecting you to sign in...
                  </p>
                  <Button as={Link} to="/login" variant="primary" className="w-100">
                    Sign In Now
                  </Button>
                </div>
              ) : (
                <>
                  {serverError && (
                    <Alert variant="danger" className="py-2 small" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {serverError}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit(onSubmit)} noValidate>
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
                          id="newPassword"
                          name="password"
                          label="New Password"
                          required
                          showStrengthMeter
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.password}
                          helperText="Must be at least 8 characters with at least one letter and one number."
                        />
                      )}
                    />

                    <Controller
                      name="confirmPassword"
                      control={control}
                      rules={{
                        required: 'Please confirm your new password',
                        validate: (val) => val === newPassword || 'Passwords do not match',
                      }}
                      render={({ field }) => (
                        <PasswordInput
                          id="confirmPassword"
                          name="confirmPassword"
                          label="Confirm New Password"
                          required
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.confirmPassword}
                        />
                      )}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100 py-2 fw-semibold mt-2"
                      loading={isSubmitting}
                    >
                      Update Password
                    </Button>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <Link to="/login" className="small text-muted text-decoration-none">
              Back to Sign in
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
