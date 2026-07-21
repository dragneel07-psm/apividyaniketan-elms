// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * Smoke checks for the projects module (/api/projects/ + /teacher/projects).
 *
 * Validates:
 *   - The route renders for an authenticated teacher (no 4xx/5xx).
 *   - The list endpoint responds with 200 (or 403 when the feature flag is off).
 *
 * Pre-reqs:
 *   - Backend at E2E_API_URL (default http://127.0.0.1:8000)
 *   - Frontend at E2E_BASE_URL (default http://127.0.0.1:3000)
 *   - Teacher creds in env: E2E_TEACHER_EMAIL / _PASSWORD / _SCHOOL_CODE
 *     (or one of the demo defaults the critical spec already documents)
 *   - Tenant has features.projects=True
 *
 * Run:    npx playwright test tests/e2e/smoke/projects-smoke.spec.ts --project=chromium
 */
import { expect, test } from '@playwright/test';

const FRONTEND = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const TENANT = process.env.E2E_TENANT || 'demo';

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'math@demo.school';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'Teacher@1234';
const TEACHER_SCHOOL = process.env.E2E_TEACHER_SCHOOL_CODE || TENANT;

async function getTeacherToken(request: import('@playwright/test').APIRequestContext): Promise<string> {
    const res = await request.post(`${API}/api/users/login/`, {
        headers: { 'x-tenant-id': TEACHER_SCHOOL, 'Content-Type': 'application/json' },
        data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
    });
    expect(
        res.ok(),
        `teacher login failed (${res.status()}); set E2E_TEACHER_* env vars or seed demo creds`,
    ).toBeTruthy();
    const body = (await res.json()) as { access?: string };
    expect(body.access).toBeTruthy();
    return body.access as string;
}

test.describe('projects smoke', () => {
    test('GET /api/projects/projects/ is alive for an authenticated teacher', async ({
        request,
    }) => {
        const token = await getTeacherToken(request);
        const res = await request.get(`${API}/api/projects/projects/`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': TEACHER_SCHOOL,
            },
        });
        // 200 when the feature flag is on, 403 when off — both prove routing+gating work.
        expect([200, 403]).toContain(res.status());
        if (res.status() === 403) {
            test.info().annotations.push({
                type: 'note',
                description:
                    'tenant features.projects is OFF — flip it on to exercise the full surface.',
            });
            return;
        }
        const body = (await res.json()) as unknown;
        const items = Array.isArray(body)
            ? body
            : Array.isArray((body as { results?: unknown[] }).results)
                ? (body as { results: unknown[] }).results
                : null;
        expect(items, 'list response should be an array or paginated payload').not.toBeNull();
    });

    test('teacher /teacher/projects renders without crashing', async ({ page, request }) => {
        await getTeacherToken(request); // ensure creds work; the page will reuse cookie/login flow

        await page.context().clearCookies();
        await page.goto(`${FRONTEND}/login/teacher`);
        await page.locator('input[type="email"]').first().fill(TEACHER_EMAIL);
        await page.locator('input[type="password"]').first().fill(TEACHER_PASSWORD);
        const schoolCodeInput = page.locator('input[name="school_code"]').first();
        if (await schoolCodeInput.count()) {
            await schoolCodeInput.fill(TEACHER_SCHOOL);
        }
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL(/\/teacher/, { timeout: 20_000 });

        await page.goto(`${FRONTEND}/teacher/projects`);
        await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({
            timeout: 20_000,
        });
        // No console errors thrown by the page should propagate to a visible error UI.
        await expect(page.getByText(/Failed to load projects/i)).toHaveCount(0);
    });
});
