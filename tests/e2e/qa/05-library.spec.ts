/**
 * QA-05 — Library CRUD
 * =====================
 * Roles: admin (full CRUD), student (read only), teacher (read only)
 * Tests:
 *   ✓ List books
 *   ✓ Create book (admin)
 *   ✓ Update book (admin)
 *   ✓ Delete book (admin)
 *   ✓ Issue a book to student
 *   ✓ Return a book
 *   ✓ Student can view library
 *   ✗ Student cannot create books
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, apiPatch, apiDelete,
  authHeaders, assertForbidden, firstResult,
  API_URL, QA_TENANT,
} from './helpers';

test.describe('Library CRUD', () => {
  let bookId: string;

  // ── Admin: full CRUD ────────────────────────────────────────────────────
  test.describe('Admin — Book CRUD', () => {
    test('list all books', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/library/books/');
      expect(body).toBeTruthy();
    });

    test('create a book', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/library/books/', {
        title: 'QA Test Book',
        author: 'QA Author',
        category: 'technology',
        isbn: `978009999${Date.now().toString().slice(-4)}`,
        total_copies: 3,
        available_copies: 3,
        publisher: 'QA Press',
        published_year: 2024,
        description: 'A book created by QA tests.',
      }) as Record<string, unknown>;
      expect(created.title).toBe('QA Test Book');
      bookId = created.book_id as string;
    });

    test('update book — change description', async ({ request }) => {
      if (!bookId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(request, tokens, `/api/library/books/${bookId}/`, {
        description: 'Updated by QA test.',
        total_copies: 5,
      }) as Record<string, unknown>;
      expect(updated.total_copies).toBe(5);
    });

    test('get book detail', async ({ request }) => {
      if (!bookId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, `/api/library/books/${bookId}/`) as Record<string, unknown>;
      expect(body.book_id).toBe(bookId);
    });
  });

  // ── Book Issue / Return ──────────────────────────────────────────────────
  test.describe('Book Issue & Return', () => {
    let issueId: string;
    let studentProfileId: string;

    test.beforeAll(async ({ request }) => {
      // Get the QA student's profile id
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/academic/students/') as Record<string, unknown>;
      const students = Array.isArray(body) ? body : (body.results as unknown[]) ?? [];
      if (students.length === 0) return;
      const qaStudent = (students as Record<string, unknown>[]).find(
        s => (s.user as Record<string, unknown>)?.email === 'student@qa.test'
      );
      studentProfileId = qaStudent?.student_id as string ?? (students[0] as Record<string, unknown>).student_id as string;
    });

    test('issue a book to student', async ({ request }) => {
      if (!bookId || !studentProfileId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/library/issues/', {
        book: bookId,
        student: studentProfileId,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      }) as Record<string, unknown>;
      // BookIssue uses UUID primary key (issue_id), not integer id
      const issueKey = created.issue_id ?? created.id;
      expect(issueKey).toBeTruthy();
      issueId = issueKey as string;
    });

    test('return the book', async ({ request }) => {
      if (!issueId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(request, tokens, `/api/library/issues/${issueId}/`, {
        return_date: new Date().toISOString().split('T')[0],
        status: 'returned',
      }) as Record<string, unknown>;
      expect(updated).toBeTruthy();
    });
  });

  // ── Student: read-only access ────────────────────────────────────────────
  test.describe('Student — read-only library', () => {
    test('student can list books', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/library/books/');
      expect(body).toBeTruthy();
    });

    test('student cannot create a book', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      await assertForbidden(request, tokens, 'POST', '/api/library/books/', {
        title: 'Student Should Not Create',
        author: 'Anon',
        category: 'other',
        total_copies: 1,
        available_copies: 1,
      });
    });
  });

  // ── Teacher: read-only access ────────────────────────────────────────────
  test.describe('Teacher — read-only library', () => {
    test('teacher can list books', async ({ request }) => {
      const tokens = await loginAs(request, 'teacher');
      const body = await apiGet(request, tokens, '/api/library/books/');
      expect(body).toBeTruthy();
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  test('delete QA test book (cleanup)', async ({ request }) => {
    if (!bookId) test.skip();
    const tokens = await loginAs(request, 'admin');
    await apiDelete(request, tokens, `/api/library/books/${bookId}/`);
  });
});
