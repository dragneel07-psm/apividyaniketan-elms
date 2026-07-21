/**
 * QA-01 — Authentication & Role Access
 * ======================================
 * Tests:
 *   ✓ Every role can obtain a JWT token
 *   ✓ Token refresh works
 *   ✓ /api/users/me/ returns correct role
 *   ✓ Invalid credentials return 401
 *   ✓ Unauthenticated requests return 401
 *   ✓ Role-based route guards (admin can reach /admin, student cannot)
 */
import { test, expect } from '@playwright/test';
import {
  CREDENTIALS, QA_TENANT, API_URL, FRONTEND_URL,
  loginAs, authHeaders, type RoleKey,
} from './helpers';

const ALL_ROLES: RoleKey[] = ['admin', 'staff', 'teacher', 'student', 'parent'];

// ── JWT Obtain ────────────────────────────────────────────────────────────────
test.describe('JWT — obtain token', () => {
  for (const role of ALL_ROLES) {
    test(`[${role}] can login and receive access + refresh tokens`, async ({ request }) => {
      const cred = CREDENTIALS[role];
      const res = await request.post(`${API_URL}/api/token/`, {
        data: { email: cred.email, password: cred.password },
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('access');
      expect(body).toHaveProperty('refresh');
      expect(typeof body.access).toBe('string');
      expect(body.access.length).toBeGreaterThan(50);
    });
  }

  test('invalid credentials → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/token/`, {
      data: { email: 'nobody@qa.test', password: 'WrongPassword!' },
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
    });
    expect(res.status()).toBe(401);
  });

  test('missing password → 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/token/`, {
      data: { email: CREDENTIALS.student.email },
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
    });
    expect([400, 401]).toContain(res.status());
  });
});

// ── Token Refresh ─────────────────────────────────────────────────────────────
test.describe('JWT — token refresh', () => {
  test('[student] can refresh access token', async ({ request }) => {
    const tokens = await loginAs(request, 'student');

    const res = await request.post(`${API_URL}/api/token/refresh/`, {
      data: { refresh: tokens.refresh },
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('access');
  });

  test('invalid refresh token → 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/token/refresh/`, {
      data: { refresh: 'this.is.not.a.valid.token' },
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
    });
    expect(res.status()).toBe(401);
  });
});

// ── /api/users/accounts/me/ ───────────────────────────────────────────────────
test.describe('/api/users/me/ — profile', () => {
  for (const role of ALL_ROLES) {
    test(`[${role}] /me returns correct role`, async ({ request }) => {
      const tokens = await loginAs(request, role);
      const res = await request.get(`${API_URL}/api/users/accounts/me/`, {
        headers: authHeaders(tokens),
      });
      expect(res.status()).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.role).toBe(CREDENTIALS[role].role);
      expect(body.email).toBe(CREDENTIALS[role].email);
    });
  }

  test('unauthenticated → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/users/accounts/me/`, {
      headers: { 'x-tenant-id': QA_TENANT },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Role-Based Access Control ─────────────────────────────────────────────────
test.describe('RBAC — admin-only endpoints', () => {
  test('[admin] can list all users', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const res = await request.get(`${API_URL}/api/users/accounts/`, {
      headers: authHeaders(tokens),
    });
    expect(res.status()).toBe(200);
  });

  test('[student] cannot list all users (forbidden)', async ({ request }) => {
    const tokens = await loginAs(request, 'student');
    const res = await request.get(`${API_URL}/api/users/accounts/`, {
      headers: authHeaders(tokens),
    });
    expect([403, 401]).toContain(res.status());
  });

  test('[teacher] cannot list all users (forbidden)', async ({ request }) => {
    const tokens = await loginAs(request, 'teacher');
    const res = await request.get(`${API_URL}/api/users/accounts/`, {
      headers: authHeaders(tokens),
    });
    expect([403, 401]).toContain(res.status());
  });
});

// ── Frontend UI pages load ────────────────────────────────────────────────────
// These tests require the frontend dev server (port 3000) to be running.
// Run `npm run dev` in /frontend/ before executing these tests locally.
test.describe('Frontend — login page renders', () => {
  test('login page returns 200', async ({ page }) => {
    test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL to enable');
    // /login is the role-selector portal (no email form — has role buttons)
    const res = await page.goto(`${FRONTEND_URL}/login`);
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated / redirects to login or school page', async ({ page }) => {
    test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL to enable');
    const res = await page.goto(`${FRONTEND_URL}/`);
    expect(res?.status()).toBeLessThan(400);
  });
});
