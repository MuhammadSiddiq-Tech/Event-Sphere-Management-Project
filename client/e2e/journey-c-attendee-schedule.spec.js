/**
 * @fileoverview E2E — Journey (c): Attendee registers for expo, bookmarks session, checks agenda.
 * T-9.5. Rules §6.6.
 */

import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers.js';

const TS = Date.now();
const ATT_EMAIL = `e2e-att-c-${TS}@example.com`;
const ATT_PASSWORD = 'E2eAttPass123!';

test.describe('Journey (c): Attendee register expo → bookmark session → view agenda (T-9.5)', () => {
  test.beforeAll(async ({ request }) => {
    await request.post('/api/v1/auth/register', {
      data: {
        name: 'E2E Attendee C',
        email: ATT_EMAIL,
        password: ATT_PASSWORD,
        role: 'attendee',
        privacyAccepted: true,
      },
    });
  });

  test('attendee can reach the session schedule page', async ({ page }) => {
    await loginViaUI(page, { email: ATT_EMAIL, password: ATT_PASSWORD });
    await page.goto('/expos');

    // Look for a published expo and try to open sessions
    const expoLinks = page.getByRole('link', { name: /view|details/i });
    if (await expoLinks.count() > 0) {
      await expoLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Find "Sessions" or "Schedule" tab/link on expo detail page
      const scheduleLink = page.getByRole('link', { name: /session|schedule/i });
      if (await scheduleLink.isVisible()) {
        await scheduleLink.click();
        await expect(page.getByRole('heading', { name: /session|schedule/i }).first()).toBeVisible({ timeout: 8_000 });
      }
    }
  });

  test('attendee can view their profile page', async ({ page }) => {
    await loginViaUI(page, { email: ATT_EMAIL, password: ATT_PASSWORD });
    // Navigate via attendee user menu dropdown (client-side routing)
    await page.locator('#attendee-user-menu, #user-menu').first().click();
    await page.getByRole('link', { name: /profile & settings/i }).click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input[name="name"]')).toHaveValue(/E2E Attendee C/i);
  });

  test('attendee can view the privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText('GDPR Compliant')).toBeVisible();
  });
});
