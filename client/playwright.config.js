import { defineConfig, devices } from '@playwright/test';

/**
 * @fileoverview Playwright E2E test configuration.
 * T-9.5. Rules §6.6, NFR-QA-01.
 *
 * Run E2E tests:
 *   npx playwright test
 *
 * To run against a live dev server instead of the auto-started one,
 * set PLAYWRIGHT_BASE_URL=http://localhost:5173 in your environment.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Keep sequential for real-time 2-context test
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../docs/testing/playwright-report' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* Auto-start the dev servers before running tests */
  webServer: [
    {
      command: 'node src/server.js',
      cwd: '../server',
      port: 5000,
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: '5000',
        MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/eventsphere',
        JWT_ACCESS_SECRET: 'supersecretjwtaccesskeyfore2etesting12345',
        JWT_REFRESH_SECRET: 'supersecretjwtrefreshkeyfore2etesting12345',
        CLIENT_URL: 'http://localhost:5173',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: 'npx.cmd vite --port 5173',
      cwd: '.',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
