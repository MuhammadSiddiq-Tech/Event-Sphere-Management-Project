/**
 * @fileoverview Exhibitor Application Wizard.
 * T-4.8. FR-EXP-01.
 * 5-step wizard to apply for an expo:
 *  1. Company Overview (prefilled from profile)
 *  2. Products & Services
 *  3. Booth Preferences (size, requirements, mini floor plan reference)
 *  4. Document Upload (PDF/JPG/PNG <= 10MB)
 *  5. Review & Submit
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Alert, Badge } from 'react-bootstrap';
import { Button, Input, useToast } from '../../components/ui/index.js';
import { fetchExpoById, fetchExpoBySlug, fetchExpoBooths } from '../../api/expos.js';
import { fetchMyExhibitorProfile, uploadFile } from '../../api/exhibitors.js';
import { submitExpoApplication } from '../../api/applications.js';
import { FloorPlan } from '../../components/floorplan/FloorPlan.jsx';

const STEPS = [
  { num: 1, title: 'Company Overview', icon: 'bi-building' },
  { num: 2, title: 'Products & Services', icon: 'bi-box-seam' },
  { num: 3, title: 'Booth Preferences', icon: 'bi-grid-3x3-gap' },
  { num: 4, title: 'Documents', icon: 'bi-file-earmark-arrow-up' },
  { num: 5, title: 'Review & Submit', icon: 'bi-check2-circle' },
];

export default function ApplicationWizardPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expo, setExpo] = useState(null);
  const [booths, setBooths] = useState([]);
  const [submittedApp, setSubmittedApp] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Form State
  const [overview, setOverview] = useState({
    companyName: '',
    category: 'technology',
    website: '',
    description: '',
  });

  const [products, setProducts] = useState([]);
  const [productInput, setProductInput] = useState('');

  const [boothPref, setBoothPref] = useState({
    size: 'medium',
    notes: '',
  });

  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    loadData();
  }, [idOrSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Load Expo
      let expoData;
      try {
        expoData = await fetchExpoById(idOrSlug);
      } catch (e) {
        expoData = await fetchExpoBySlug(idOrSlug);
      }
      setExpo(expoData);

      // 2. Load floor plan booths if available
      try {
        const boothsData = await fetchExpoBooths(expoData.id || expoData._id);
        setBooths(boothsData);
      } catch {
        setBooths([]);
      }

      // 3. Pre-fill from Exhibitor Profile
      try {
        const profile = await fetchMyExhibitorProfile();
        if (profile) {
          setOverview({
            companyName: profile.companyName || '',
            category: profile.category || 'technology',
            website: profile.website || '',
            description: profile.description || '',
          });
          if (Array.isArray(profile.products) && profile.products.length > 0) {
            setProducts(profile.products);
          }
        }
      } catch {
        // No profile exists yet — user can enter fresh
      }
    } catch (err) {
      toast?.error?.(err.response?.data?.error?.message || 'Failed to load expo details');
    } finally {
      setLoading(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast?.error?.('Document file must be smaller than 10MB');
      return;
    }
    try {
      setUploadingDoc(true);
      const res = await uploadFile(file);
      setDocuments((prev) => [
        ...prev,
        {
          url: res.url,
          filename: file.name,
          type: file.type || 'document',
        },
      ]);
      toast?.success?.('Document uploaded');
    } catch {
      toast?.error?.('Failed to upload document');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const addProduct = () => {
    if (!productInput.trim()) return;
    if (products.includes(productInput.trim())) return;
    setProducts([...products, productInput.trim()]);
    setProductInput('');
  };

  const removeProduct = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  const removeDoc = (idx) => {
    setDocuments(documents.filter((_, i) => i !== idx));
  };

  const nextStep = () => {
    if (step === 1 && !overview.companyName.trim()) {
      toast?.error?.('Company name is required.');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast?.error?.('Please accept the expo terms and conditions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        boothPreferences: [boothPref],
        documents,
        note: `Preferred size: ${boothPref.size}. ${boothPref.notes}`,
      };

      const res = await submitExpoApplication(expo.id || expo._id, payload);
      setSubmittedApp(res);
      toast?.success?.('Application submitted successfully!');
    } catch (err) {
      if (err.response?.status === 409) {
        setAlreadyApplied(true);
        toast?.error?.('You have already applied for this expo.');
      } else {
        toast?.error?.(err.response?.data?.error?.message || 'Application submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading wizard...</span>
        </div>
      </Container>
    );
  }

  if (alreadyApplied) {
    return (
      <Container className="py-5">
        <Card className="border-0 shadow-sm p-4 text-center mx-auto" style={{ maxWidth: '600px' }}>
          <i className="bi bi-info-circle text-primary fs-1 mb-3"></i>
          <h3 className="fw-bold">Application Already Submitted</h3>
          <p className="text-muted">
            You have already submitted an application for <strong>{expo?.title}</strong>.
            You can check the review status on your Exhibitor Dashboard.
          </p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button variant="primary" onClick={() => navigate('/exhibitor/applications')}>
              View My Applications
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate(`/expos/${expo?.slug || expo?.id}`)}>
              Back to Expo
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  if (submittedApp) {
    return (
      <Container className="py-5">
        <Card className="border-0 shadow-sm p-4 text-center mx-auto" style={{ maxWidth: '650px' }}>
          <i className="bi bi-check-circle-fill text-success fs-1 mb-3"></i>
          <h2 className="fw-bold">Application Submitted!</h2>
          <p className="text-muted mb-4">
            Your application to participate in <strong>{expo?.title}</strong> has been received with status{' '}
            <Badge bg="warning" className="text-dark">Pending Review</Badge>.
            Organizers will evaluate your submission shortly. Once approved, you will be able to select and reserve your booth space.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button variant="primary" onClick={() => navigate('/exhibitor/applications')}>
              Go to Applications
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate('/exhibitor')}>
              Exhibitor Dashboard
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: '900px' }}>
      {/* Wizard Header */}
      <div className="mb-4">
        <Link to={`/expos/${expo?.slug || expo?.id}`} className="text-muted small text-decoration-none">
          <i className="bi bi-arrow-left me-1"></i> Back to {expo?.title}
        </Link>
        <h2 className="fw-bold mt-2 mb-1">Apply to Exhibit: {expo?.title}</h2>
        <p className="text-muted small">
          Complete the 5 steps below to apply for a booth space at this event.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="d-flex justify-content-between mb-4 position-relative">
        {STEPS.map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              className="text-center flex-fill"
              style={{ cursor: isDone ? 'pointer' : 'default' }}
              onClick={() => isDone && setStep(s.num)}
            >
              <div
                className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-1 ${
                  isDone
                    ? 'bg-success text-white'
                    : isActive
                    ? 'bg-primary text-white fw-bold shadow'
                    : 'bg-light text-muted border'
                }`}
                style={{ width: '38px', height: '38px' }}
              >
                {isDone ? <i className="bi bi-check-lg"></i> : <i className={`bi ${s.icon}`}></i>}
              </div>
              <small className={`d-none d-md-block ${isActive ? 'fw-bold text-primary' : 'text-muted'}`}>
                {s.title}
              </small>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-0 shadow-sm p-4 mb-4">
        {/* Step 1: Company Overview */}
        {step === 1 && (
          <div>
            <h5 className="fw-bold mb-3">Step 1: Company Overview</h5>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Company Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Input
                    value={overview.companyName}
                    onChange={(e) => setOverview({ ...overview, companyName: e.target.value })}
                    placeholder="Enter your registered company name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Industry Category</Form.Label>
                  <Form.Select
                    value={overview.category}
                    onChange={(e) => setOverview({ ...overview, category: e.target.value })}
                  >
                    <option value="technology">Technology & Software</option>
                    <option value="healthcare">Healthcare & Biotech</option>
                    <option value="education">Education & EdTech</option>
                    <option value="finance">Finance & FinTech</option>
                    <option value="retail">Retail & E-commerce</option>
                    <option value="manufacturing">Manufacturing & Robotics</option>
                    <option value="food-beverage">Food & Beverage</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Company Website</Form.Label>
                  <Input
                    type="url"
                    value={overview.website}
                    onChange={(e) => setOverview({ ...overview, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Brief Company Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={overview.description}
                    onChange={(e) => setOverview({ ...overview, description: e.target.value })}
                    placeholder="Provide a concise summary of your organization and core offerings..."
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        )}

        {/* Step 2: Products & Services */}
        {step === 2 && (
          <div>
            <h5 className="fw-bold mb-2">Step 2: Products & Services to Showcase</h5>
            <p className="text-muted small mb-3">
              List the products, solutions, or services you plan to demonstrate at your booth.
            </p>
            <div className="d-flex gap-2 mb-3">
              <Form.Control
                placeholder="e.g. Autonomous Drones, SaaS Suite, CleanTech Battery"
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
            <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded border min-vh-25">
              {products.map((p, idx) => (
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
              {products.length === 0 && (
                <span className="text-muted small fst-italic">
                  Please add at least one product or service you intend to exhibit.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Booth Preferences */}
        {step === 3 && (
          <div>
            <h5 className="fw-bold mb-2">Step 3: Booth Preferences</h5>
            <p className="text-muted small mb-3">
              Select your preferred booth configuration and any specific power, corner, or accessibility needs.
            </p>
            <Row className="g-3 mb-4">
              <Col md={4}>
                <div
                  className={`card h-100 p-3 text-center cursor-pointer border-2 ${
                    boothPref.size === 'small' ? 'border-primary bg-primary bg-opacity-10' : ''
                  }`}
                  onClick={() => setBoothPref({ ...boothPref, size: 'small' })}
                >
                  <i className="bi bi-square fs-1 text-primary mb-2"></i>
                  <h6 className="fw-bold">Small Booth (3×3m)</h6>
                  <small className="text-muted">Standard inline booth, ideal for startups and boutique demos.</small>
                </div>
              </Col>
              <Col md={4}>
                <div
                  className={`card h-100 p-3 text-center cursor-pointer border-2 ${
                    boothPref.size === 'medium' ? 'border-primary bg-primary bg-opacity-10' : ''
                  }`}
                  onClick={() => setBoothPref({ ...boothPref, size: 'medium' })}
                >
                  <i className="bi bi-aspect-ratio fs-1 text-primary mb-2"></i>
                  <h6 className="fw-bold">Medium Booth (6×3m)</h6>
                  <small className="text-muted">Prime walkway location with space for multi-staff demos.</small>
                </div>
              </Col>
              <Col md={4}>
                <div
                  className={`card h-100 p-3 text-center cursor-pointer border-2 ${
                    boothPref.size === 'large' ? 'border-primary bg-primary bg-opacity-10' : ''
                  }`}
                  onClick={() => setBoothPref({ ...boothPref, size: 'large' })}
                >
                  <i className="bi bi-grid fs-1 text-primary mb-2"></i>
                  <h6 className="fw-bold">Large Island (6×6m)</h6>
                  <small className="text-muted">High-impact 4-sided island for enterprise showcases.</small>
                </div>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Special Requirements / Location Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="e.g. High-voltage power required, prefer corner booth near main hall entrance..."
                value={boothPref.notes}
                onChange={(e) => setBoothPref({ ...boothPref, notes: e.target.value })}
              />
            </Form.Group>

            {/* Mini Floor Plan Preview */}
            {booths.length > 0 && (
              <div>
                <h6 className="fw-bold mb-2">Expo Floor Plan Reference</h6>
                <div className="border rounded bg-light p-2" style={{ height: '240px', overflow: 'hidden' }}>
                  <FloorPlan
                    expo={expo}
                    booths={booths}
                    mode="view"
                    readOnly
                  />
                </div>
                <small className="text-muted mt-1 d-block">
                  Exact booth selection occurs after application approval.
                </small>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Documents Upload */}
        {step === 4 && (
          <div>
            <h5 className="fw-bold mb-2">Step 4: Supporting Documents</h5>
            <p className="text-muted small mb-3">
              Upload certificates, company registration documents, or brochures (PDF/PNG/JPG ≤ 10MB).
            </p>
            <div className="mb-3">
              <Form.Control
                type="file"
                onChange={handleDocUpload}
                disabled={uploadingDoc}
              />
              {uploadingDoc && <small className="text-muted mt-1 d-block">Uploading file...</small>}
            </div>

            <div className="list-group mb-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-check fs-4 text-primary"></i>
                    <span className="fw-semibold">{doc.filename}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeDoc(idx)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-muted small fst-italic mb-0">No documents uploaded yet. (Optional)</p>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h5 className="fw-bold mb-3">Step 5: Review & Submit Application</h5>
            <Card className="bg-light border-0 p-3 mb-3">
              <Row className="g-2">
                <Col sm={4} className="text-muted small">Company Name:</Col>
                <Col sm={8} className="fw-bold">{overview.companyName}</Col>

                <Col sm={4} className="text-muted small">Category:</Col>
                <Col sm={8}>{overview.category}</Col>

                <Col sm={4} className="text-muted small">Website:</Col>
                <Col sm={8}>{overview.website || 'N/A'}</Col>

                <Col sm={4} className="text-muted small">Preferred Size:</Col>
                <Col sm={8} className="text-capitalize">{boothPref.size}</Col>

                <Col sm={4} className="text-muted small">Products Showcase:</Col>
                <Col sm={8}>
                  {products.length > 0 ? products.join(', ') : 'None listed'}
                </Col>

                <Col sm={4} className="text-muted small">Documents Attached:</Col>
                <Col sm={8}>{documents.length} document(s)</Col>
              </Row>
            </Card>

            <Form.Check
              type="checkbox"
              id="termsAgreement"
              className="mb-3"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              label={
                <span className="small">
                  I confirm that all details provided are accurate and agree to the{' '}
                  <span className="text-primary text-decoration-underline">Exhibitor Terms & Floor Plan Rules</span>.
                </span>
              }
            />
          </div>
        )}

        {/* Wizard Controls */}
        <div className="d-flex justify-content-between pt-3 border-top mt-3">
          {step > 1 ? (
            <Button variant="outline-secondary" onClick={prevStep}>
              <i className="bi bi-arrow-left me-1"></i> Previous
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button variant="primary" onClick={nextStep}>
              Next <i className="bi bi-arrow-right ms-1"></i>
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleSubmit}
              isLoading={submitting}
              disabled={!agreedToTerms}
            >
              Submit Application
            </Button>
          )}
        </div>
      </Card>
    </Container>
  );
}
