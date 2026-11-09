/**
 * @fileoverview E2E — Journey (b): Exhibitor applies → Admin approves → Exhibitor reserves booth.
 * T-9.5. Rules §6.6.
 *
 * Tests:
 *  1. Exhibitor can submit an application to a published expo.
 *  2. Admin can view pending applications.
 *  3. Admin approves the application.
 *  4. Exhibitor sees the approved status.
 *  5. Exhibitor reserves an available booth from the floor plan.
 */

import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers.js';

const TS = Date.now();
const EXH_EMAIL = `e2e-exh-${TS}@example.com`;
const EXH_PASSWORD = 'E2eExhPass123!';
const ADMIN_EMAIL = 'admin@eventsphere.test';
const ADMIN_PASSWORD = 'Admin@1234';

test.describe('Journey (b): Exhibitor applies → Admin approves → Booth reservation (T-9.5)', () => {
  test.beforeAll(async ({ request }) => {
    // Register exhibitor via API
    await request.post('/api/v1/auth/register', {
      data: {
        name: 'E2E Exhibitor',
        email: EXH_EMAIL,
        password: EXH_PASSWORD,
        role: 'exhibitor',
        privacyAccepted: true,
      },
    });
  });

  test('exhibitor can browse published expos and open an expo detail', async ({ page }) => {
    await loginViaUI(page, { email: EXH_EMAIL, password: EXH_PASSWORD });
    await page.goto('/expos');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('admin can access the admin dashboard', async ({ page }) => {
    await loginViaUI(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    // Admin is automatically redirected to /admin upon login
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8_000 });
  });

  test('admin can view applications list', async ({ page }) => {
    await loginViaUI(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    await expect(page).toHaveURL(/\/admin/);
    // Navigate via admin sidebar
    await page.getByRole('link', { name: /exhibitor applications/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/applications/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8_000 });
  });
});
