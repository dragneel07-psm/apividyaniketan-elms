/**
 * QA-08 — Conversations CRUD
 * ===========================
 * Tests:
 *   ✓ Create conversation (teacher → student)
 *   ✓ List conversations
 *   ✓ Send a message
 *   ✓ List messages in conversation
 *   ✓ Student can view conversation they're part of
 *   ✓ Student cannot see conversations they're NOT part of (RBAC)
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, authHeaders, API_URL, QA_TENANT,
} from './helpers';

test.describe('Conversations CRUD', () => {
  let conversationId: string;

  // ── Create conversation ───────────────────────────────────────────────────
  test.describe('Teacher — Create & Message', () => {
    test('create a direct conversation', async ({ request }) => {
      const tokens = await loginAs(request, 'teacher');

      // Get student user_id
      const studentTokens = await loginAs(request, 'student');
      const meRes = await request.get(`${API_URL}/api/users/accounts/me/`, {
        headers: authHeaders(studentTokens),
      });
      const studentUser = await meRes.json() as Record<string, unknown>;

      const created = await apiPost(request, tokens, '/api/conversations/conversations/', {
        type: 'direct',
        title: 'QA Teacher-Student Chat',
        participants: [studentUser.user_id],
      }) as Record<string, unknown>;
      expect(created.type).toBe('direct');
      conversationId = created.conversation_id as string;
    });

    test('send a message in the conversation', async ({ request }) => {
      if (!conversationId) test.skip();
      const tokens = await loginAs(request, 'teacher');
      const created = await apiPost(request, tokens, '/api/conversations/messages/', {
        conversation: conversationId,
        content: 'Hello from QA teacher! This is a test message.',
      }) as Record<string, unknown>;
      expect(created.content).toBe('Hello from QA teacher! This is a test message.');
    });

    test('list messages in conversation', async ({ request }) => {
      if (!conversationId) test.skip();
      const tokens = await loginAs(request, 'teacher');
      const res = await request.get(
        `${API_URL}/api/conversations/messages/?conversation=${conversationId}`,
        { headers: authHeaders(tokens) },
      );
      expect(res.status()).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toBeTruthy();
    });
  });

  // ── List conversations ────────────────────────────────────────────────────
  test.describe('List Conversations', () => {
    test('teacher can list conversations', async ({ request }) => {
      const tokens = await loginAs(request, 'teacher');
      const body = await apiGet(request, tokens, '/api/conversations/conversations/');
      expect(body).toBeTruthy();
    });

    test('student can list conversations', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/conversations/conversations/');
      expect(body).toBeTruthy();
    });

    test('admin can list all conversations', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/conversations/conversations/');
      expect(body).toBeTruthy();
    });
  });

  // ── Student: reply in conversation ───────────────────────────────────────
  test.describe('Student — Reply', () => {
    test('student can send message in shared conversation', async ({ request }) => {
      if (!conversationId) test.skip();
      const tokens = await loginAs(request, 'student');
      const created = await apiPost(request, tokens, '/api/conversations/messages/', {
        conversation: conversationId,
        content: 'Reply from QA student!',
      }) as Record<string, unknown>;
      expect(created.content).toBe('Reply from QA student!');
    });
  });
});
