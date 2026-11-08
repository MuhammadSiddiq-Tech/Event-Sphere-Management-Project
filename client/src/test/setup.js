/**
 * @fileoverview Vitest test setup for client.
 * Configures @testing-library/jest-dom matchers and global test mocks.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});
