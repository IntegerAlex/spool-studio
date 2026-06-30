import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input#email', 'ava.admin@contentops.com');
  await page.fill('input#password', 'ChangeMeAdmin123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  await page.click('nav >> text=Clients');
  await expect(page).toHaveURL('/dashboard/clients', { timeout: 10000 });
});

test.describe('Clients', () => {
  test('should display client list', async ({ page }) => {
    await expect(page.locator('text=Stellar Fitness')).toBeVisible({ timeout: 10000 });
  });

  test('should open client detail', async ({ page }) => {
    await page.click('text=Stellar Fitness');
    await expect(page.locator('text=Stellar Fitness')).toBeVisible({ timeout: 10000 });
  });
});
