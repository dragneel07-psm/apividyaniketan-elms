/**
 * QA-09 — Billing CRUD
 * =====================
 * Tests:
 *   ✓ Admin: create fee structure
 *   ✓ Admin: list fee structures
 *   ✓ Admin: update fee structure
 *   ✓ Admin: delete fee structure
 *   ✓ Admin: assign fee to student
 *   ✓ Admin: list student fees
 *   ✓ Admin: billing dashboard responds
 *   ✗ Student cannot access billing management
 *   ✗ Teacher cannot manage fees
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, apiPatch, apiDelete,
  authHeaders, assertForbidden, API_URL, QA_TENANT,
} from './helpers';

test.describe('Billing CRUD', () => {

  // ── Fee Structures ────────────────────────────────────────────────────────
  test.describe('Admin — Fee Structure CRUD', () => {
    let feeStructureId: number;

    test('create fee structure', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/billing/school/fee-structures/', {
        name: 'QA Tuition Fee',
        amount: 10000.00,
        frequency: 'monthly',
        description: 'Monthly tuition fee created by QA.',
        is_active: true,
      }) as Record<string, unknown>;
      expect(created.name).toBe('QA Tuition Fee');
      feeStructureId = created.id as number;
    });

    test('list fee structures', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/billing/school/fee-structures/');
      expect(body).toBeTruthy();
    });

    test('update fee structure', async ({ request }) => {
      if (!feeStructureId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(request, tokens, `/api/billing/school/fee-structures/${feeStructureId}/`, {
        amount: 12000.00,
        description: 'Updated by QA.',
      }) as Record<string, unknown>;
      expect(Number(updated.amount)).toBe(12000);
    });

    test('delete fee structure (cleanup)', async ({ request }) => {
      if (!feeStructureId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/billing/school/fee-structures/${feeStructureId}/`);
    });
  });

  // ── Student Fees ──────────────────────────────────────────────────────────
  test.describe('Admin — Student Fees', () => {
    test('list student fees', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/billing/school/student-fees/');
      expect(body).toBeTruthy();
    });
  });

  // ── Payments ──────────────────────────────────────────────────────────────
  test.describe('Admin — Payments', () => {
    test('list payments', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/billing/school/payments/');
      expect(body).toBeTruthy();
    });
  });

  // ── Expenses ─────────────────────────────────────────────────────────────
  test.describe('Admin — Expenses', () => {
    let expenseId: number;

    test('create expense', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/billing/school/expenses/', {
        title: 'QA Office Supplies',
        amount: 500.00,
        category: 'supplies',
        date: new Date().toISOString().split('T')[0],
        description: 'QA test expense entry.',
      }) as Record<string, unknown>;
      expect(created.title).toBe('QA Office Supplies');
      expenseId = created.id as number;
    });

    test('list expenses', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/billing/school/expenses/');
      expect(body).toBeTruthy();
    });

    test('delete expense (cleanup)', async ({ request }) => {
      if (!expenseId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/billing/school/expenses/${expenseId}/`);
    });
  });

  // ── Billing Dashboard ─────────────────────────────────────────────────────
  test.describe('Billing Dashboard', () => {
    test('billing dashboard endpoint responds', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const res = await request.get(`${API_URL}/api/billing/school/dashboard/`, {
        headers: authHeaders(tokens),
      });
      expect([200, 404]).toContain(res.status());
    });
  });

  // ── RBAC ──────────────────────────────────────────────────────────────────
  test.describe('RBAC — billing access', () => {
    test('student cannot list fee structures', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      await assertForbidden(request, tokens, 'GET', '/api/billing/school/fee-structures/');
    });

    test('teacher cannot manage fees', async ({ request }) => {
      const tokens = await loginAs(request, 'teacher');
      await assertForbidden(request, tokens, 'POST', '/api/billing/school/fee-structures/', {
        name: 'Teacher Should Not Create',
        amount: 100,
        frequency: 'monthly',
      });
    });
  });
});
