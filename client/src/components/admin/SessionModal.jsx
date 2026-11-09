/**
 * @fileoverview Admin Session Add/Edit Modal with speakers repeater and conflict handling.
 * T-5.5. FR-SCH-01, FR-SCH-02, BR-6.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Row,
  Col,
  Alert,
  InputGroup,
  Card as BsCard,
} from 'react-bootstrap';
import { Button } from '../ui/index.js';

const SESSION_TYPES = [
  { value: 'session', label: 'Session' },
  { value: 'keynote', label: 'Keynote' },
  { value: 'workshop', label: 'Workshop' },
];

/**
 * Format a Date object to "YYYY-MM-DDTHH:mm" for input type="datetime-local"
 */
function toDatetimeLocal(isoOrDate) {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return '';
  // Format as YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function SessionModal({
  show,
  onHide,
  session,
  expo,
  defaultDay,
  onSubmit,
  isPending,
  serverError,
}) {
  const isEditing = Boolean(session);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('session');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [track, setTrack] = useState('');
  const [capacity, setCapacity] = useState('');
  const [tags, setTags] = useState('');
  const [updatedReason, setUpdatedReason] = useState('');
  const [speakers, setSpeakers] = useState([]);
  const [formError, setFormError] = useState('');

  // Reset or populate fields when modal opens/changes
  useEffect(() => {
    if (!show) {
      setFormError('');
      return;
    }

    if (session) {
      setTitle(session.title || '');
      setDescription(session.description || '');
      setType(session.type || 'session');
      setStartTime(toDatetimeLocal(session.startTime));
      setEndTime(toDatetimeLocal(session.endTime));
      setRoom(session.room || '');
      setTrack(session.track || '');
      setCapacity(session.capacity ? String(session.capacity) : '');
      setTags(session.tags ? session.tags.join(', ') : '');
      setUpdatedReason('');
      setSpeakers(session.speakers ? session.speakers.map((s) => ({ ...s })) : []);
    } else {
      // Create mode: prefill sensible start/end time
      let baseDate = expo?.startDate ? new Date(expo.startDate) : new Date();
      if (defaultDay && defaultDay !== 'all') {
        const parsed = new Date(`${defaultDay}T09:00:00`);
        if (!isNaN(parsed.getTime())) baseDate = parsed;
      }

      const defaultStart = new Date(baseDate);
      defaultStart.setHours(9, 0, 0, 0);

      const defaultEnd = new Date(baseDate);
      defaultEnd.setHours(10, 0, 0, 0);

      setTitle('');
      setDescription('');
      setType('session');
      setStartTime(toDatetimeLocal(defaultStart));
      setEndTime(toDatetimeLocal(defaultEnd));
      setRoom('Main Hall');
      setTrack('');
      setCapacity('100');
      setTags('');
      setUpdatedReason('');
      setSpeakers([{ name: '', org: '', bio: '', avatarUrl: '' }]);
    }
    setFormError('');
  }, [show, session, expo, defaultDay]);

  // Speaker repeater controls
  const handleAddSpeaker = () => {
    setSpeakers([...speakers, { name: '', org: '', bio: '', avatarUrl: '' }]);
  };

  const handleRemoveSpeaker = (index) => {
    setSpeakers(speakers.filter((_, idx) => idx !== index));
  };

  const handleSpeakerChange = (index, field, value) => {
    setSpeakers(
      speakers.map((sp, idx) => (idx === index ? { ...sp, [field]: value } : sp))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || title.trim().length < 3) {
      setFormError('Title must be at least 3 characters.');
      return;
    }

    if (!startTime || !endTime) {
      setFormError('Both start time and end time are required.');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setFormError('End time must be after start time.');
      return;
    }

    // Clean speakers: require name
    const validSpeakers = speakers
      .filter((sp) => sp.name && sp.name.trim().length > 0)
      .map((sp) => {
        const cleaned = { name: sp.name.trim() };
        if (sp.org?.trim()) cleaned.org = sp.org.trim();
        if (sp.bio?.trim()) cleaned.bio = sp.bio.trim();
        if (sp.avatarUrl?.trim()) cleaned.avatarUrl = sp.avatarUrl.trim();
        return cleaned;
      });

    // Clean tags
    const cleanedTags = tags
      ? tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const payload = {
      title: title.trim(),
      type,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      room: room.trim() || undefined,
      track: track.trim() || undefined,
      description: description.trim() || undefined,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      speakers: validSpeakers,
      tags: cleanedTags,
    };

    if (isEditing && updatedReason.trim()) {
      payload.updatedReason = updatedReason.trim();
    }

    onSubmit(payload);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold">
            <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-calendar-plus'} me-2 text-primary`} />
            {isEditing ? 'Edit Session' : 'Add New Session'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {/* Server Error Alert (e.g. 409 Conflict overlap or validation error) */}
          {serverError && (
            <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
              <div>{serverError}</div>
            </Alert>
          )}

          {/* Client Form Error */}
          {formError && (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-exclamation-circle-fill flex-shrink-0" />
              <div>{formError}</div>
            </Alert>
          )}

          {/* Basic Fields */}
          <Row className="g-3 mb-3">
            <Col md={8}>
              <Form.Group controlId="sessionTitle">
                <Form.Label className="small fw-semibold">
                  Session Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Opening Keynote: The Future of Expo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="sessionType">
                <Form.Label className="small fw-semibold">
                  Session Type <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
                  {SESSION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Time Fields */}
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group controlId="sessionStartTime">
                <Form.Label className="small fw-semibold">
                  Start Date & Time <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group controlId="sessionEndTime">
                <Form.Label className="small fw-semibold">
                  End Date & Time <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Room, Track, Capacity */}
          <Row className="g-3 mb-3">
            <Col md={4}>
              <Form.Group controlId="sessionRoom">
                <Form.Label className="small fw-semibold">
                  Room / Location <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. Main Hall, Room B"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
                <Form.Text className="text-muted small">
                  Room overlap checks prevent double-booking.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="sessionTrack">
                <Form.Label className="small fw-semibold">Track / Topic</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. AI & Robotics, Design"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId="sessionCapacity">
                <Form.Label className="small fw-semibold">Capacity (seats)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="e.g. 200"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Description */}
          <Form.Group controlId="sessionDescription" className="mb-3">
            <Form.Label className="small fw-semibold">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Session abstract, agenda, or key takeaways…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          {/* Tags */}
          <Form.Group controlId="sessionTags" className="mb-4">
            <Form.Label className="small fw-semibold">Tags (comma-separated)</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. tech, keynote, ai"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </Form.Group>

          {/* If Editing: Updated Reason */}
          {isEditing && (
            <Form.Group controlId="sessionUpdatedReason" className="mb-4">
              <Form.Label className="small fw-semibold text-warning-emphasis">
                <i className="bi bi-info-circle me-1" />
                Reason for Update (Schedule notice for attendees)
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Room moved to Main Hall, speaker time changed"
                value={updatedReason}
                onChange={(e) => setUpdatedReason(e.target.value)}
              />
            </Form.Group>
          )}

          {/* ── Speakers Repeater ── */}
          <div className="border-top pt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0">Speakers</h6>
                <span className="text-muted small">Add featured speakers for this session</span>
              </div>
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={handleAddSpeaker}
              >
                <i className="bi bi-plus-lg me-1" /> Add Speaker
              </Button>
            </div>

            {speakers.map((speaker, idx) => (
              <BsCard key={idx} className="mb-2 bg-light border">
                <BsCard.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold text-secondary">
                      Speaker #{idx + 1}
                    </span>
                    {speakers.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm py-0 px-1 border-0"
                        onClick={() => handleRemoveSpeaker(idx)}
                        title="Remove speaker"
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    )}
                  </div>

                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Control
                        size="sm"
                        placeholder="Speaker Name *"
                        value={speaker.name}
                        onChange={(e) => handleSpeakerChange(idx, 'name', e.target.value)}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Control
                        size="sm"
                        placeholder="Organization / Company"
                        value={speaker.org}
                        onChange={(e) => handleSpeakerChange(idx, 'org', e.target.value)}
                      />
                    </Col>
                    <Col md={12}>
                      <Form.Control
                        size="sm"
                        placeholder="Brief bio or title"
                        value={speaker.bio}
                        onChange={(e) => handleSpeakerChange(idx, 'bio', e.target.value)}
                      />
                    </Col>
                  </Row>
                </BsCard.Body>
              </BsCard>
            ))}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isPending}>
            {isEditing ? 'Save Changes' : 'Create Session'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
