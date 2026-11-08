/**
 * @fileoverview User Profile and Account Settings Page.
 * Supports updating personal info (name, phone, avatarUrl) and changing password.
 * T-2.14. FR-AUTH-06.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Form, Alert, Badge } from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/axios.js';
import { Button, Input, PasswordInput, Card, StatusPill, useToast } from '../../components/ui/index.js';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Profile Form
  const {
    handleSubmit: handleProfileSubmit,
    register: registerProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  // Password Form
  const {
    handleSubmit: handlePasswordSubmit,
    control: passwordControl,
    watch: watchPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watchPassword('newPassword');

  // Submit profile updates
  const onProfileSubmit = async (data) => {
    setProfileError('');
    setProfileSuccess('');
    setIsUpdatingProfile(true);

    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone?.trim() || undefined,
        avatarUrl: data.avatarUrl?.trim() || undefined,
      };

      const res = await apiClient.patch('/users/me', payload);
      const updatedUser = res.data?.data;

      if (updatedUser) {
        updateProfile(updatedUser);
      }
      setProfileSuccess('Profile updated successfully.');
      toast?.success('Profile updated successfully.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update profile. Please try again.';
      setProfileError(msg);
      toast?.error(msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Submit password change
  const onPasswordSubmit = async (data) => {
    setPasswordError('');
    setPasswordSuccess('');
    setIsUpdatingPassword(true);

    try {
      await apiClient.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setPasswordSuccess('Password changed successfully. Please log in with your new password.');
      toast?.success('Password updated. Redirecting to login...');
      resetPasswordForm();

      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update password. Please check your current password.';
      setPasswordError(msg);
      toast?.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Container className="py-4 py-lg-5">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
        <div>
          <h1 className="h3 fw-bold text-dark mb-1">Account Settings</h1>
          <p className="text-muted small mb-0">Manage your profile details and security settings</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <StatusPill status={user?.role || 'attendee'} label={`Role: ${user?.role || 'Attendee'}`} />
          {user?.isEmailVerified && (
            <Badge bg="success" className="d-inline-flex align-items-center gap-1">
              <i className="bi bi-patch-check-fill"></i> Verified
            </Badge>
          )}
        </div>
      </div>

      <Row className="g-4">
        {/* Left Column: Personal Information */}
        <Col lg={6}>
          <Card
            title="Personal Information"
            subtitle="Update your basic account details and contact information."
          >
            {profileSuccess && (
              <Alert variant="success" className="py-2 small" role="status">
                <i className="bi bi-check-circle-fill me-2"></i>
                {profileSuccess}
              </Alert>
            )}

            {profileError && (
              <Alert variant="danger" className="py-2 small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {profileError}
              </Alert>
            )}

            <Form onSubmit={handleProfileSubmit(onProfileSubmit)} noValidate>
              <div className="mb-3">
                <Form.Label className="fw-semibold small">Email Address</Form.Label>
                <Form.Control
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  aria-label="Email address (cannot be changed)"
                  className="bg-light text-muted"
                />
                <Form.Text className="text-muted small">
                  Email address cannot be changed directly.
                </Form.Text>
              </div>

              <Input
                label="Full Name"
                id="name"
                required
                error={profileErrors.name}
                {...registerProfile('name', {
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 80, message: 'Name cannot exceed 80 characters' },
                })}
              />

              <Input
                label="Phone Number"
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={profileErrors.phone}
                helperText="Optional. Used for expo coordination and SMS notifications."
                {...registerProfile('phone', {
                  maxLength: { value: 20, message: 'Phone number is too long' },
                })}
              />

              <Input
                label="Avatar URL"
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                error={profileErrors.avatarUrl}
                helperText="Optional image URL for your profile picture."
                {...registerProfile('avatarUrl', {
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL starting with http:// or https://',
                  },
                })}
              />

              <div className="d-flex justify-content-end mt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isUpdatingProfile}
                  disabled={!isProfileDirty && !isUpdatingProfile}
                >
                  Save Changes
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Right Column: Security & Password */}
        <Col lg={6}>
          <Card
            title="Change Password"
            subtitle="Ensure your account uses a strong, unique password."
          >
            {passwordSuccess && (
              <Alert variant="success" className="py-2 small" role="status">
                <i className="bi bi-check-circle-fill me-2"></i>
                {passwordSuccess}
              </Alert>
            )}

            {passwordError && (
              <Alert variant="danger" className="py-2 small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {passwordError}
              </Alert>
            )}

            <Form onSubmit={handlePasswordSubmit(onPasswordSubmit)} noValidate>
              <Controller
                name="currentPassword"
                control={passwordControl}
                rules={{ required: 'Current password is required' }}
                render={({ field }) => (
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    label="Current Password"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={passwordErrors.currentPassword}
                    autoComplete="current-password"
                  />
                )}
              />

              <Controller
                name="newPassword"
                control={passwordControl}
                rules={{
                  required: 'New password is required',
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
                    name="newPassword"
                    label="New Password"
                    required
                    showStrengthMeter
                    value={field.value}
                    onChange={field.onChange}
                    error={passwordErrors.newPassword}
                    autoComplete="new-password"
                    helperText="Must be at least 8 characters with at least one letter and one number."
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={passwordControl}
                rules={{
                  required: 'Please confirm your new password',
                  validate: (val) => val === newPasswordValue || 'Passwords do not match',
                }}
                render={({ field }) => (
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm New Password"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={passwordErrors.confirmPassword}
                    autoComplete="new-password"
                  />
                )}
              />

              <div className="d-flex justify-content-end mt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isUpdatingPassword}
                >
                  Update Password
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
