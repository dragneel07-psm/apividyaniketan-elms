/**
 * QA-10 — API Health Check (all modules)
 * ========================================
 * Hits every major API endpoint as admin and asserts it returns 2xx (not 5xx).
 * This is the "smoke test for the backend" — fast to run, catches broken routes,
 * missing migrations, import errors, and misconfigured permissions.
 *
 * Legend:
 *   200  → OK (list or detail)
 *   201  → Created (not expected here)
 *   400  → Bad Request (acceptable for parameterless AI endpoints)
 *   401  → Unauthorized (should not happen with admin token)
 *   403  → Forbidden (acceptable — some endpoints intentionally role-restricted)
 *   404  → Not Found (acceptable — empty data)
 *   405  → Method Not Allowed (acceptable for read-only endpoints)
 *   5xx  → FAIL — server error, broken endpoint
 */
import { test, expect } from '@playwright/test';
import { loginAs, authHeaders, API_URL } from './helpers';

const ACCEPTABLE = [200, 201, 400, 403, 404, 405];

async function checkEndpoint(
  request: Parameters<typeof authHeaders>[0] extends never ? never : any,
  adminHeaders: Record<string, string>,
  method: 'GET' | 'POST',
  path: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const url = `${API_URL}${path}`;
  const res = method === 'GET'
    ? await request.get(url, { headers: adminHeaders })
    : await request.post(url, { data: data ?? {}, headers: adminHeaders });

  const status = res.status();
  expect(
    status,
    `${method} ${path} returned ${status} (expected one of ${ACCEPTABLE.join(', ')})`
  ).toBeLessThan(500);
}

test.describe('API Health — All Modules', () => {
  test('core endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/healthz');
    await checkEndpoint(request, h, 'GET', '/api/core/tenant-check/');
    await checkEndpoint(request, h, 'GET', '/api/core/capabilities/');
    await checkEndpoint(request, h, 'GET', '/api/core/audit-logs/');
  });

  test('users endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/users/accounts/');
    await checkEndpoint(request, h, 'GET', '/api/users/accounts/me/');
    await checkEndpoint(request, h, 'GET', '/api/users/groups/');
  });

  test('academic endpoints — read', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    const endpoints = [
      '/api/academic/years/',
      '/api/academic/classes/',
      '/api/academic/sections/',
      '/api/academic/subjects/',
      '/api/academic/teachers/',
      '/api/academic/students/',
      '/api/academic/chapters/',
      '/api/academic/lessons/',
      '/api/academic/assessments/',
      '/api/academic/results/',
      '/api/academic/parents/',
      '/api/academic/attendance/',
      '/api/academic/timetable/',
      '/api/academic/exams/',
      '/api/academic/notices/',
      '/api/academic/admissions/',
      '/api/academic/parent-meetings/',
      '/api/academic/events/',
      '/api/academic/student-leaves/',
      '/api/academic/complaints/',
      '/api/academic/inventory/assets/',
      '/api/academic/inventory/maintenance/',
      '/api/academic/inventory/stock/',
      '/api/academic/sis/health/',
      '/api/academic/sis/incidents/',
      '/api/academic/sis/documents/',
      '/api/academic/stats/',
    ];

    for (const ep of endpoints) {
      await checkEndpoint(request, h, 'GET', ep);
    }
  });

  test('ai_engine endpoints — read', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    const endpoints = [
      '/api/ai/logs/',
      '/api/ai/reports/',
      '/api/ai/learning-paths/',
      '/api/ai/learning-nodes/',
      '/api/ai/conversations/',
      '/api/ai/skill-tags/',
      '/api/ai/skill-mastery/',
      '/api/ai/token-budgets/',
      '/api/ai/artifacts/',
      '/api/ai/grading/rubrics/',
      '/api/ai/grading/drafts/',
    ];

    for (const ep of endpoints) {
      await checkEndpoint(request, h, 'GET', ep);
    }
  });

  test('library endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/library/books/');
    await checkEndpoint(request, h, 'GET', '/api/library/issues/');
  });

  test('notifications endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/notifications/notifications/');
    await checkEndpoint(request, h, 'GET', '/api/notifications/templates/');
  });

  test('gamification endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/gamification/leaderboard/');
    await checkEndpoint(request, h, 'GET', '/api/gamification/available-badges/');
    await checkEndpoint(request, h, 'GET', '/api/gamification/student-badges/');
  });

  test('conversations endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/conversations/conversations/');
    await checkEndpoint(request, h, 'GET', '/api/conversations/messages/');
  });

  test('billing endpoints', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/billing/school/fee-structures/');
    await checkEndpoint(request, h, 'GET', '/api/billing/school/student-fees/');
    await checkEndpoint(request, h, 'GET', '/api/billing/school/payments/');
    await checkEndpoint(request, h, 'GET', '/api/billing/school/expenses/');
    await checkEndpoint(request, h, 'GET', '/api/billing/school/dashboard/');
  });

  test('SaaS billing endpoints (saas admin only)', async ({ request }) => {
    // These endpoints may 403 for school admin — that's acceptable
    const tokens = await loginAs(request, 'admin');
    const h = authHeaders(tokens);

    await checkEndpoint(request, h, 'GET', '/api/billing/saas/plans/');
    await checkEndpoint(request, h, 'GET', '/api/billing/saas/subscriptions/');
  });

  test('no endpoint returns 500', async ({ request }) => {
    // Run a quick pass of all core endpoints with student token too
    const tokens = await loginAs(request, 'student');
    const h = authHeaders(tokens);

    const studentEndpoints = [
      '/api/users/accounts/me/',
      '/api/academic/subjects/',
      '/api/academic/lessons/',
      '/api/academic/assessments/',
      '/api/ai/conversations/',
      '/api/gamification/leaderboard/',
      '/api/notifications/notifications/',
      '/api/conversations/conversations/',
    ];

    for (const ep of studentEndpoints) {
      const res = await request.get(`${API_URL}${ep}`, { headers: h });
      expect(res.status(), `Student: GET ${ep} → ${res.status()}`).toBeLessThan(500);
    }
  });
});
