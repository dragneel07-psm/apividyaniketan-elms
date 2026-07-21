/**
 * QA Test Helpers
 * ================
 * Shared utilities for all QA Playwright tests.
 * Every spec imports from here — keeps auth and API calls DRY.
 */
import { type APIRequestContext, expect } from '@playwright/test';

// ── Environment ──────────────────────────────────────────────────────────────
export const API_URL      = (process.env.E2E_API_URL      || 'http://127.0.0.1:8000').replace(/\/+$/, '');
export const FRONTEND_URL = (process.env.E2E_BASE_URL      || 'http://127.0.0.1:3000').replace(/\/+$/, '');
export const QA_TENANT    = process.env.E2E_QA_TENANT      || 'qa';

// ── Fixed credentials (must match setup_qa_tenant management command) ─────────
// Override per-role via env vars: E2E_ADMIN_EMAIL / E2E_ADMIN_PASS, etc.
export const CREDENTIALS = {
  admin:    { email: process.env.E2E_ADMIN_EMAIL   || 'admin@qa.test',    password: process.env.E2E_ADMIN_PASS   || 'QAAdmin123!',   role: 'admin' },
  staff:    { email: process.env.E2E_STAFF_EMAIL   || 'staff@qa.test',    password: process.env.E2E_STAFF_PASS   || 'QAStaff123!',   role: 'staff' },
  teacher:  { email: process.env.E2E_TEACHER_EMAIL || 'teacher@qa.test',  password: process.env.E2E_TEACHER_PASS || 'QATeacher123!', role: 'teacher' },
  student:  { email: process.env.E2E_STUDENT_EMAIL || 'student@qa.test',  password: process.env.E2E_STUDENT_PASS || 'QAStudent123!', role: 'student' },
  parent:   { email: process.env.E2E_PARENT_EMAIL  || 'parent@qa.test',   password: process.env.E2E_PARENT_PASS  || 'QAParent123!',  role: 'parent' },
} as const;

export type RoleKey = keyof typeof CREDENTIALS;

export interface AuthTokens {
  access: string;
  refresh: string;
  role: string;
}

// ── Token cache (one token per role per test run) ─────────────────────────────
const tokenCache = new Map<RoleKey, AuthTokens>();

/**
 * Login via /api/token/ and return JWT tokens.
 * Results are cached per role for the duration of the test run.
 */
export async function loginAs(request: APIRequestContext, role: RoleKey): Promise<AuthTokens> {
  if (tokenCache.has(role)) return tokenCache.get(role)!;

  const cred = CREDENTIALS[role];
  const res = await request.post(`${API_URL}/api/token/`, {
    data: { email: cred.email, password: cred.password },
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': QA_TENANT },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login failed for role=${role}: ${res.status()} ${body}`);
  }

  const body = await res.json();
  const tokens: AuthTokens = {
    access:  body.access,
    refresh: body.refresh,
    role:    body.user?.role ?? role,
  };
  tokenCache.set(role, tokens);
  return tokens;
}

/** Clear cached tokens (call in afterAll if needed) */
export function clearTokenCache() {
  tokenCache.clear();
}

/**
 * Build standard auth headers for API requests.
 */
export function authHeaders(tokens: AuthTokens): Record<string, string> {
  return {
    'Authorization': `Bearer ${tokens.access}`,
    'Content-Type':  'application/json',
    'x-tenant-id':   QA_TENANT,
  };
}

/**
 * Perform an authenticated GET and assert 200.
 */
export async function apiGet(
  request: APIRequestContext,
  tokens: AuthTokens,
  path: string,
): Promise<unknown> {
  const res = await request.get(`${API_URL}${path}`, { headers: authHeaders(tokens) });
  expect(res.status(), `GET ${path} → ${res.status()}`).toBe(200);
  return res.json();
}

/**
 * Perform an authenticated POST and assert the expected status (default 201).
 */
export async function apiPost(
  request: APIRequestContext,
  tokens: AuthTokens,
  path: string,
  data: Record<string, unknown>,
  expectedStatus = 201,
): Promise<unknown> {
  const res = await request.post(`${API_URL}${path}`, {
    data,
    headers: authHeaders(tokens),
  });
  expect(res.status(), `POST ${path} → ${res.status()}`).toBe(expectedStatus);
  return res.json();
}

/**
 * Perform an authenticated PATCH and assert 200.
 */
export async function apiPatch(
  request: APIRequestContext,
  tokens: AuthTokens,
  path: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  const res = await request.patch(`${API_URL}${path}`, {
    data,
    headers: authHeaders(tokens),
  });
  expect(res.status(), `PATCH ${path} → ${res.status()}`).toBe(200);
  return res.json();
}

/**
 * Perform an authenticated DELETE and assert 204.
 */
export async function apiDelete(
  request: APIRequestContext,
  tokens: AuthTokens,
  path: string,
): Promise<void> {
  const res = await request.delete(`${API_URL}${path}`, { headers: authHeaders(tokens) });
  expect(res.status(), `DELETE ${path} → ${res.status()}`).toBe(204);
}

/**
 * Assert that a role is DENIED access to a path (403 or 401).
 */
export async function assertForbidden(
  request: APIRequestContext,
  tokens: AuthTokens,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  data?: Record<string, unknown>,
): Promise<void> {
  let res;
  if (method === 'GET')    res = await request.get(`${API_URL}${path}`,    { headers: authHeaders(tokens) });
  else if (method === 'POST') res = await request.post(`${API_URL}${path}`, { data, headers: authHeaders(tokens) });
  else                     res = await request.delete(`${API_URL}${path}`, { headers: authHeaders(tokens) });
  expect([401, 403], `Expected 401/403 for ${method} ${path}`).toContain(res.status());
}

/**
 * Extract the first item from a DRF list response (handles pagination).
 */
export function firstResult(body: unknown): Record<string, unknown> {
  if (Array.isArray(body)) return body[0];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b['results'])) return (b['results'] as Record<string, unknown>[])[0];
  return b;
}
