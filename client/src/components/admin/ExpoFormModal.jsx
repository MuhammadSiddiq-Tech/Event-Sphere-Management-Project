/**
 * @fileoverview Modal form for creating and editing expos.
 * Supports metadata, dates, venue details, capacity, and banner file upload.
 * T-3.11. FR-EXPO-01/02, Design §7.4.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  InputGroup,
} from 'react-bootstrap';
import { Button } from '../ui/index.js';
import { createExpo, updateExpo, uploadBanner } from '../../api/expos.js';

export function ExpoFormModal({ show, onHide, expo = null, onSuccess }) {
  const isEditing = Boolean(expo);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '',
    startDate: '',
    endDate: '',
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueCountry: '',
    venueLat: '',
    venueLng: '',
    maxBooths: 100,
    bannerUrl: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [serverError, setServerError] = useState('');

  // Reset or prefill form data when modal opens or expo changes
  useEffect(() => {
    if (expo) {
      setFormData({
        title: expo.title || '',
        category: expo.category || '',
        description: expo.description || '',
        tags: Array.isArray(expo.tags) ? expo.tags.join(', ') : '',
        startDate: expo.startDate ? expo.startDate.substring(0, 10) : '',
        endDate: expo.endDate ? expo.endDate.substring(0, 10) : '',
        venueName: expo.venue?.name || '',
        venueAddress: expo.venue?.address || '',
        venueCity: expo.venue?.city || '',
        venueCountry: expo.venue?.country || '',
        venueLat: expo.venue?.coordinates?.lat ?? '',
        venueLng: expo.venue?.coordinates?.lng ?? '',
        maxBooths: expo.maxBooths || 100,
        bannerUrl: expo.bannerUrl || '',
      });
    } else {
      setFormData({
        title: '',
        category: '',
        description: '',
        tags: '',
        startDate: '',
        endDate: '',
        venueName: '',
        venueAddress: '',
        venueCity: '',
        venueCountry: '',
        venueLat: '',
        venueLng: '',
        maxBooths: 100,
        bannerUrl: '',
      });
    }
    setErrors({});
    setServerError('');
  }, [expo, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        bannerUrl: 'Banner image must be under 5 MB.',
      }));
      return;
    }

    setUploadingBanner(true);
    setServerError('');
    try {
      const result = await uploadBanner(file);
      setFormData((prev) => ({ ...prev, bannerUrl: result.url }));
      setErrors((prev) => ({ ...prev, bannerUrl: null }));
    } catch (err) {
      setServerError(
        err.response?.data?.error?.message || 'Failed to upload banner image.'
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters.';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date cannot be earlier than start date.';
      }
    }

    if (formData.venueLat !== '') {
      const lat = parseFloat(formData.venueLat);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.venueLat = 'Latitude must be between -90 and 90.';
      }
    }

    if (formData.venueLng !== '') {
      const lng = parseFloat(formData.venueLng);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.venueLng = 'Longitude must be between -180 and 180.';
      }
    }

    if (formData.maxBooths < 1) {
      newErrors.maxBooths = 'Maximum booths must be at least 1.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    const payload = {
      title: formData.title.trim(),
      category: formData.category.trim() || undefined,
      description: formData.description.trim() || undefined,
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      maxBooths: Number(formData.maxBooths) || 100,
      bannerUrl: formData.bannerUrl.trim() || undefined,
      venue: {
        name: formData.venueName.trim() || undefined,
        address: formData.venueAddress.trim() || undefined,
        city: formData.venueCity.trim() || undefined,
        country: formData.venueCountry.trim() || undefined,
        coordinates:
          formData.venueLat !== '' && formData.venueLng !== ''
            ? {
                lat: parseFloat(formData.venueLat),
                lng: parseFloat(formData.venueLng),
              }
            : undefined,
      },
    };

    try {
      if (isEditing) {
        const expoId = expo.id || expo._id;
        await updateExpo(expoId, payload);
      } else {
        await createExpo(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setServerError(
        err.response?.data?.error?.message ||
          'Failed to save expo. Please check the inputs and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={!submitting}>
      <Modal.Header closeButton={!submitting}>
        <Modal.Title className="h5 fw-bold text-dark">
          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
          {isEditing ? 'Edit Expo' : 'Create New Expo'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {serverError && (
            <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4">
              <i className="bi bi-exclamation-triangle-fill" />
              <span>{serverError}</span>
            </Alert>
          )}

          {/* ── Section: Basic Information ── */}
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-info-circle me-1" /> Basic Details
          </h6>
          <Row className="g-3 mb-4">
            <Col md={8}>
              <Form.Group controlId="expo-title">
                <Form.Label className="fw-semibold small">
                  Expo Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  isInvalid={!!errors.title}
                  placeholder="e.g. Global Tech Expo 2026"
                  disabled={submitting}
                  autoFocus
                />
                <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="expo-category">
                <Form.Label className="fw-semibold small">Category / Theme</Form.Label>
                <Form.Control
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g. Technology"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="expo-description">
                <Form.Label className="fw-semibold small">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detailed overview of the event, themes, and expected attendance…"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col md={8}>
              <Form.Group controlId="expo-tags">
                <Form.Label className="fw-semibold small">Tags (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="AI, Cloud, Robotics, Cybersecurity"
                  disabled={submitting}
                />
                <Form.Text className="text-muted small">
                  Separate tags with commas.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="expo-maxBooths">
                <Form.Label className="fw-semibold small">Max Booths</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="1000"
                  name="maxBooths"
                  value={formData.maxBooths}
                  onChange={handleChange}
                  isInvalid={!!errors.maxBooths}
                  disabled={submitting}
                />
                <Form.Control.Feedback type="invalid">{errors.maxBooths}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* ── Section: Dates ── */}
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-calendar3 me-1" /> Schedule Dates
          </h6>
          <Row className="g-3 mb-4">
            <Col sm={6}>
              <Form.Group controlId="expo-startDate">
                <Form.Label className="fw-semibold small">Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col sm={6}>
              <Form.Group controlId="expo-endDate">
                <Form.Label className="fw-semibold small">End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  isInvalid={!!errors.endDate}
                  disabled={submitting}
                />
                <Form.Control.Feedback type="invalid">{errors.endDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* ── Section: Venue ── */}
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-geo-alt me-1" /> Venue &amp; Location
          </h6>
          <Row className="g-3 mb-4">
            <Col md={6}>
              <Form.Group controlId="expo-venueName">
                <Form.Label className="fw-semibold small">Venue Name</Form.Label>
                <Form.Control
                  type="text"
                  name="venueName"
                  value={formData.venueName}
                  onChange={handleChange}
                  placeholder="e.g. Dubai World Trade Centre"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group controlId="expo-venueAddress">
                <Form.Label className="fw-semibold small">Street Address</Form.Label>
                <Form.Control
                  type="text"
                  name="venueAddress"
                  value={formData.venueAddress}
                  onChange={handleChange}
                  placeholder="e.g. Sheikh Zayed Road"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col sm={6}>
              <Form.Group controlId="expo-venueCity">
                <Form.Label className="fw-semibold small">City</Form.Label>
                <Form.Control
                  type="text"
                  name="venueCity"
                  value={formData.venueCity}
                  onChange={handleChange}
                  placeholder="e.g. Dubai"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col sm={6}>
              <Form.Group controlId="expo-venueCountry">
                <Form.Label className="fw-semibold small">Country</Form.Label>
                <Form.Control
                  type="text"
                  name="venueCountry"
                  value={formData.venueCountry}
                  onChange={handleChange}
                  placeholder="e.g. UAE"
                  disabled={submitting}
                />
              </Form.Group>
            </Col>

            <Col sm={6}>
              <Form.Group controlId="expo-venueLat">
                <Form.Label className="fw-semibold small">Latitude (optional)</Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  name="venueLat"
                  value={formData.venueLat}
                  onChange={handleChange}
                  isInvalid={!!errors.venueLat}
                  placeholder="25.2048"
                  disabled={submitting}
                />
                <Form.Control.Feedback type="invalid">{errors.venueLat}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col sm={6}>
              <Form.Group controlId="expo-venueLng">
                <Form.Label className="fw-semibold small">Longitude (optional)</Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  name="venueLng"
                  value={formData.venueLng}
                  onChange={handleChange}
                  isInvalid={!!errors.venueLng}
                  placeholder="55.2708"
                  disabled={submitting}
                />
                <Form.Control.Feedback type="invalid">{errors.venueLng}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* ── Section: Banner Image Upload ── */}
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            <i className="bi bi-image me-1" /> Banner Image
          </h6>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group controlId="expo-bannerFile" className="mb-2">
                <Form.Label className="fw-semibold small">Upload Banner File (JPG, PNG, WebP ≤ 5 MB)</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    disabled={submitting || uploadingBanner}
                  />
                  {uploadingBanner && (
                    <InputGroup.Text>
                      <Spinner animation="border" size="sm" variant="primary" />
                    </InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group controlId="expo-bannerUrl">
                <Form.Label className="fw-semibold small">Or Direct Image URL</Form.Label>
                <Form.Control
                  type="url"
                  name="bannerUrl"
                  value={formData.bannerUrl}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/…"
                  isInvalid={!!errors.bannerUrl}
                  disabled={submitting || uploadingBanner}
                />
                <Form.Control.Feedback type="invalid">{errors.bannerUrl}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {formData.bannerUrl && (
              <Col md={12}>
                <div className="border rounded p-2 bg-light d-flex align-items-center gap-3">
                  <img
                    src={formData.bannerUrl}
                    alt="Banner preview"
                    className="rounded object-fit-cover"
                    style={{ width: '120px', height: '60px', objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1 small text-truncate text-muted">
                    {formData.bannerUrl}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onClick={() => setFormData((prev) => ({ ...prev, bannerUrl: '' }))}
                    disabled={submitting}
                  >
                    <i className="bi bi-trash" /> Remove
                  </Button>
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEditing ? 'Save Changes' : 'Create Expo'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
