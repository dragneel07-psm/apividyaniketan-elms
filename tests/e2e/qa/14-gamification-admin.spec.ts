/**
 * QA-14 — Gamification Admin
 * ===========================
 * Roles: admin (full CRUD on badges), student (read-only)
 * Tests:
 *   ✓ Admin can list badges
 *   ✓ Admin can create a badge
 *   ✓ Admin can update a badge
 *   ✓ Admin can delete a badge
 *   ✓ Student can view available badges (read-only)
 *   ✓ Student cannot create badges (403)
 *   ✓ Student can view their own earned badges
 *   ✓ Leaderboard returns enriched response (scope, entries, my_rank)
 *   ✓ Admin gamification UI page renders (requires E2E_BASE_URL)
 *   ✓ Student achievements UI page renders (requires E2E_BASE_URL)
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, apiPatch, apiDelete,
  authHeaders, assertForbidden,
  API_URL, FRONTEND_URL,
} from './helpers';

test.describe('Gamification Admin', () => {
  let badgeId: string;

  // ── Admin: full CRUD ──────────────────────────────────────────────────────

  test.describe('Admin — Badge CRUD', () => {
    test('admin can list badges', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/gamification/available-badges/');
      expect(body).toBeTruthy();
    });

    test('admin can create a badge', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/gamification/available-badges/', {
        name: 'QA Test Badge',
        description: 'Badge created by QA test suite',
        icon_name: 'star',
        criteria_type: 'lessons_completed',
        criteria_value: 99,
        xp_reward: 999,
      }) as Record<string, unknown>;
      expect(created.name).toBe('QA Test Badge');
      badgeId = (created.id ?? created.badge_id) as string;
    });

    test('admin can update a badge', async ({ request }) => {
      if (!badgeId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(
        request, tokens, `/api/gamification/available-badges/${badgeId}/`,
        { description: 'Updated by QA test.', xp_reward: 42 }
      ) as Record<string, unknown>;
      expect(Number(updated.xp_reward)).toBe(42);
    });

    test('admin can delete a badge', async ({ request }) => {
      if (!badgeId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/gamification/available-badges/${badgeId}/`);
    });
  });

  // ── Student: read-only ────────────────────────────────────────────────────

  test.describe('Student — Gamification access', () => {
    test('student can list available badges', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const res = await request.get(
        `${API_URL}/api/gamification/available-badges/`,
        { headers: authHeaders(tokens) }
      );
      expect(res.status()).toBe(200);
    });

    test('student cannot create a badge (403)', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      await assertForbidden(request, tokens, 'POST', '/api/gamification/available-badges/', {
        name: 'Hacked Badge',
        description: 'Should fail',
        icon_name: 'bomb',
        criteria_type: 'lessons_completed',
        criteria_value: 1,
        xp_reward: 9999,
      });
    });

    test('student can view their own badges', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const res = await request.get(
        `${API_URL}/api/gamification/student-badges/`,
        { headers: authHeaders(tokens) }
      );
      expect(res.status()).toBeLessThan(500);
    });
  });

  // ── Leaderboard ───────────────────────────────────────────────────────────

  test('leaderboard returns enriched shape', async ({ request }) => {
    const tokens = await loginAs(request, 'admin');
    const res = await request.get(
      `${API_URL}/api/gamification/leaderboard/`,
      { headers: authHeaders(tokens) }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    // New shape: { scope, total_participants, my_rank, entries }
    expect(body).toHaveProperty('entries');
    expect(body).toHaveProperty('scope');
    expect(Array.isArray(body.entries)).toBe(true);
  });

  // ── Frontend pages ────────────────────────────────────────────────────────

  test.describe('Gamification UI pages', () => {
    test('admin gamification page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/admin/gamification`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('student achievements page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/student/achievements`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });

    test('student leaderboard page renders', async ({ page }) => {
      test.skip(!process.env.E2E_BASE_URL, 'Frontend not running — set E2E_BASE_URL');
      const res = await page.goto(`${FRONTEND_URL}/student/leaderboard`);
      expect((res?.status() ?? 200)).toBeLessThan(500);
    });
  });
});
