/**
 * QA-11 — Frontend Auth Flows
 * ============================
 * Tests:
 *   ✓ Login form renders for each role portal
 *   ✓ Invalid credentials → sonner toast error shown
 *   ✓ Valid student login → redirected to /student
 *   ✓ Valid admin login → redirected to /admin
 *   ✓ Valid teacher login → redirected to /teacher
 *   ✓ Unauthenticated /student → redirect to /login
 *   ✓ Unauthenticated /admin → redirect to /login
 *   ✓ Unauthenticated /teacher → redirect to /login
 */
import { test, expect } from '@playwright/test';
import { CREDENTIALS, FRONTEND_URL } from './helpers';

const QA_TENANT = process.env.E2E_QA_TENANT || 'qa';

// ── Login Form Renders ──────────────────────────────────────────────────────

test.describe('Login Pages Render', () => {
  for (const role of ['student', 'admin', 'teacher'] as const) {
    test(`/login/${role} shows email, password, school_code fields`, async ({ page }) => {
      const res = await page.goto(`${FRONTEND_URL}/login/${role}`);
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="school_code"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  }
});

// ── Invalid Credentials ─────────────────────────────────────────────────────

test.describe('Login Validation', () => {
  test('invalid credentials show error toast', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login/student`);
    await page.fill('input[name="email"]', 'nobody@nowhere.invalid');
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.fill('input[name="school_code"]', QA_TENANT);
    await page.click('button[type="submit"]');

    // Sonner toast or inline error must appear within 8s
    const errorLocator = page.locator('[data-sonner-toast]')
      .or(page.locator('[role="status"]'))
      .or(page.getByText('Invalid credentials', { exact: false }))
      .first();
    await expect(errorLocator).toBeVisible({ timeout: 8000 });

    // Must NOT redirect away from login
    expect(page.url()).toContain('/login');
  });
});

// ── Valid Login → Dashboard Redirect ───────────────────────────────────────

test.describe('Valid Login → Dashboard Redirect', () => {
  test('student login → /student dashboard', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login/student`);
    await page.fill('input[name="email"]', CREDENTIALS.student.email);
    await page.fill('input[name="password"]', CREDENTIALS.student.password);
    await page.fill('input[name="school_code"]', QA_TENANT);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student/, { timeout: 15000 });
    expect(page.url()).toContain('/student');
  });

  test('admin login → /admin dashboard', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login/admin`);
    await page.fill('input[name="email"]', CREDENTIALS.admin.email);
    await page.fill('input[name="password"]', CREDENTIALS.admin.password);
    await page.fill('input[name="school_code"]', QA_TENANT);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    expect(page.url()).toContain('/admin');
  });

  test('teacher login → /teacher dashboard', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login/teacher`);
    await page.fill('input[name="email"]', CREDENTIALS.teacher.email);
    await page.fill('input[name="password"]', CREDENTIALS.teacher.password);
    await page.fill('input[name="school_code"]', QA_TENANT);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/teacher/, { timeout: 15000 });
    expect(page.url()).toContain('/teacher');
  });
});

// ── Protected Route Guards ─────────────────────────────────────────────────

test.describe('Unauthenticated Access → Redirect to Login', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // Production Next.js middleware can be slow on cold starts; allow 20s for redirects.
  test('/student redirects to /login when not authenticated', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/student`);
    await page.waitForURL(/\/login/, { timeout: 20000 });
    expect(page.url()).toContain('/login');
  });

  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForURL(/\/login/, { timeout: 20000 });
    expect(page.url()).toContain('/login');
  });

  test('/teacher redirects to /login when not authenticated', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/teacher`);
    await page.waitForURL(/\/login/, { timeout: 20000 });
    expect(page.url()).toContain('/login');
  });
});
