/**
 * @fileoverview ExpoFilters component — search bar and filter chips for the expos list.
 * Implements debounced (300 ms) search, status/category filter chips.
 * T-3.10. Design §6 (SearchBar, FilterChips), ATT-03.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Form, InputGroup, Button, Badge } from 'react-bootstrap';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Past' },
];

/**
 * @param {Object} props
 * @param {string}   props.search
 * @param {string}   props.status
 * @param {string}   props.category
 * @param {string[]} props.allCategories
 * @param {Function} props.onSearchChange
 * @param {Function} props.onStatusChange
 * @param {Function} props.onCategoryChange
 * @param {Function} props.onClear
 */
export function ExpoFilters({
  search,
  status,
  category,
  allCategories = [],
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onClear,
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef(null);

  // Keep local search in sync if external search prop changes (e.g. clear all)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchInput = useCallback(
    (e) => {
      const val = e.target.value;
      setLocalSearch(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(val);
      }, 300);
    },
    [onSearchChange]
  );

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const hasActiveFilters = search || status || category;

  return (
    <div className="d-flex flex-column gap-3">
      {/* Search bar */}
      <InputGroup>
        <InputGroup.Text className="bg-white border-end-0">
          <i className="bi bi-search text-muted" aria-hidden="true" />
        </InputGroup.Text>
        <Form.Control
          type="search"
          placeholder="Search expos by title, description…"
          value={localSearch}
          onChange={handleSearchInput}
          aria-label="Search expos"
          className="border-start-0 ps-0"
        />
        {localSearch && (
          <Button
            variant="outline-secondary"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <i className="bi bi-x-lg" />
          </Button>
        )}
      </InputGroup>

      {/* Status filter chips */}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="text-muted small fw-semibold me-1">Status:</span>
        {STATUS_FILTERS.map((sf) => (
          <button
            key={sf.value}
            type="button"
            onClick={() => onStatusChange(sf.value)}
            className={`btn btn-sm rounded-pill fw-semibold px-3 ${
              status === sf.value
                ? 'btn-primary'
                : 'btn-outline-secondary'
            }`}
            aria-pressed={status === sf.value}
          >
            {sf.label}
          </button>
        ))}

        {/* Category filter chips */}
        {allCategories.length > 0 && (
          <>
            <span className="text-muted small fw-semibold ms-2 me-1">Category:</span>
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(category === cat ? '' : cat)}
                className={`btn btn-sm rounded-pill fw-semibold px-3 ${
                  category === cat
                    ? 'btn-primary'
                    : 'btn-outline-secondary'
                }`}
                aria-pressed={category === cat}
              >
                {cat}
              </button>
            ))}
          </>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-sm btn-link text-danger text-decoration-none ms-auto"
          >
            <i className="bi bi-x-circle me-1" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
