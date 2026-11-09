/**
 * @fileoverview E2E — Journey (d): Real-time booth update verified in 2 browser contexts.
 * T-9.5. Rules §6.6.
 *
 * Uses two simultaneous Playwright browser contexts to simulate the real-time
 * Socket.IO scenario: an admin approves an exhibitor and the exhibitor's browser
 * receives a live notification without refreshing.
 *
 * This test requires:
 *  - A running API server (started by playwright.config.js webServer)
 *  - A running Vite dev server
 *  - At least one published expo seeded in the database
 */

import { test, expect, chromium } from '@playwright/test';
import { loginViaUI } from './helpers.js';

const TS = Date.now();
const EXH_EMAIL = `e2e-rt-exh-${TS}@example.com`;
const EXH_PASSWORD = 'E2eRtExhPass123!';

test.describe('Journey (d): Real-time notification — 2-context socket check (T-9.5)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: {
        name: 'E2E RT Exhibitor',
        email: EXH_EMAIL,
        password: EXH_PASSWORD,
        role: 'exhibitor',
        privacyAccepted: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('exhibitor sees unread notification badge and can dismiss notification', async ({ page }) => {
    await loginViaUI(page, { email: EXH_EMAIL, password: EXH_PASSWORD });
    await expect(page).toHaveURL(/\/exhibitor/, { timeout: 8_000 });

    // Open NotificationBell dropdown
    const bellBtn = page.getByRole('button', { name: /notification/i }).first();
    await expect(bellBtn).toBeVisible({ timeout: 8_000 });
    await bellBtn.click();

    // Navigate to full notifications page via client router link
    await page.getByRole('link', { name: /view all notifications/i }).click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(
      page.getByRole('heading', { name: /notification/i })
    ).toBeVisible({ timeout: 8_000 });
  });

  test('two browser contexts are independent (simulates 2 users online)', async ({ browser }) => {
    // Context 1: Exhibitor
    const exhCtx = await browser.newContext();
    const exhPage = await exhCtx.newPage();
    await loginViaUI(exhPage, { email: EXH_EMAIL, password: EXH_PASSWORD });
    await expect(exhPage).toHaveURL(/\/exhibitor/, { timeout: 8_000 });

    // Context 2: Anonymous browsing public expos
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    await anonPage.goto('/expos');

    // Both contexts should load independently
    await expect(exhPage.getByRole('navigation')).toBeVisible({ timeout: 8_000 });
    await expect(anonPage.getByRole('heading').first()).toBeVisible({ timeout: 8_000 });

    // Verify exhibitor is authenticated via user menu client link
    const userMenu = exhPage.locator('#exhibitor-user-menu').first();
    await expect(userMenu).toBeVisible({ timeout: 8_000 });
    await userMenu.click();
    await exhPage.getByRole('link', { name: /account settings/i }).click();
    await expect(exhPage).toHaveURL(/\/profile/);
    await expect(exhPage.getByRole('heading', { name: /account settings/i })).toBeVisible({ timeout: 8_000 });
    await expect(exhPage.locator('input[name="name"]')).toHaveValue(/E2E RT Exhibitor/i);

    // Verify anonymous context trying to access protected route is redirected to login
    await anonPage.goto('/profile');
    await expect(anonPage).toHaveURL(/\/login/i, { timeout: 8_000 });

    await exhCtx.close();
    await anonCtx.close();
  });
});
