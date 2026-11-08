/**
 * @fileoverview Public Expos List Page.
 * Shows all published/ongoing expos with debounced search, status and category filter chips,
 * and infinite-scroll / "Load more" pagination.
 * T-3.10. FR-ATT-01, Design §7.11, ATT-03.
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { ExpoCard } from '../../components/expos/ExpoCard.jsx';
import { ExpoFilters } from '../../components/expos/ExpoFilters.jsx';
import { Skeleton, EmptyState } from '../../components/ui/index.js';
import { fetchPublicExpos } from '../../api/expos.js';
const PAGE_SIZE = 12;

export default function ExposListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  // Reset to page 1 on any filter change
  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const handleStatusChange = (val) => { setStatus(val); setPage(1); };
  const handleCategoryChange = (val) => { setCategory(val); setPage(1); };
  const handleClear = () => { setSearch(''); setStatus(''); setCategory(''); setPage(1); };

  const queryParams = useMemo(() => ({
    q: search,
    status,
    category,
    page,
    limit: PAGE_SIZE,
  }), [search, status, category, page]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expos', 'public', queryParams],
    queryFn: () => fetchPublicExpos(queryParams),
    keepPreviousData: true,
    staleTime: 60_000,
  });

  const expos = data?.items ?? [];
  const pagination = data?.meta ?? {};
  const totalCount = pagination.total ?? 0;
  const hasMore = page < (pagination.pages ?? 1);

  // Collect unique categories from current result set for filter chips
  const allCategories = useMemo(() => {
    if (!expos.length) return [];
    const cats = expos.map((e) => e.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [expos]);

  return (
    <div>
      {/* Page Hero */}
      <section className="bg-primary text-white py-4">
        <Container>
          <Row className="align-items-center">
            <Col>
              <h1 className="fw-bold mb-1 h2">
                <i className="bi bi-calendar-event me-2" aria-hidden="true" />
                Discover Expos
              </h1>
              <p className="mb-0 opacity-75">
                Browse upcoming trade shows, conferences, and exhibitions.
              </p>
            </Col>
            <Col xs="auto" className="d-none d-md-block text-end">
              {!isLoading && (
                <span className="badge bg-white text-primary fs-6 fw-bold px-3 py-2">
                  {totalCount} event{totalCount !== 1 ? 's' : ''}
                </span>
              )}
            </Col>
          </Row>
        </Container>
      </section>

      <Container className="py-4">
        {/* Filters */}
        <div className="mb-4 p-3 bg-white rounded-3 shadow-sm">
          <ExpoFilters
            search={search}
            status={status}
            category={category}
            allCategories={allCategories}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onCategoryChange={handleCategoryChange}
            onClear={handleClear}
          />
        </div>

        {/* Error state */}
        {isError && (
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>
              Failed to load expos: {error?.response?.data?.error?.message || error?.message || 'Please try again.'}
            </span>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <Row className="g-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Col key={i} sm={6} lg={4}>
                <Skeleton variant="card" />
              </Col>
            ))}
          </Row>
        )}

        {/* Expo grid */}
        {!isLoading && !isError && (
          <>
            {expos.length === 0 ? (
              <EmptyState
                icon="bi-calendar-x"
                title="No expos found"
                description={
                  search || status || category
                    ? 'No expos match your filters. Try adjusting your search or clearing the filters.'
                    : 'There are no published expos at this time. Check back soon!'
                }
                actionLabel={search || status || category ? 'Clear Filters' : undefined}
                onAction={search || status || category ? handleClear : undefined}
                actionIcon="bi-x-circle"
              />
            ) : (
              <>
                {/* Result count */}
                <p className="text-muted small mb-3">
                  Showing <strong>{expos.length}</strong>
                  {totalCount > expos.length ? ` of ${totalCount}` : ''} expo{totalCount !== 1 ? 's' : ''}
                  {search && <> matching <em>&ldquo;{search}&rdquo;</em></>}
                </p>

                <Row className="g-4">
                  {expos.map((expo) => (
                    <Col key={expo.id || expo._id} sm={6} lg={4}>
                      <ExpoCard expo={expo} />
                    </Col>
                  ))}
                </Row>

                {/* Load more */}
                {hasMore && (
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-primary px-4"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Load more
                      <i className="bi bi-chevron-down ms-2" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
