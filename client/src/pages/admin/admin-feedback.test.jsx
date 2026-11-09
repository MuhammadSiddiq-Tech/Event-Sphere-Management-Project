/**
 * @fileoverview Unit tests for AdminFeedbackPage (T-7.12).
 * FR-SYS-02, FR-ADM-01.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminFeedbackPage from './AdminFeedbackPage.jsx';
import * as FeedbackApi from '../../api/feedback.js';

vi.mock('../../api/feedback.js');

const MOCK_ITEMS = [
  {
    id: 'fb-1',
    user: { name: 'Alice Attendee', email: 'alice@test.com', role: 'attendee' },
    category: 'suggestion',
    status: 'open',
    rating: 5,
    message: 'Add dark mode theme please!',
    adminNotes: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fb-2',
    user: { name: 'Bob Exhibitor', email: 'bob@test.com', role: 'exhibitor' },
    category: 'issue',
    status: 'in_review',
    rating: 3,
    message: 'Booth reservation was confusing.',
    adminNotes: 'Reviewing booth selector UX',
    createdAt: new Date().toISOString(),
  },
];

function renderComponent() {
  return render(
    <BrowserRouter>
      <AdminFeedbackPage />
    </BrowserRouter>
  );
}

describe('T-7.12: AdminFeedbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FeedbackApi.fetchFeedbackList.mockResolvedValue({
      items: MOCK_ITEMS,
      meta: { page: 1, limit: 10, total: 2, pages: 1 },
    });
  });

  it('renders table with feedback items and user info', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Attendee')).toBeDefined();
      expect(screen.getByText('Bob Exhibitor')).toBeDefined();
      expect(screen.getByText('Add dark mode theme please!')).toBeDefined();
      expect(screen.getByText('Booth reservation was confusing.')).toBeDefined();
    });
  });

  it('filters by status when clicking status tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(FeedbackApi.fetchFeedbackList).toHaveBeenCalledTimes(1);
    });

    const inReviewTab = screen.getByRole('button', { name: 'In Review' });
    fireEvent.click(inReviewTab);

    await waitFor(() => {
      expect(FeedbackApi.fetchFeedbackList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_review' })
      );
    });
  });

  it('opens triage drawer and updates status & notes', async () => {
    FeedbackApi.updateFeedbackStatus.mockResolvedValueOnce({
      ...MOCK_ITEMS[0],
      status: 'resolved',
      adminNotes: 'Dark mode scheduled for v2.0',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Attendee')).toBeDefined();
    });

    // Click Triage button on first item
    const triageButtons = screen.getAllByRole('button', { name: /Triage/i });
    fireEvent.click(triageButtons[0]);

    // Offcanvas header should appear
    await waitFor(() => {
      expect(screen.getByText('Feedback Triage')).toBeDefined();
      expect(screen.getByText('#fb-1')).toBeDefined();
    });

    // Change status to resolved
    const select = screen.getByLabelText(/Update Status/i);
    fireEvent.change(select, { target: { value: 'resolved' } });

    // Update internal notes
    const textarea = screen.getByPlaceholderText(/Add triage notes/i);
    fireEvent.change(textarea, { target: { value: 'Dark mode scheduled for v2.0' } });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(FeedbackApi.updateFeedbackStatus).toHaveBeenCalledWith('fb-1', {
        status: 'resolved',
        adminNotes: 'Dark mode scheduled for v2.0',
      });
    });
  });
});
