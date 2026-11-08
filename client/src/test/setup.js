/**
 * @fileoverview Vitest test setup for client.
 * Configures @testing-library/jest-dom matchers and global test mocks.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock window.matchMedia for JSDOM / React-Bootstrap Offcanvas & responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});
