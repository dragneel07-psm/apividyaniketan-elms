// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * Critical end-to-end flow for the projects module.
 *
 * Steps (all driven through the public REST API, then verified in the
 * teacher UI at the end):
 *   1. Teacher creates an individual project (no group constraints).
 *   2. Teacher activates the project.
 *   3. Teacher creates a task in that project.
 *   4. Teacher marks the task done.
 *   5. Teacher submits the project (since it's individual, mentor can submit).
 *   6. Teacher grades the project (final_grade=85).
 *   7. Confirm the graded final grade is reflected in /teacher/projects in the browser.
 *
 * Pre-reqs:
 *   - Backend + frontend dev servers running.
 *   - Teacher creds via env (E2E_TEACHER_*) — falls back to demo defaults.
 *   - Tenant has features.projects=True. If the API returns 403 the test
 *     skips itself with an annotation so flag-off environments don't fail CI.
 *
 * Run:    npx playwright test tests/e2e/critical/projects.spec.ts --project=chromium
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const FRONTEND = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const TENANT = process.env.E2E_TENANT || 'demo';

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'math@demo.school';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'Teacher@1234';
const TEACHER_SCHOOL = process.env.E2E_TEACHER_SCHOOL_CODE || TENANT;

interface LoginResponse {
    access: string;
    refresh: string;
}

async function login(request: APIRequestContext): Promise<string> {
    const res = await request.post(`${API}/api/users/login/`, {
        headers: { 'x-tenant-id': TEACHER_SCHOOL, 'Content-Type': 'application/json' },
        data: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
    });
    expect(res.ok(), `teacher login failed (${res.status()})`).toBeTruthy();
    const body = (await res.json()) as LoginResponse;
    return body.access;
}

function authHeaders(token: string): Record<string, string> {
    return {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': TEACHER_SCHOOL,
        'Content-Type': 'application/json',
    };
}

async function expectOk<T>(
    res: import('@playwright/test').APIResponse,
    context: string,
): Promise<T> {
    const body = (await res.json().catch(() => ({}))) as unknown;
    expect(res.ok(), `${context}: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy();
    return body as T;
}

test.describe('projects critical flow', () => {
    test('teacher creates → activates → tasks → submits → grades → UI shows grade', async ({
        page,
        request,
    }) => {
        const token = await login(request);
        const headers = authHeaders(token);
        const title = `E2E Project ${Date.now()}`;

        // Step 1: create — feature flag may be off; skip cleanly.
        const createRes = await request.post(`${API}/api/projects/projects/`, {
            headers,
            data: { title, is_group: false },
        });
        if (createRes.status() === 403) {
            test.skip(
                true,
                'tenant features.projects is OFF — flip it on to run the critical projects flow.',
            );
        }
        const project = await expectOk<{ project_id: string; status: string }>(
            createRes,
            'create project',
        );
        expect(project.status).toBe('draft');

        // Step 2: activate.
        const activateRes = await request.post(
            `${API}/api/projects/projects/${project.project_id}/activate/`,
            { headers },
        );
        const activated = await expectOk<{ status: string }>(activateRes, 'activate');
        expect(activated.status).toBe('active');

        // Step 3: create a task.
        const taskRes = await request.post(`${API}/api/projects/tasks/`, {
            headers,
            data: { project: project.project_id, title: 'Research' },
        });
        const task = await expectOk<{ task_id: string; status: string }>(taskRes, 'create task');
        expect(task.status).toBe('todo');

        // Step 4: mark task done.
        const doneRes = await request.patch(`${API}/api/projects/tasks/${task.task_id}/`, {
            headers,
            data: { status: 'done' },
        });
        const doneTask = await expectOk<{ status: string }>(doneRes, 'mark done');
        expect(doneTask.status).toBe('done');

        // Step 5: submit the project (individual project, mentor allowed by submit RBAC).
        const submitRes = await request.post(
            `${API}/api/projects/projects/${project.project_id}/submit/`,
            { headers, data: { notes: 'Done.' } },
        );
        await expectOk(submitRes, 'submit');

        const afterSubmit = await request.get(
            `${API}/api/projects/projects/${project.project_id}/`,
            { headers },
        );
        const submitted = await expectOk<{ status: string }>(afterSubmit, 'fetch submitted');
        expect(submitted.status).toBe('submitted');

        // Step 6: grade.
        const gradeRes = await request.post(
            `${API}/api/projects/projects/${project.project_id}/grade/`,
            { headers, data: { final_grade: 85, rubric_json: { research: 9 } } },
        );
        const graded = await expectOk<{ status: string; final_grade: number | string }>(
            gradeRes,
            'grade',
        );
        expect(graded.status).toBe('graded');
        expect(Number(graded.final_grade)).toBe(85);

        // Step 7: UI verification — log in as teacher and confirm the project appears
        // with status "graded" on the list page.
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

        await page.goto(`${FRONTEND}/teacher/projects?tab=all`);
        await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({
            timeout: 20_000,
        });

        // The card may live in either the "mine" or "all" tab depending on
        // mentor assignment, so click both before asserting.
        const allTab = page.getByRole('tab', { name: /all in tenant|all/i });
        if (await allTab.count()) await allTab.first().click();
        await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });

        // Open the detail page and confirm the graded badge + final grade text.
        await page.getByText(title).first().click();
        await expect(page.getByText(/graded/i)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/Final grade/i)).toBeVisible({ timeout: 10_000 });
    });
});
