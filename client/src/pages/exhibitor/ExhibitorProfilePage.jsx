/**
 * @fileoverview Exhibitor Profile Management Page.
 * T-4.7. FR-EXP-02.
 * Allows exhibitors to edit company profile, logo, contacts, staff, documents,
 * products, and social links with a visual Profile Completeness Meter.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, ProgressBar, Alert, Badge } from 'react-bootstrap';
import { Button, Input, useToast } from '../../components/ui/index.js';
import {
  fetchMyExhibitorProfile,
  updateMyExhibitorProfile,
  uploadFile,
} from '../../api/exhibitors.js';

export const EXHIBITOR_CATEGORIES = [
  'technology',
  'healthcare',
  'education',
  'finance',
  'retail',
  'manufacturing',
  'food-beverage',
  'entertainment',
  'automotive',
  'real-estate',
  'other',
];

/**
 * Calculates profile completeness percentage (0 to 100).
 * @param {Object} p - profile state
 * @returns {number}
 */
export function calculateCompleteness(p) {
  let score = 0;
  if (p.companyName?.trim()) score += 15;
  if (p.category?.trim()) score += 15;
  if (p.description?.trim()) score += 15;
  if (p.website?.trim()) score += 10;
  if (p.logo?.trim()) score += 15;
  if (Array.isArray(p.products) && p.products.length > 0) score += 10;
  if (Array.isArray(p.contacts) && p.contacts.length > 0) score += 10;
  if (Array.isArray(p.staff) && p.staff.length > 0) score += 10;
  return Math.min(100, score);
}

