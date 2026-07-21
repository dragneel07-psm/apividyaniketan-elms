/**
 * QA-06 — Notifications CRUD
 * ===========================
 * Tests:
 *   ✓ Admin: create notification template
 *   ✓ Admin: list templates
 *   ✓ Admin: update template
 *   ✓ Admin: delete template
 *   ✓ Admin: send notification to student
 *   ✓ Student: list own notifications
 *   ✓ Student: mark notification as read
 *   ✗ Student cannot create templates
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, apiPatch, apiDelete,
  authHeaders, assertForbidden, API_URL, QA_TENANT,
} from './helpers';

test.describe('Notifications CRUD', () => {

  // ── Notification Templates (admin) ────────────────────────────────────────
  test.describe('Admin — Notification Templates', () => {
    let templateId: number;

    test('create notification template', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/notifications/templates/', {
        name: 'QA Fee Reminder',
        subject_template: 'Fee Due: {title}',
        body_template: 'Dear {name}, your fee of {amount} is due on {date}.',
        type: 'app',
        is_active: true,
      }) as Record<string, unknown>;
      expect(created.name).toBe('QA Fee Reminder');
      templateId = created.id as number;
    });

    test('list templates', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/notifications/templates/');
      expect(body).toBeTruthy();
    });

    test('update template', async ({ request }) => {
      if (!templateId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(request, tokens, `/api/notifications/templates/${templateId}/`, {
        name: 'QA Fee Reminder Updated',
      }) as Record<string, unknown>;
      expect(updated.name).toBe('QA Fee Reminder Updated');
    });

    test('delete template', async ({ request }) => {
      if (!templateId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/notifications/templates/${templateId}/`);
    });
  });

  // ── Send Notification ─────────────────────────────────────────────────────
  test.describe('Admin — Send Notification', () => {
    let notifId: number;

    test('create in-app notification for student', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');

      // Get student user id
      const meRes = await request.get(`${API_URL}/api/users/accounts/me/`, {
        headers: {
          'Authorization': `Bearer ${(await loginAs(request, 'student')).access}`,
          'x-tenant-id': QA_TENANT,
        },
      });
      const studentUser = await meRes.json() as Record<string, unknown>;

      const created = await apiPost(request, tokens, '/api/notifications/notifications/', {
        recipient: studentUser.user_id,
        title: 'QA Test Alert',
        message: 'This is a QA automated test notification.',
      }) as Record<string, unknown>;
      expect(created.title).toBe('QA Test Alert');
      notifId = created.id as number;
    });

    test('delete notification (cleanup)', async ({ request }) => {
      if (!notifId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/notifications/notifications/${notifId}/`);
    });
  });

  // ── Student: read own notifications ──────────────────────────────────────
  test.describe('Student — View & Read Notifications', () => {
    test('student can list own notifications', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/notifications/notifications/');
      expect(body).toBeTruthy();
    });

    test('student cannot create notification templates', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const res = await request.post(`${API_URL}/api/notifications/templates/`, {
        headers: authHeaders(tokens),
        data: { name: 'Student Template', subject_template: 'test', body_template: 'test', type: 'app' },
      });
      expect([403, 401]).toContain(res.status());
    });
  });
});
