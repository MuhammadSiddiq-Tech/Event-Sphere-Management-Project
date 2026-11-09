/**
 * @fileoverview User Profile and Account Settings Page.
 * Supports updating personal info (name, phone, avatarUrl) and changing password.
 * T-2.14. FR-AUTH-06.
 */

import React, { useState } from 'react';
import { Container, Row, Col, Form, Alert, Badge } from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/axios.js';
import { Button, Input, PasswordInput, Card, StatusPill, useToast } from '../../components/ui/index.js';
import { exportUserData, updateUserConsent, deleteUserAccount } from '../../api/users.js';
import { formatDate } from '../../lib/dateUtils.js';
import { Modal } from 'react-bootstrap';

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

  // Privacy & Consent state
  const [marketingConsent, setMarketingConsent] = useState(user?.consent?.marketing || false);
  const [analyticsConsent, setAnalyticsConsent] = useState(user?.consent?.analytics ?? true);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [consentSuccess, setConsentSuccess] = useState('');
  const [consentError, setConsentError] = useState('');

  // Data Export state
  const [isExporting, setIsExporting] = useState(false);

  // Account Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const onConsentSubmit = async (e) => {
    e.preventDefault();
    setConsentError('');
    setConsentSuccess('');
    try {
      setIsUpdatingConsent(true);
      await updateUserConsent({
        marketing: marketingConsent,
        analytics: analyticsConsent,
      });
      setConsentSuccess('Privacy preferences updated successfully.');
      toast?.success?.('Privacy preferences saved.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update preferences.';
      setConsentError(msg);
      toast?.error?.(msg);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventsphere-export-${user?.id || 'me'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast?.success?.('Your personal data export has started downloading.');
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion.');
      return;
    }
    setDeleteError('');
    try {
      setIsDeleting(true);
      await deleteUserAccount(deletePassword);
      toast?.success?.('Your account has been deleted and personal data anonymized.');
      await logout();
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Incorrect password or deletion failed.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* Row 2: Privacy, Consent & Data Controls (GDPR T-9.1) */}
      <Row className="g-4 mt-1">
        {/* Consent Preferences */}
        <Col lg={6}>
          <Card
            title="Privacy & Consent Preferences"
            subtitle="Manage your communication and data processing consents."
          >
            {consentSuccess && (
              <Alert variant="success" className="py-2 small" role="status">
                <i className="bi bi-check-circle-fill me-2"></i>
                {consentSuccess}
              </Alert>
            )}

            {consentError && (
              <Alert variant="danger" className="py-2 small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {consentError}
              </Alert>
            )}

            <Form onSubmit={onConsentSubmit}>
              <div className="mb-3 p-3 bg-light rounded border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold text-dark small">Privacy Policy</span>
                  <Badge bg="success-subtle" text="success-emphasis" className="border">
                    Accepted
                  </Badge>
                </div>
                <div className="text-muted small">
                  Accepted on {user?.consent?.acceptedAt ? formatDate(user.consent.acceptedAt) : 'registration'}.{' '}
                  <Link to="/privacy" className="text-primary text-decoration-none">
                    Read Privacy Policy →
                  </Link>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="marketingConsentSwitch"
                  label="Marketing & Event Announcements"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                />
                <Form.Text className="text-muted small">
                  Receive curated notifications about upcoming expos, workshops, and speaker announcements.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Check
                  type="switch"
                  id="analyticsConsentSwitch"
                  label="Platform Analytics & Performance Tracking"
                  checked={analyticsConsent}
                  onChange={(e) => setAnalyticsConsent(e.target.checked)}
                />
                <Form.Text className="text-muted small">
                  Allow anonymized interactions to help organizers optimize event schedules and booth layouts.
                </Form.Text>
              </Form.Group>

              <div className="d-flex justify-content-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isUpdatingConsent}
                >
                  Save Preferences
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Data Portability & Account Deletion */}
        <Col lg={6}>
          <Card
            title="Your Data & Account Deletion"
            subtitle="GDPR rights: download your information or permanently delete your account."
          >
            <div className="mb-4 p-3 bg-light rounded border">
              <h6 className="fw-bold text-dark mb-1">
                <i className="bi bi-download text-primary me-2" />
                Data Portability (Export)
              </h6>
              <p className="text-muted small mb-2">
                Download a complete JSON export of your personal information, registrations, applications, and bookmarks.
              </p>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExportData}
                loading={isExporting}
              >
                <i className="bi bi-file-earmark-arrow-down me-1" />
                Download My Data (JSON)
              </Button>
            </div>

            <div className="p-3 bg-danger-subtle rounded border border-danger-subtle">
              <h6 className="fw-bold text-danger mb-1">
                <i className="bi bi-exclamation-triangle text-danger me-2" />
                Delete Account (Right to Erasure)
              </h6>
              <p className="text-muted small mb-2">
                Permanently delete your account. All personally identifiable information will be irreversibly anonymized.
              </p>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  setDeleteError('');
                  setDeletePassword('');
                  setShowDeleteModal(true);
                }}
              >
                <i className="bi bi-trash me-1" />
                Delete Account…
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Delete Account Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)} centered>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title className="h5 fw-bold text-danger">Confirm Account Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="text-muted small mb-3">
            This action is <strong>irreversible</strong>. Your profile details, contact emails, and personal activity will be permanently anonymized in accordance with GDPR regulations.
          </p>
          {deleteError && (
            <Alert variant="danger" className="py-2 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {deleteError}
            </Alert>
          )}
          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold text-dark">
              Confirm your password to proceed:
            </Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your current password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            loading={isDeleting}
          >
            Permanently Delete Account
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
