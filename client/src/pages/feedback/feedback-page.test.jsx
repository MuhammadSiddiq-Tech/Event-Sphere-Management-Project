/**
 * @fileoverview Unit tests for FeedbackPage (T-7.12).
 * FR-SYS-02.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FeedbackPage from './FeedbackPage.jsx';
import * as FeedbackApi from '../../api/feedback.js';

vi.mock('../../api/feedback.js');

function renderComponent() {
  return render(
    <BrowserRouter>
      <FeedbackPage />
    </BrowserRouter>
  );
}

describe('T-7.12: FeedbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading, categories, and form inputs', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Feedback & Support/i })).toBeDefined();
    expect(screen.getByText('Suggestion')).toBeDefined();
    expect(screen.getByText('Issue / Bug')).toBeDefined();
    expect(screen.getByText('Support Request')).toBeDefined();
    expect(screen.getByPlaceholderText(/Describe your feedback/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeDefined();
  });

  it('disables submit button when message is less than 5 characters', () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);

    const textarea = screen.getByPlaceholderText(/Describe your feedback/i);
    fireEvent.change(textarea, { target: { value: 'Hey' } });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.change(textarea, { target: { value: 'Hello World!' } });
    expect(submitBtn.hasAttribute('disabled')).toBe(false);
  });

  it('submits feedback and displays reference ID confirmation alert', async () => {
    FeedbackApi.submitFeedback.mockResolvedValueOnce({
      id: 'fb-test-12345',
      category: 'suggestion',
      message: 'Add dark mode theme support please!',
      rating: 5,
      status: 'open',
    });

    renderComponent();

    // Select rating
    const star5 = screen.getByRole('button', { name: /5 stars/i });
    fireEvent.click(star5);

    // Type message
    const textarea = screen.getByPlaceholderText(/Describe your feedback/i);
    fireEvent.change(textarea, { target: { value: 'Add dark mode theme support please!' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(FeedbackApi.submitFeedback).toHaveBeenCalledWith({
        category: 'suggestion',
        message: 'Add dark mode theme support please!',
        rating: 5,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Thank you for your feedback!/i)).toBeDefined();
      expect(screen.getByText(/#fb-test-12345/i)).toBeDefined();
    });
  });

  it('allows changing category to Issue and submitting', async () => {
    FeedbackApi.submitFeedback.mockResolvedValueOnce({
      id: 'fb-issue-999',
      category: 'issue',
      message: 'Floor plan canvas is blank on Safari.',
      status: 'open',
    });

    renderComponent();

    // Click Issue category
    const issueBtn = screen.getByText('Issue / Bug').closest('button');
    fireEvent.click(issueBtn);

    const textarea = screen.getByPlaceholderText(/Describe your feedback/i);
    fireEvent.change(textarea, { target: { value: 'Floor plan canvas is blank on Safari.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(FeedbackApi.submitFeedback).toHaveBeenCalledWith({
        category: 'issue',
        message: 'Floor plan canvas is blank on Safari.',
      });
    });
  });
});
