/**
 * @fileoverview E2E test helpers — shared fixtures and utilities.
 * T-9.5.
 */
import { expect } from '@playwright/test';

/**
 * Registers a new user via the API and returns their credentials.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {{ name?: string, email: string, password: string, role?: string }} opts
 */
export async function registerUser(request, { name, email, password, role = 'attendee' }) {
  const res = await request.post('/api/v1/auth/register', {
    data: {
      name: name || `User ${email}`,
      email,
      password,
      role,
      privacyAccepted: true,
    },
  });
  if (!res.ok()) {
    const body = await res.json();
    throw new Error(`Register failed: ${JSON.stringify(body)}`);
  }
  return { email, password };
}

/**
 * Logs in via the UI and waits for the dashboard to load.
 * @param {import('@playwright/test').Page} page
 * @param {{ email: string, password: string }} creds
 */
export async function loginViaUI(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect away from login page
  await expect(page).not.toHaveURL(/\/login/);
}