export default function ExhibitorProfilePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [productInput, setProductInput] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    category: 'technology',
    description: '',
    website: '',
    logo: '',
    products: [],
    contacts: [],
    staff: [],
    documents: [],
    socialLinks: { linkedin: '', twitter: '', instagram: '', facebook: '' },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchMyExhibitorProfile();
      if (data) {
        setForm({
          companyName: data.companyName || '',
          category: data.category || 'technology',
          description: data.description || '',
          website: data.website || '',
          logo: data.logo || '',
          products: data.products || [],
          contacts: data.contacts || [],
          staff: data.staff || [],
          documents: data.documents || [],
          socialLinks: {
            linkedin: data.socialLinks?.linkedin || '',
            twitter: data.socialLinks?.twitter || '',
            instagram: data.socialLinks?.instagram || '',
            facebook: data.socialLinks?.facebook || '',
          },
        });
      }
    } catch (err) {
      // 404 is normal for newly registered exhibitor who hasn't saved yet
      if (err.response?.status !== 404) {
        toast?.error?.(err.response?.data?.error?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.companyName.trim()) {
      toast?.error?.('Company name is required.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateMyExhibitorProfile(form);
      toast?.success?.('Profile updated successfully!');
      if (updated) {
        setForm((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast?.error?.('Logo image must be smaller than 2MB');
      return;
    }
    try {
      setUploadingLogo(true);
      const res = await uploadFile(file);
      setForm((prev) => ({ ...prev, logo: res.url }));
      toast?.success?.('Logo uploaded');
    } catch (err) {
      toast?.error?.('Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast?.error?.('Document file must be smaller than 10MB');
      return;
    }
    try {
      setUploadingDoc(true);
      const res = await uploadFile(file);
      const newDoc = {
        url: res.url,
        filename: file.name,
        type: file.type || 'document',
      };
      setForm((prev) => ({
        ...prev,
        documents: [...prev.documents, newDoc],
      }));
      toast?.success?.('Document uploaded');
    } catch (err) {
      toast?.error?.('Document upload failed');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Products
  const addProduct = () => {
    if (!productInput.trim()) return;
    if (form.products.includes(productInput.trim())) return;
    setForm((prev) => ({ ...prev, products: [...prev.products, productInput.trim()] }));
    setProductInput('');
  };

  const removeProduct = (idx) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));
  };

  // Contacts repeater
  const addContact = () => {
    setForm((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', email: '', phone: '', role: '' }],
    }));
  };

  const updateContact = (idx, field, val) => {
    setForm((prev) => {
      const copy = [...prev.contacts];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, contacts: copy };
    });
  };

  const removeContact = (idx) => {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx),
    }));
  };

  // Staff repeater
  const addStaff = () => {
    setForm((prev) => ({
      ...prev,
      staff: [...prev.staff, { name: '', title: '', email: '', phone: '', bio: '' }],
    }));
  };

  const updateStaff = (idx, field, val) => {
    setForm((prev) => {
      const copy = [...prev.staff];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, staff: copy };
    });
  };

  const removeStaff = (idx) => {
    setForm((prev) => ({
      ...prev,
      staff: prev.staff.filter((_, i) => i !== idx),
    }));
  };

  const completeness = calculateCompleteness(form);
  const progressBarVariant =
    completeness >= 80 ? 'success' : completeness >= 50 ? 'warning' : 'danger';

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header & Completeness Meter */}
      <Row className="mb-4 align-items-center">
        <Col md={7}>
          <h2 className="fw-bold mb-1">Company Profile</h2>
          <p className="text-muted mb-0">
            Manage public company presence, staff roster, documents, and product showcases.
          </p>
        </Col>
        <Col md={5} className="mt-3 mt-md-0">
          <Card className="shadow-sm border-0 p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-bold small text-uppercase">Profile Completeness</span>
              <span className={`fw-bold text-${progressBarVariant}`}>{completeness}%</span>
            </div>
            <ProgressBar
              now={completeness}
              variant={progressBarVariant}
              style={{ height: '8px' }}
              className="rounded"
              aria-label="Profile completeness"
            />
            {completeness < 100 && (
              <small className="text-muted mt-2 d-block">
                Tip: Complete contacts, products, and logo to attract more attendees.
              </small>
            )}
          </Card>
        </Col>
      </Row>

      <Form onSubmit={handleSave}>
        {/* Section 1: Basic Information */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 fw-bold border-bottom">
            <i className="bi bi-building me-2 text-primary"></i> Basic Information
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={7}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Company Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Input
                    name="companyName"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Acme Innovations Corp."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Industry Category</Form.Label>
                  <Form.Select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {EXHIBITOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' & ')}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Website URL</Form.Label>
                  <Input
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </Form.Group>
              </Col>

              <Col md={5} className="d-flex flex-column align-items-center justify-content-center p-3 border-start">
                <Form.Label className="fw-semibold mb-2">Company Logo</Form.Label>
                <div
                  className="rounded-3 border border-2 border-dashed d-flex align-items-center justify-content-center mb-3 bg-light overflow-hidden position-relative"
                  style={{ width: '150px', height: '150px' }}
                >
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Company Logo Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="text-center text-muted p-2">
                      <i className="bi bi-image fs-1 d-block"></i>
                      <small>No Logo</small>
                    </div>
                  )}
                </div>
                <Form.Group controlId="logoUpload">
                  <Form.Control
                    type="file"
                    size="sm"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                </Form.Group>
                {uploadingLogo && <small className="text-muted mt-1">Uploading...</small>}
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Company Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Tell attendees about your company, mission, and what you showcase..."
                    maxLength={2000}
                  />
                  <div className="text-end small text-muted mt-1">
                    {form.description.length} / 2000 characters
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Section 2: Products & Services */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 fw-bold border-bottom">
            <i className="bi bi-box-seam me-2 text-primary"></i> Products & Services
          </Card.Header>
          <Card.Body>
            <p className="text-muted small">
              Add product keywords and solution names to help attendees find you in directory search.
            </p>
            <div className="d-flex gap-2 mb-3">
              <Form.Control
                placeholder="e.g. Cloud ERP, AI Analytics, IoT Sensors"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addProduct();
                  }
                }}
              />
              <Button type="button" variant="outline-primary" onClick={addProduct}>
                Add
              </Button>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {form.products.map((p, idx) => (
                <Badge
                  key={idx}
                  bg="primary"
                  className="p-2 d-flex align-items-center gap-2 fs-6 fw-normal"
                >
                  <span>{p}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label={`Remove ${p}`}
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => removeProduct(idx)}
                  />
                </Badge>
              ))}
              {form.products.length === 0 && (
                <span className="text-muted small fst-italic">No products added yet.</span>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Section 3: Key Contacts */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
            <span className="fw-bold">
              <i className="bi bi-person-lines-fill me-2 text-primary"></i> Key Contacts
            </span>
            <Button type="button" size="sm" variant="outline-primary" onClick={addContact}>
              <i className="bi bi-plus-lg me-1"></i> Add Contact
            </Button>
          </Card.Header>
          <Card.Body>
            {form.contacts.map((contact, idx) => (
              <Row key={idx} className="g-2 mb-3 align-items-center p-2 rounded bg-light border">
                <Col md={3}>
                  <Form.Control
                    size="sm"
                    placeholder="Name"
                    value={contact.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Control
                    size="sm"
                    type="email"
                    placeholder="Email"
                    value={contact.email}
                    onChange={(e) => updateContact(idx, 'email', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Control
                    size="sm"
                    placeholder="Phone"
                    value={contact.phone}
                    onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  />
                </Col>
                <Col md={2}>
                  <Form.Control
                    size="sm"
                    placeholder="Role (e.g. Sales Lead)"
                    value={contact.role}
                    onChange={(e) => updateContact(idx, 'role', e.target.value)}
                  />
                </Col>
                <Col md={1} className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    title="Remove Contact"
                    onClick={() => removeContact(idx)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </Col>
              </Row>
            ))}
            {form.contacts.length === 0 && (
              <p className="text-muted small mb-0 fst-italic">
                No key contacts listed. Add contacts to help organizers and attendees reach you.
              </p>
            )}
          </Card.Body>
        </Card>

        {/* Section 4: Booth Staff Roster */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
            <span className="fw-bold">
              <i className="bi bi-people me-2 text-primary"></i> Booth Staff Roster
            </span>
            <Button type="button" size="sm" variant="outline-primary" onClick={addStaff}>
              <i className="bi bi-plus-lg me-1"></i> Add Staff Member
            </Button>
          </Card.Header>
          <Card.Body>
            {form.staff.map((member, idx) => (
              <Row key={idx} className="g-2 mb-3 p-3 rounded bg-light border">
                <Col md={4}>
                  <Form.Control
                    size="sm"
                    placeholder="Full Name"
                    value={member.name}
                    onChange={(e) => updateStaff(idx, 'name', e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Form.Control
                    size="sm"
                    placeholder="Job Title"
                    value={member.title}
                    onChange={(e) => updateStaff(idx, 'title', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Control
                    size="sm"
                    type="email"
                    placeholder="Email"
                    value={member.email}
                    onChange={(e) => updateStaff(idx, 'email', e.target.value)}
                  />
                </Col>
                <Col md={1} className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    title="Remove Staff"
                    onClick={() => removeStaff(idx)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </Col>
                <Col xs={12} className="mt-2">
                  <Form.Control
                    size="sm"
                    placeholder="Short bio (e.g. Specialist in Enterprise Security)"
                    value={member.bio || ''}
                    onChange={(e) => updateStaff(idx, 'bio', e.target.value)}
                  />
                </Col>
              </Row>
            ))}
            {form.staff.length === 0 && (
              <p className="text-muted small mb-0 fst-italic">
                No booth staff assigned yet. Staff will be displayed on your booth detail popup.
              </p>
            )}
          </Card.Body>
        </Card>

        {/* Section 5: Documents */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 fw-bold border-bottom">
            <i className="bi bi-file-earmark-arrow-up me-2 text-primary"></i> Documents & Brochures
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <Form.Label className="fw-semibold small">Upload document (PDF / JPG / PNG ≤ 10MB)</Form.Label>
              <Form.Control
                type="file"
                onChange={handleDocumentUpload}
                disabled={uploadingDoc}
              />
              {uploadingDoc && <small className="text-muted mt-1 d-block">Uploading document...</small>}
            </div>
            <div className="list-group">
              {form.documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-pdf fs-4 text-danger"></i>
                    <div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="fw-semibold text-decoration-none">
                        {doc.filename || `Document ${idx + 1}`}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        documents: prev.documents.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              ))}
              {form.documents.length === 0 && (
                <p className="text-muted small mb-0 fst-italic">No documents uploaded.</p>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Section 6: Social Links */}
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-white py-3 fw-bold border-bottom">
            <i className="bi bi-globe me-2 text-primary"></i> Social Profiles
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold">LinkedIn</Form.Label>
                <Input
                  value={form.socialLinks.linkedin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      socialLinks: { ...form.socialLinks, linkedin: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/company/your-brand"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Twitter / X</Form.Label>
                <Input
                  value={form.socialLinks.twitter}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      socialLinks: { ...form.socialLinks, twitter: e.target.value },
                    })
                  }
                  placeholder="https://twitter.com/your-brand"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Instagram</Form.Label>
                <Input
                  value={form.socialLinks.instagram}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      socialLinks: { ...form.socialLinks, instagram: e.target.value },
                    })
                  }
                  placeholder="https://instagram.com/your-brand"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-semibold">Facebook</Form.Label>
                <Input
                  value={form.socialLinks.facebook}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      socialLinks: { ...form.socialLinks, facebook: e.target.value },
                    })
                  }
                  placeholder="https://facebook.com/your-brand"
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Action button */}
        <div className="d-flex justify-content-end gap-2 mb-5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={saving}
          >
            Save Profile Changes
          </Button>
        </div>
      </Form>
    </Container>
  );
}
