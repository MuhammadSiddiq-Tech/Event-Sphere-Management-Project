/**
 * @fileoverview Exhibitor Directory component.
 * T-6.7. FR-ATT-03, FR-ATT-04.
 *
 * Features:
 *   - Debounced (300 ms) search over company name, description, products/tags
 *   - Category filter chips (Technology, Healthcare, Energy, Education, etc.)
 *   - Exhibitor cards with logo, name, category, products, and booth assignment
 *   - "Show on floor plan" action linking to floor plan tab
 *   - Pagination & empty state with filter reset action
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Form,
  InputGroup,
  Badge,
  Card as BsCard,
  Pagination,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicExhibitors } from '../../api/exhibitors.js';
import { Button, StatusPill, Skeleton, EmptyState } from '../ui/index.js';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'energy', label: 'Energy & Green' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance & Fintech' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

export function ExhibitorsDirectory({
  expoId,
  onShowOnFloorPlan,
  className = '',
}) {
  const navigate = useNavigate();

  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);

  // 300 ms debounce for keyword search (FR-ATT-03)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 12,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedCategory) params.category = selectedCategory;
    if (expoId) params.expo = expoId;
    return params;
  }, [debouncedSearch, selectedCategory, expoId, page]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['publicExhibitors', queryParams],
    queryFn: () => fetchPublicExhibitors(queryParams),
    staleTime: 30_000,
  });

  const exhibitors = data?.items ?? [];
  const meta = data?.meta ?? {};

  const clearFilters = () => {
    setRawSearch('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(debouncedSearch || selectedCategory);

  return (
    <div className={`exhibitors-directory ${className}`}>
      {/* ── Search & Filter Controls ── */}
      <div className="bg-white border rounded-3 p-3.5 mb-4 shadow-sm">
        <Row className="g-3 align-items-center">
          {/* Keyword Search */}
          <Col lg={6} md={7}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-white">
                <i className="bi bi-search text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search exhibitors by company, products, keyword…"
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                aria-label="Search exhibitors"
              />
            </InputGroup>
          </Col>

          {/* Category Dropdown */}
          <Col lg={4} md={5}>
            <Form.Select
              size="sm"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Form.Select>
          </Col>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Col lg={2} xs={12} className="text-lg-end">
              <Button
                variant="outline-secondary"
                size="sm"
                className="w-100"
                onClick={clearFilters}
              >
                Reset
              </Button>
            </Col>
          )}
        </Row>

        {/* Category Pills shortcut bar */}
        <div className="d-flex flex-wrap gap-1.5 mt-3 pt-2 border-top">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`btn btn-sm py-1 px-2.5 rounded-pill border small ${
                selectedCategory === cat.value
                  ? 'btn-primary text-white border-primary'
                  : 'btn-light text-secondary border-light-subtle'
              }`}
              onClick={() => {
                setSelectedCategory(cat.value);
                setPage(1);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Info ── */}
      {!isLoading && (
        <div className="d-flex justify-content-between align-items-center mb-3 text-muted small">
          <span>
            Showing <strong>{exhibitors.length}</strong> of{' '}
            <strong>{meta.total ?? exhibitors.length}</strong> exhibitors
          </span>
        </div>
      )}

      {/* ── Exhibitors Grid ── */}
      {isLoading ? (
        <Row className="g-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col key={i} md={6} lg={4}>
              <Skeleton variant="card" height={220} />
            </Col>
          ))}
        </Row>
      ) : isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>Failed to load exhibitor directory. {error?.message}</span>
          <Button variant="outline-danger" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : exhibitors.length === 0 ? (
        <EmptyState
          icon="bi-building-slash"
          title="No Exhibitors Found"
          message={
            hasActiveFilters
              ? 'No exhibitors matched your search criteria. Try clearing or relaxing your filters.'
              : 'Approved exhibitors for this expo will appear here once finalized.'
          }
          actionLabel={hasActiveFilters ? 'Clear All Filters' : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <Row className="g-3">
          {exhibitors.map((exhibitor) => {
            const exhId = exhibitor.id || exhibitor._id || exhibitor.user?._id || exhibitor.user?.id || exhibitor.user;
            const companyName = exhibitor.companyName || exhibitor.user?.name || 'Exhibitor';
            const category = exhibitor.category || 'general';
            const booth = exhibitor.booth;

            return (
              <Col key={exhId} md={6} lg={4}>
                <BsCard className="h-100 border shadow-sm transition-all hover-shadow">
                  <BsCard.Body className="p-3.5 d-flex flex-column">
                    {/* Header: Logo + Name + Category */}
                    <div className="d-flex align-items-start gap-3 mb-2.5">
                      {exhibitor.logo ? (
                        <img
                          src={exhibitor.logo}
                          alt={companyName}
                          className="rounded border object-fit-contain flex-shrink-0 bg-white p-1"
                          style={{ width: '48px', height: '48px' }}
                        />
                      ) : (
                        <div
                          className="rounded bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: '48px', height: '48px', fontSize: '18px' }}
                        >
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-grow-1 min-w-0">
                        <h3 className="h6 fw-bold mb-1 text-dark text-truncate">
                          {companyName}
                        </h3>
                        <div className="d-flex flex-wrap gap-1">
                          <Badge bg="light" text="dark" className="border fw-normal small">
                            {category}
                          </Badge>
                          {booth && (
                            <span className="badge bg-primary-subtle text-primary border small">
                              <i className="bi bi-grid me-1" />
                              Booth {booth.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted small mb-3 flex-grow-1 line-clamp-3">
                      {exhibitor.description ||
                        'Innovative product showcases and expert team demonstrations.'}
                    </p>

                    {/* Products Tags */}
                    {exhibitor.products && exhibitor.products.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {exhibitor.products.slice(0, 3).map((prod, idx) => (
                          <span
                            key={idx}
                            className="badge bg-secondary-subtle text-secondary small fw-normal"
                          >
                            {typeof prod === 'string' ? prod : prod.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="pt-2.5 border-top d-flex justify-content-between align-items-center gap-2 mt-auto">
                      {/* Show on Floor Plan (FR-ATT-04) */}
                      {booth ? (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            if (onShowOnFloorPlan) {
                              onShowOnFloorPlan(booth);
                            } else {
                              navigate(
                                `/expos/${expoId || booth.expo}?tab=floorplan&booth=${booth.id || booth._id}`
                              );
                            }
                          }}
                          title={`Locate booth ${booth.code} on floor plan`}
                        >
                          <i className="bi bi-map me-1" /> Floor Plan
                        </Button>
                      ) : (
                        <span className="text-muted small">Booth pending</span>
                      )}

                      <Link
                        to={`/exhibitors/${exhId}`}
                        className="btn btn-primary btn-sm fw-semibold"
                      >
                        Profile <i className="bi bi-arrow-right ms-1" />
                      </Link>
                    </div>
                  </BsCard.Body>
                </BsCard>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Pagination ── */}
      {meta.pages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination size="sm">
            <Pagination.Prev
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {Array.from({ length: meta.pages }).map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={page === idx + 1}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}
