/**
 * @fileoverview E2E — Journey (a): Register, Login, Browse Public Expos.
 * T-9.5. Rules §6.6.
 *
 * Tests:
 *  1. Anonymous user can browse the public expo listing.
 *  2. Anonymous user can register a new attendee account.
 *  3. New user can log in and reach the dashboard.
 *  4. Authenticated user sees personalized navigation (name in navbar).
 *  5. User can log out and is redirected to login.
 */

import { test, expect } from '@playwright/test';

const ATTENDEE_EMAIL = `e2e-attendee-${Date.now()}@example.com`;
const ATTENDEE_PASSWORD = 'E2ePassword123!';

test.describe('Journey (a): Register → Login → Browse Expos (T-9.5)', () => {
  test('anonymous visitor can browse the public expo listing', async ({ page }) => {
    await page.goto('/expos');
    await expect(page).toHaveTitle(/EventSphere|Expos/i);
    // Public expo list should be visible without login
    await expect(page.getByRole('heading', { name: /expo|event/i }).first()).toBeVisible();
  });

  test('new user can register as an attendee', async ({ page }) => {
    await page.goto('/register');

    await page.locator('input[name="name"]').fill('E2E Attendee');
    await page.locator('input[name="email"]').fill(ATTENDEE_EMAIL);
    await page.locator('input[name="password"]').fill(ATTENDEE_PASSWORD);
    await page.locator('#privacyAccepted').check();
    // Role is attendee by default
    await page.getByRole('button', { name: /create.*account/i }).click();

    // Redirect to attendee dashboard or login after registration
    await expect(page).not.toHaveURL(/\/register/, { timeout: 10_000 });
  });

  test('registered user can log in and see their name in the navbar', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(ATTENDEE_EMAIL);
    await page.locator('input[name="password"]').fill(ATTENDEE_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Should navigate away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // User name or avatar should be visible in top nav
    await expect(page.getByText(/E2E Attendee/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('authenticated user can browse expo detail page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(ATTENDEE_EMAIL);
    await page.locator('input[name="password"]').fill(ATTENDEE_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Browse to expos
    await page.goto('/expos');
    // Click first expo card if available
    const firstExpoLink = page.getByRole('link', { name: /view|details|learn more/i }).first();
    if (await firstExpoLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstExpoLink.click();
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });

  test('authenticated user can log out', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(ATTENDEE_EMAIL);
    await page.locator('input[name="password"]').fill(ATTENDEE_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // Click user menu dropdown toggle
    const menuToggle = page.locator('#attendee-user-menu, #user-menu').first();
    await expect(menuToggle).toBeVisible({ timeout: 5000 });
    await menuToggle.click();

    // Click logout
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).or(page.locator('.dropdown-item:has-text("Logout")'));
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login|\/$/i, { timeout: 8_000 });
  });
});
