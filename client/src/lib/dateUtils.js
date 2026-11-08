/**
 * @fileoverview Date utility helpers for the client.
 * T-3.10. Design §8 (timezone label), Rule 8.1 (UTC stored, format in venue tz).
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format a date string safely.
 * @param {string|Date|null|undefined} dateInput
 * @param {string} [fmt='MMM d, yyyy']
 * @returns {string}
 */
export function formatDate(dateInput, fmt = 'MMM d, yyyy') {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(d)) return '';
  return format(d, fmt);
}

/**
 * Format a date + time string.
 * @param {string|Date|null|undefined} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  return formatDate(dateInput, 'MMM d, yyyy · h:mm a');
}

/**
 * Format an expo date range like "Oct 15 – Oct 18, 2026" or "Oct 15, 2026".
 * When start and end are in the same year, show year only once.
 * @param {string|Date|null|undefined} startDate
 * @param {string|Date|null|undefined} endDate
 * @returns {string}
 */
export function formatExpoDateRange(startDate, endDate) {
  if (!startDate) return '';
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : endDate) : null;

  if (!isValid(start)) return '';

  if (!end || !isValid(end)) {
    return format(start, 'MMM d, yyyy');
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth() && sameYear;

  if (sameMonth) {
    // "Oct 15–18, 2026"
    return `${format(start, 'MMM d')}–${format(end, 'd, yyyy')}`;
  }

  if (sameYear) {
    // "Oct 15 – Nov 2, 2026"
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }

  // different years
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Returns "X days away", "Today", "X days ago", etc.
 * @param {string|Date|null|undefined} dateInput
 * @returns {string}
 */
export function relativeDays(dateInput) {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(d)) return '';

  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
