/**
 * QA-12 — Frontend Dashboard Rendering & Role Enforcement
 * =========================================================
 * Tests:
 *   ✓ Student dashboard renders with content
 *   ✓ Student /lessons page renders
 *   ✓ Student /results page renders
 *   ✓ Admin dashboard renders with content
 *   ✓ Admin /students page renders
 *   ✓ Admin /teachers page renders
 *   ✓ Teacher dashboard renders with content
 *   ✓ Teacher /lessons page renders
 *   ✗ Student accessing /admin → /unauthorized
 *   ✗ Teacher accessing /admin → /unauthorized
 *   ✗ Admin accessing /teacher → /unauthorized
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { CREDENTIALS, FRONTEND_URL, loginAs, type RoleKey } from './helpers';

const QA_TENANT = process.env.E2E_QA_TENANT || 'qa';
const FRONTEND_HOST = new URL(FRONTEND_URL).hostname;

/**
 * Set auth state programmatically (cookie + localStorage).
 * Faster than UI login for dashboard render tests.
 */
async function authenticateAs(page: Page, request: APIRequestContext, role: RoleKey): Promise<void> {
  const tokens = await loginAs(request, role);

  // 1. Set cookies so Next.js proxy middleware allows the request
  await page.context().addCookies([
    {
      name: 'access_token',
      value: encodeURIComponent(tokens.access),
      domain: FRONTEND_HOST,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'tenant_id',
      value: QA_TENANT,
      domain: FRONTEND_HOST,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // 2. Visit a public page to set localStorage for client-side auth checks
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ access, refresh, tenant }) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('tenant_id', tenant);
    },
    { access: tokens.access, refresh: tokens.refresh, tenant: QA_TENANT },
  );
}

// ── Student Dashboards ─────────────────────────────────────────────────────

test.describe('Student — Page Rendering', () => {
  test('student dashboard renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'student');
    const res = await page.goto(`${FRONTEND_URL}/student`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/unauthorized/);
    // Main layout should be present
    await expect(page.locator('main, [role="main"], #main-content').first()).toBeVisible({ timeout: 10000 });
  });

  test('student lessons page renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'student');
    const res = await page.goto(`${FRONTEND_URL}/student/lessons`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('student results page renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'student');
    const res = await page.goto(`${FRONTEND_URL}/student/results`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// ── Admin Dashboards ───────────────────────────────────────────────────────

test.describe('Admin — Page Rendering', () => {
  test('admin dashboard renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'admin');
    const res = await page.goto(`${FRONTEND_URL}/admin`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page.locator('main, [role="main"], #main-content').first()).toBeVisible({ timeout: 10000 });
  });

  test('admin students page renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'admin');
    const res = await page.goto(`${FRONTEND_URL}/admin/students`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('admin teachers page renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'admin');
    const res = await page.goto(`${FRONTEND_URL}/admin/teachers`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// ── Teacher Dashboards ─────────────────────────────────────────────────────

test.describe('Teacher — Page Rendering', () => {
  test('teacher dashboard renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'teacher');
    const res = await page.goto(`${FRONTEND_URL}/teacher`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/unauthorized/);
    await expect(page.locator('main, [role="main"], #main-content').first()).toBeVisible({ timeout: 10000 });
  });

  test('teacher lessons page renders', async ({ page, request }) => {
    await authenticateAs(page, request, 'teacher');
    const res = await page.goto(`${FRONTEND_URL}/teacher/lessons`);
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// ── RBAC: Wrong-role Access → /unauthorized ────────────────────────────────

test.describe('RBAC — Wrong-role access denied', () => {
  test('student accessing /admin → /unauthorized', async ({ page, request }) => {
    await authenticateAs(page, request, 'student');
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForURL(/\/unauthorized|\/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/unauthorized|\/login/);
  });

  test('teacher accessing /admin → /unauthorized', async ({ page, request }) => {
    await authenticateAs(page, request, 'teacher');
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForURL(/\/unauthorized|\/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/unauthorized|\/login/);
  });

  test('admin accessing /student → /unauthorized', async ({ page, request }) => {
    await authenticateAs(page, request, 'admin');
    await page.goto(`${FRONTEND_URL}/student`);
    await page.waitForURL(/\/unauthorized|\/login/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/unauthorized|\/login/);
  });
});
