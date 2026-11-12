/**
 * @fileoverview Public Expos List Page.
 * Shows all published/ongoing expos with debounced search, status and category filter chips,
 * and infinite-scroll / "Load more" pagination.
 * T-3.10. FR-ATT-01, Design §7.11, ATT-03.
 */

import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
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
      {/* ── Editorial Obsidian Navy Page Hero ── */}
      <section
        className="bg-navy text-white py-5 position-relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 25%, rgba(0, 87, 255, 0.35), transparent 45%), radial-gradient(circle at 10% 80%, rgba(217, 249, 91, 0.12), transparent 40%)',
        }}
      >
        <Container className="py-2">
          <Row className="align-items-end g-3">
            <Col lg={8}>
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-10 small fw-medium mb-3">
                <span
                  className="rounded-circle bg-lime d-inline-block"
                  style={{ width: '8px', height: '8px' }}
                />
                <span className="text-white-50 text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Live Exhibition Directory
                </span>
              </div>
              <h1
                className="display-5 fw-bold text-white mb-2"
                style={{ letterSpacing: '-0.03em' }}
              >
                Discover Expos<span className="text-lime">.</span>
              </h1>
              <p className="text-white-50 mb-0 lead" style={{ maxWidth: '580px' }}>
                Browse upcoming trade shows, global conferences, and interactive exhibitions.
              </p>
            </Col>

            <Col lg={4} className="text-lg-end">
              {!isLoading && (
                <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 border border-white border-opacity-15 rounded-pill px-4 py-2">
                  <span className="badge bg-lime text-dark fw-bold rounded-pill px-3 py-1 font-monospace">
                    {totalCount}
                  </span>
                  <span className="small fw-medium text-white">
                    Published Event{totalCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </section>

      <Container className="py-4 py-md-5">
        {/* ── Elevated Editorial Filter Bar ── */}
        <div
          className="mb-4 p-3 p-md-4 bg-white rounded-4 shadow-sm"
          style={{ border: '1px solid rgba(10, 17, 40, 0.08)' }}
        >
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
          <Alert variant="danger" className="d-flex align-items-center gap-2 rounded-3 border-0 shadow-sm">
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
                {/* Result count bar */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className="text-secondary small mb-0">
                    Showing <strong className="text-dark">{expos.length}</strong>
                    {totalCount > expos.length ? ` of ${totalCount}` : ''} expo{totalCount !== 1 ? 's' : ''}
                    {search && <> matching <em className="text-primary">&ldquo;{search}&rdquo;</em></>}
                  </p>
                </div>

                <Row className="g-4">
                  {expos.map((expo) => (
                    <Col key={expo.id || expo._id} sm={6} lg={4}>
                      <ExpoCard expo={expo} />
                    </Col>
                  ))}
                </Row>

                {/* Load more */}
                {hasMore && (
                  <div className="text-center mt-5">
                    <button
                      type="button"
                      className="btn btn-dark rounded-pill px-5 py-2 fw-semibold"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Load More Expos
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