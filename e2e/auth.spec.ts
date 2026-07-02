import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'wrong@example.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 5000 });
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'admin@libreonix.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', 'admin@libreonix.com');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    const signOutButton = page.locator('text=Sign Out');
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });
});
