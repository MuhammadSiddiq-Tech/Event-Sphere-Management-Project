/**
 * @fileoverview Unit test for PrivacyPolicyPage (T-9.1).
 * NFR-PRIV-01, FR-SYS-05.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';

describe('T-9.1: PrivacyPolicyPage', () => {
  it('renders privacy policy heading, GDPR compliance badge, and key rights', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeDefined();
    expect(screen.getByText(/GDPR Compliant/i)).toBeDefined();
    expect(screen.getByText(/Right to Data Portability/i)).toBeDefined();
    expect(screen.getByText(/Right to Erasure/i)).toBeDefined();
    expect(screen.getByText(/Right to Withdraw Consent/i)).toBeDefined();
  });
});
