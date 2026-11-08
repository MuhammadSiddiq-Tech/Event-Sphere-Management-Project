/**
 * @fileoverview Floor Plan Editor Side Panel Component.
 * Allows editing properties of the currently selected booth (code, label, size,
 * price, status, geometry) and provides quick actions (add booth, delete, deselect).
 * T-3.13. FR-EXPO-03, FR-EXPO-04.
 */

import React from 'react';
import { Card, Form, Button, Badge, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { BOOTH_SIZE_PRESETS } from './floorplanUtils.js';

export function FloorPlanSidePanel({
  selectedBooth = null,
  onUpdateBooth = () => {},
  onDeleteBooth = () => {},
  onDeselect = () => {},
  onAddBooth = () => {},
  totalBooths = 0,
  maxBooths = 100,
  isOverlapping = false,
  className = '',
}) {
  const isAtCapacity = totalBooths >= maxBooths;

  // Handle direct field change
  const handleChange = (field, value) => {
    if (!selectedBooth) return;

    const updated = {
      ...selectedBooth,
      [field]: value,
    };

    // If size preset changes, optionally update dimensions
    if (field === 'size' && BOOTH_SIZE_PRESETS[value]) {
      const preset = BOOTH_SIZE_PRESETS[value];
      updated.geometry = {
        ...selectedBooth.geometry,
        w: preset.w,
        h: preset.h,
      };
      if (!selectedBooth.pricePerDay || selectedBooth.pricePerDay === 0) {
        updated.pricePerDay = preset.defaultPrice;
      }
    }

    onUpdateBooth(updated);
  };

  // Handle geometry dimension change
  const handleGeometryChange = (dim, val) => {
    if (!selectedBooth) return;
    const num = Math.max(1, parseInt(val, 10) || 1);
    onUpdateBooth({
      ...selectedBooth,
      geometry: {
        ...selectedBooth.geometry,
        [dim]: num,
      },
    });
  };

  if (!selectedBooth) {
    return (
      <Card className={`shadow-sm border-0 ${className}`}>
        <Card.Header className="bg-white py-3 border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold">
              <i className="bi bi-sliders2 me-2 text-primary" />
              Floor Plan Properties
            </h6>
            <Badge bg={isAtCapacity ? 'danger' : 'secondary'} pill>
              {totalBooths} / {maxBooths} Booths
            </Badge>
          </div>
        </Card.Header>

        <Card.Body className="d-flex flex-column gap-3">
          <div className="text-center py-4 text-muted">
            <i className="bi bi-cursor-fill display-6 d-block mb-2 text-secondary opacity-50" />
            <p className="fw-semibold mb-1">No Booth Selected</p>
            <p className="small mb-3">
              Click any booth on the canvas to edit its properties, drag to reposition, or use the corner handle to resize.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddBooth}
              disabled={isAtCapacity}
              className="d-inline-flex align-items-center gap-1"
            >
              <i className="bi bi-plus-lg" />
              Add New Booth
            </Button>
          </div>

          <div className="bg-light rounded p-3 small">
            <div className="fw-bold text-dark mb-2">
              <i className="bi bi-keyboard me-1" />
              Editor Shortcuts:
            </div>
            <ul className="mb-0 ps-3 text-muted">
              <li><strong>Click</strong> to select a booth.</li>
              <li><strong>Drag</strong> booth to move with grid snapping.</li>
              <li><strong>Corner handle</strong> to resize width and height.</li>
              <li><strong>Arrow keys</strong> to nudge position by 1 unit.</li>
              <li><strong>Shift + Arrows</strong> to adjust size by 1 unit.</li>
              <li><strong>Delete / Backspace</strong> to remove selected booth.</li>
              <li><strong>Escape</strong> to deselect.</li>
            </ul>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const geom = selectedBooth.geometry || { x: 0, y: 0, w: 2, h: 2 };
  const area = geom.w * geom.h;

  return (
    <Card className={`shadow-sm border-0 ${className}`}>
      <Card.Header className="bg-white py-3 border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold text-primary">
              <i className="bi bi-pencil-square me-2" />
              Booth {selectedBooth.code || 'Unassigned'}
            </h6>
            <span className="small text-muted">
              Grid: ({geom.x}, {geom.y}) • {geom.w}×{geom.h}m ({area} m²)
            </span>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onDeselect}
            title="Deselect booth"
          >
            <i className="bi bi-x-lg" />
          </Button>
        </div>
      </Card.Header>

      <Card.Body className="d-flex flex-column gap-3">
        {/* Overlap Alert */}
        {isOverlapping && (
          <Alert variant="danger" className="py-2 px-3 small d-flex align-items-center gap-2 mb-0">
            <i className="bi bi-exclamation-octagon-fill fs-5" />
            <div>
              <strong>Collision Warning!</strong> This booth overlaps with another booth on the grid.
            </div>
          </Alert>
        )}

        {/* Booth Code & Size */}
        <Row className="g-2">
          <Col xs={6}>
            <Form.Group controlId="booth-code">
              <Form.Label className="small fw-semibold text-secondary mb-1">
                Booth Code <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={selectedBooth.code || ''}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="e.g. B-01"
                maxLength={20}
              />
            </Form.Group>
          </Col>

          <Col xs={6}>
            <Form.Group controlId="booth-size">
              <Form.Label className="small fw-semibold text-secondary mb-1">Size Preset</Form.Label>
              <Form.Select
                size="sm"
                value={selectedBooth.size || 'medium'}
                onChange={(e) => handleChange('size', e.target.value)}
              >
                <option value="small">Small (2×2m)</option>
                <option value="medium">Medium (3×2m)</option>
                <option value="large">Large (4×3m)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Label / Name */}
        <Form.Group controlId="booth-label">
          <Form.Label className="small fw-semibold text-secondary mb-1">Label / Title</Form.Label>
          <Form.Control
            type="text"
            size="sm"
            value={selectedBooth.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="e.g. Startup Corner Stand"
            maxLength={80}
          />
        </Form.Group>

        {/* Price & Status */}
        <Row className="g-2">
          <Col xs={6}>
            <Form.Group controlId="booth-price">
              <Form.Label className="small fw-semibold text-secondary mb-1">Price / Day ($)</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  min={0}
                  step={10}
                  value={selectedBooth.pricePerDay ?? 0}
                  onChange={(e) => handleChange('pricePerDay', Math.max(0, Number(e.target.value)))}
                />
              </InputGroup>
            </Form.Group>
          </Col>

          <Col xs={6}>
            <Form.Group controlId="booth-status">
              <Form.Label className="small fw-semibold text-secondary mb-1">Status</Form.Label>
              <Form.Select
                size="sm"
                value={selectedBooth.status || 'available'}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={selectedBooth.status === 'reserved' || selectedBooth.status === 'allocated'}
              >
                <option value="available">Available</option>
                <option value="blocked">Blocked / Pillar</option>
                {(selectedBooth.status === 'reserved' || selectedBooth.status === 'allocated') && (
                  <option value={selectedBooth.status} disabled>
                    {selectedBooth.status.toUpperCase()}
                  </option>
                )}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Dimensions (Width / Height) */}
        <Row className="g-2">
          <Col xs={6}>
            <Form.Group controlId="booth-width">
              <Form.Label className="small fw-semibold text-secondary mb-1">Width (m / units)</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min={1}
                max={10}
                value={geom.w}
                onChange={(e) => handleGeometryChange('w', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col xs={6}>
            <Form.Group controlId="booth-height">
              <Form.Label className="small fw-semibold text-secondary mb-1">Height (m / units)</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                min={1}
                max={10}
                value={geom.h}
                onChange={(e) => handleGeometryChange('h', e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Description */}
        <Form.Group controlId="booth-desc">
          <Form.Label className="small fw-semibold text-secondary mb-1">Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            size="sm"
            value={selectedBooth.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Amenities, power sockets, notes…"
            maxLength={1000}
          />
        </Form.Group>

        {/* Actions: Delete & Add Another */}
        <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDeleteBooth(selectedBooth.id || selectedBooth._id || selectedBooth.code)}
            disabled={selectedBooth.status === 'reserved' || selectedBooth.status === 'allocated'}
            className="d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-trash" />
            Delete Booth
          </Button>

          <Button
            variant="outline-primary"
            size="sm"
            onClick={onAddBooth}
            disabled={isAtCapacity}
            className="d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-plus-lg" />
            Add Another
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
