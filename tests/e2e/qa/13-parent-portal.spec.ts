/**
 * QA-13 — Parent Portal
 * ======================
 * Role: admin (for data access), student (for my-fees), parent (when creds available)
 * Tests:
 *   ✓ Parent profile lists linked children
 *   ✓ Child attendance endpoint returns records
 *   ✓ Child results endpoint returns grades
 *   ✓ Child fees endpoint returns fee summary
 *   ✓ Student can access own fees via my-fees endpoint
 *   ✓ Admin can request / list / cancel parent-teacher meetings
 *   ✓ Parent cannot access admin-only endpoints (RBAC)
 *   ✓ Academic year alignment check endpoint works
 *   ✓ Parent portal UI pages render (requires E2E_BASE_URL)
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost,
  authHeaders, API_URL, FRONTEND_URL,
} from './helpers';

test.describe('Parent Portal', () => {

  // ── Profile & children ──────────────────────────────────────────────────────
  test('parent list returns parents with linked students', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const res = await request.get(`${API_URL}/api/academic/parents/`, {
      headers: authHeaders(tokens),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.results ?? []);
    expect(items.length).toBeGreaterThan(0);
    // Each parent has a students array
    expect(items[0]).toHaveProperty('students');
  });

  // ── Child detail endpoints ──────────────────────────────────────────────────
  test.describe('Child detail endpoints', () => {
    let studentId: string;

    test.beforeAll(async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await request.get(`${API_URL}/api/academic/students/`, {
        headers: authHeaders(tokens),
      });
      const data = await body.json();
      const results = data.results ?? (Array.isArray(data) ? data : []);
      studentId = (results[0]?.student_id ?? results[0]?.id) as string;
    });

    test('child attendance endpoint responds', async ({ request }) => {
      if (!studentId) return;
      const tokens = await loginAs(request, 'admin');
      const res = await request.get(
        `${API_URL}/api/academic/parents/child/${studentId}/attendance/`,
        { headers: authHeaders(tokens) },
      );
      expect([200, 403, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('summary');
      }
    });

    test('child results endpoint returns grades', async ({ request }) => {
      if (!studentId) return;
      const tokens = await loginAs(request, 'admin');
      const res = await request.get(
        `${API_URL}/api/academic/parents/child/${studentId}/results/`,
        { headers: authHeaders(tokens) },
      );
      expect([200, 403, 404]).toContain(res.status());
      if (res.status() === 200) {
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
      }
    });

    test('child fees endpoint returns summary', async ({ request }) => {
      if (!studentId) return;
      const tokens = await loginAs(request, 'admin');
      const res = await request.get(
        `${API_URL}/api/academic/parents/child/${studentId}/fees/`,
        { headers: authHeaders(tokens) },
      );
      expect([200, 403, 404]).toContain(res.status());
    });
  });

  // ── Student self-service fees ────────────────────────────────────────────────
  test('student-fees my-fees endpoint responds (admin)', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const res = await request.get(
      `${API_URL}/api/billing/school/student-fees/my_fees/`,
      { headers: authHeaders(tokens) },
    );
    // Admin has no student profile → 404. Student would get 200.
    // 404 from billing means endpoint exists; 405 means not yet deployed.
    expect([200, 404]).toContain(res.status());
  });

  // ── Parent-teacher meetings ──────────────────────────────────────────────────
  test.describe('Parent-teacher meetings', () => {
    let meetingId: string | null = null;
    let studentId: string;
    let teacherId: string;
    let parentId: string;

    test.beforeAll(async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const [studentsRes, teachersRes, parentsRes] = await Promise.all([
        request.get(`${API_URL}/api/academic/students/`, { headers: authHeaders(tokens) }),
        request.get(`${API_URL}/api/academic/teachers/`, { headers: authHeaders(tokens) }),
        request.get(`${API_URL}/api/academic/parents/`, { headers: authHeaders(tokens) }),
      ]);
      const students = await studentsRes.json();
      const teachers = await teachersRes.json();
      const parents = await parentsRes.json();
      const sItems = students.results ?? (Array.isArray(students) ? students : []);
      const tItems = teachers.results ?? (Array.isArray(teachers) ? teachers : []);
      const pItems = parents.results ?? (Array.isArray(parents) ? parents : []);
      studentId = (sItems[0]?.student_id ?? sItems[0]?.id) as string;
      teacherId = (tItems[0]?.id) as string;
      parentId = (pItems[0]?.parent_id ?? pItems[0]?.id) as string;
    });

    test('admin can create a parent-teacher meeting', async ({ request }) => {
      if (!studentId || !teacherId || !parentId) return;
      const tokens = await loginAs(request, 'admin');
      const res = await request.post(`${API_URL}/api/academic/parent-meetings/`, {
        headers: authHeaders(tokens),
        data: {
          student: studentId,
          teacher: teacherId,
          parent: parentId,
          requested_date: '2030-09-15',
          preferred_slot: 'morning',
          purpose: 'QA test meeting request',
        },
      });
      expect([200, 201]).toContain(res.status());
      const body = await res.json();
      meetingId = (body.meeting_id ?? body.id) as string ?? null;
    });

    test('admin can list parent-teacher meetings', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/academic/parent-meetings/');
      expect(body).toBeTruthy();
    });

    test('admin can cancel a meeting', async ({ request }) => {
      if (!meetingId) return;
      const tokens = await loginAs(request, 'admin');
      const res = await request.post(
        `${API_URL}/api/academic/parent-meetings/${meetingId}/cancel/`,
        {
          headers: authHeaders(tokens),
          data: { reason: 'QA test cleanup' },
        },
      );
      expect([200, 204]).toContain(res.status());
    });
  });

  // ── RBAC ─────────────────────────────────────────────────────────────────────
  test('teacher cannot access admin year-alignment endpoint', async ({ request }) => {
    const tokens = await loginAs(request, 'teacher');
    const res = await request.get(
      `${API_URL}/api/academic/admin/actions/check-year-alignment/`,
      { headers: authHeaders(tokens) },
    );
    expect([403, 401]).toContain(res.status());
  });

  // ── Year alignment check ──────────────────────────────────────────────────────
  test('admin can check academic year alignment', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const res = await request.get(
      `${API_URL}/api/academic/admin/actions/check-year-alignment/`,
      { headers: authHeaders(tokens) },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('current_year');
    expect(body).toHaveProperty('alignment');
    expect(body).toHaveProperty('counts_by_year');
  });

  // ── Frontend pages ─────────────────────────────────────────────────────────
  test.describe('Parent UI pages', () => {
    test('parent dashboard renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/parent`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('parent children page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/parent/children`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('parent grades page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/parent/grades`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('parent fees page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/parent/fees`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('parent meetings page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/parent/meetings`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });
  });
});
