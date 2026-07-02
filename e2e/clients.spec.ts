import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input#email', 'admin@libreonix.com');
  await page.fill('input#password', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  await page.click('nav >> text=Clients');
  await expect(page).toHaveURL('/dashboard/clients', { timeout: 10000 });
});

test.describe('Clients', () => {
  test('should display client list', async ({ page }) => {
    await expect(page.locator('text=Bloom Studio')).toBeVisible({ timeout: 10000 });
  });

  test('should open client detail', async ({ page }) => {
    await page.click('text=Bloom Studio');
    await expect(page.locator('text=Bloom Studio')).toBeVisible({ timeout: 10000 });
  });
});
