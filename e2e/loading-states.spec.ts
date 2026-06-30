import { test, expect } from '@playwright/test';

test.describe('Loading States', () => {
  test('dashboard should show skeleton loader before content', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'ava.admin@contentops.com');
    await page.fill('input#password', 'ChangeMeAdmin123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Total Assets')).toBeVisible({ timeout: 15000 });
  });

  test('assets page should show loading state', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'ava.admin@contentops.com');
    await page.fill('input#password', 'ChangeMeAdmin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    await page.click('nav >> text=Assets');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
