import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

type Role = 'student' | 'teacher' | 'admin' | 'staff';

type Credential = {
  email: string;
  password: string;
  schoolCode: string;
};

type LoginPayload = {
  access: string;
  refresh: string;
  user?: {
    role?: string;
  };
};

type SeedResult = {
  runId: string;
  tenantValue: string | null;
  admin: Credential;
  teacher: Credential;
  student: Credential;
  staff: Credential;
  counts: {
    classes: number;
    sections: number;
    teachers: number;
    staff: number;
    subjects: number;
    chapters: number;
    lessons: number;
    materials: number;
    students: number;
  };
};

const FRONTEND_BASE_URL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API_BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEFAULT_TENANT = process.env.E2E_TENANT || 'demo';

const TARGET_STUDENTS = Number(process.env.E2E_DUMMY_STUDENTS || 100);
const TARGET_TEACHERS = Number(process.env.E2E_DUMMY_TEACHERS || 20);
const TARGET_STAFF = Number(process.env.E2E_DUMMY_STAFF || 3);
const TARGET_CLASSES = Number(process.env.E2E_DUMMY_CLASSES || 10);
const SUBJECTS_PER_CLASS = Number(process.env.E2E_DUMMY_SUBJECTS_PER_CLASS || 3);
const CHAPTERS_PER_SUBJECT = Number(process.env.E2E_DUMMY_CHAPTERS_PER_SUBJECT || 1);
const LESSONS_PER_CHAPTER = Number(process.env.E2E_DUMMY_LESSONS_PER_CHAPTER || 2);

const credentialCache = new Map<Role, Credential>();
let seededData: SeedResult | null = null;

function appUrl(route: string): string {
  return `${FRONTEND_BASE_URL}${route}`;
}

function apiUrl(route: string): string {
  return `${API_BASE_URL}${route}`;
}

function uniqueRunId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roleDashboard(role: Role): string {
  if (role === 'admin' || role === 'staff') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
}

function authHeaders(accessToken: string, schoolCode: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': schoolCode,
  };
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

async function fetchAllPages<T>(
  request: APIRequestContext,
  route: string,
  headers: Record<string, string>,
): Promise<T[]> {
  const firstResponse = await request.get(apiUrl(route), { headers });
  if (!firstResponse.ok()) return [];
  const firstPayload = await firstResponse.json();

  if (Array.isArray(firstPayload)) return firstPayload as T[];
  if (!firstPayload || typeof firstPayload !== 'object') return [];

  const results = normalizeList<T>(firstPayload);
  let next = (firstPayload as { next?: string | null }).next || null;

  while (next) {
    const nextResponse = await request.get(next, { headers });
    if (!nextResponse.ok()) break;
    const nextPayload = await nextResponse.json();
    if (Array.isArray(nextPayload)) {
      results.push(...(nextPayload as T[]));
      break;
    }
    results.push(...normalizeList<T>(nextPayload));
    next = (nextPayload as { next?: string | null }).next || null;
  }

  return results;
}

function withEnvCredential(role: Role): Credential[] {
  const upper = role.toUpperCase();
  const email = process.env[`E2E_${upper}_EMAIL`];
  const password = process.env[`E2E_${upper}_PASSWORD`];
  const schoolCode = process.env[`E2E_${upper}_SCHOOL_CODE`] || DEFAULT_TENANT;

  if (!email || !password) return [];
  return [{ email, password, schoolCode }];
}

function candidateCredentials(role: Role): Credential[] {
  const defaults: Record<Role, Credential[]> = {
    student: [
      { email: 'student1@demo.school', password: 'Student@1234', schoolCode: DEFAULT_TENANT },
      { email: 'student@demo.school', password: 'Student@1234', schoolCode: DEFAULT_TENANT },
      { email: 'student@demo.com', password: 'student123', schoolCode: DEFAULT_TENANT },
    ],
    teacher: [
      { email: 'math@demo.school', password: 'Teacher@1234', schoolCode: DEFAULT_TENANT },
      { email: 'teacher@demo.com', password: 'teacher123', schoolCode: DEFAULT_TENANT },
    ],
    admin: [
      { email: 'admin@demo.school', password: 'Admin@1234', schoolCode: DEFAULT_TENANT },
      { email: 'admin@demo.com', password: 'admin123', schoolCode: DEFAULT_TENANT },
    ],
    staff: [
      { email: 'staff@demo.school', password: 'Staff@1234', schoolCode: DEFAULT_TENANT },
    ],
  };

  const merged = [...withEnvCredential(role), ...defaults[role]];
  const map = new Map<string, Credential>();
  for (const cred of merged) {
    map.set(`${cred.email}|${cred.password}|${cred.schoolCode}`, cred);
  }
  return Array.from(map.values());
}

async function tryLogin(request: APIRequestContext, credential: Credential): Promise<LoginPayload | null> {
  const response = await request.post(apiUrl('/api/users/login/'), {
    headers: {
      'x-tenant-id': credential.schoolCode,
      'Content-Type': 'application/json',
    },
    data: {
      email: credential.email,
      password: credential.password,
    },
  });

  if (!response.ok()) return null;
  return (await response.json()) as LoginPayload;
}

async function requireWorkingCredential(request: APIRequestContext, role: Role): Promise<Credential> {
  const cached = credentialCache.get(role);
  if (cached) return cached;

  for (const cred of candidateCredentials(role)) {
    const payload = await tryLogin(request, cred);
    if (payload?.access) {
      credentialCache.set(role, cred);
      return cred;
    }
  }

  test.skip(
    true,
    `No working ${role} credential found. Set E2E_${role.toUpperCase()}_EMAIL, E2E_${role.toUpperCase()}_PASSWORD, and optionally E2E_${role.toUpperCase()}_SCHOOL_CODE.`,
  );
  return candidateCredentials(role)[0];
}

async function loginAs(request: APIRequestContext, credential: Credential): Promise<LoginPayload> {
  const payload = await tryLogin(request, credential);
  expect(payload?.access, `Login failed for ${credential.email}`).toBeTruthy();
  return payload as LoginPayload;
}

async function postJson<T>(
  request: APIRequestContext,
  route: string,
  accessToken: string,
  schoolCode: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T | Record<string, unknown> }> {
  const response = await request.post(apiUrl(route), {
    headers: {
      ...authHeaders(accessToken, schoolCode),
      'Content-Type': 'application/json',
    },
    data,
  });

  const body = (await response.json().catch(() => ({}))) as T | Record<string, unknown>;
  return { ok: response.ok(), status: response.status(), data: body };
}

async function createStaffUsers(
  request: APIRequestContext,
  nextAccessToken: () => string,
  schoolCode: string,
  tenantValue: string | null,
  runId: string,
  count: number,
): Promise<Credential[]> {
  const created: Credential[] = [];
  for (let i = 0; i < count; i += 1) {
    const username = toSlug(`e2e-staff-${runId}-${i + 1}`);
    const email = `${username}@example.com`;
    const password = 'Staff@1234';

    const payload: Record<string, unknown> = {
      username,
      email,
      password,
      first_name: `Staff${i + 1}`,
      last_name: `Run${runId.slice(-6)}`,
      role: 'staff',
      is_active: true,
    };
    if (tenantValue) payload.tenant = tenantValue;

    const createdUser = await postJson<{ user_id: string }>(
      request,
      '/api/users/accounts/',
      nextAccessToken(),
      schoolCode,
      payload,
    );
    expect(createdUser.ok, `Failed to create staff ${email}: ${JSON.stringify(createdUser.data)}`).toBeTruthy();
    created.push({ email, password, schoolCode });
  }
  return created;
}

async function loginViaUi(page: Page, role: Role, credential: Credential): Promise<void> {
  const loginPath = role === 'staff' ? '/login/admin' : `/login/${role}`;
  await page.goto(appUrl(loginPath));
  await page.fill('#email', credential.email);
  await page.fill('#password', credential.password);
  await page.fill('#school_code', credential.schoolCode);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).toHaveURL(new RegExp(`${roleDashboard(role)}(?:$|[/?#])`), { timeout: 25_000 });
}

async function seedLargeDataset(request: APIRequestContext): Promise<SeedResult> {
  const admin = await requireWorkingCredential(request, 'admin');
  const adminSession = await loginAs(request, admin);
  const primaryAccessToken = adminSession.access;
  const schoolCode = admin.schoolCode;
  const runId = uniqueRunId();

  const meResponse = await request.get(apiUrl('/api/users/accounts/me/'), {
    headers: authHeaders(primaryAccessToken, schoolCode),
  });
  expect(meResponse.ok()).toBeTruthy();
  const mePayload = (await meResponse.json()) as { tenant?: string | number | null };
  const tenantValue = mePayload?.tenant ? String(mePayload.tenant) : null;

  const adminTokens: string[] = [primaryAccessToken];
  const requestedAdminPool = Math.max(1, Number(process.env.E2E_SEED_ADMIN_POOL || 6));
  for (let i = 1; i < requestedAdminPool; i += 1) {
    const email = `e2e-seed-admin-${runId}-${i}@example.com`;
    const password = 'Admin@12345';
    const payload: Record<string, unknown> = {
      username: toSlug(`e2e-seed-admin-${runId}-${i}`),
      email,
      password,
      first_name: `Seed${i}`,
      last_name: 'Admin',
      role: 'admin',
      is_active: true,
    };
    if (tenantValue) payload.tenant = tenantValue;

    const createAdmin = await postJson<{ user_id: string }>(
      request,
      '/api/users/accounts/',
      primaryAccessToken,
      schoolCode,
      payload,
    );
    expect(createAdmin.ok, `Failed to create seed admin ${email}: ${JSON.stringify(createAdmin.data)}`).toBeTruthy();

    const loginPayload = await loginAs(request, { email, password, schoolCode });
    adminTokens.push(loginPayload.access);
  }

  let tokenCursor = 0;
  const nextAccessToken = (): string => {
    const token = adminTokens[tokenCursor % adminTokens.length];
    tokenCursor += 1;
    return token;
  };

  const classIds: number[] = [];
  const sectionIds: number[] = [];

  for (let i = 0; i < TARGET_CLASSES; i += 1) {
    const className = `E2E-${runId}-Grade-${i + 1}`;
    const classResponse = await postJson<{ id: number }>(request, '/api/academic/classes/', nextAccessToken(), schoolCode, {
      name: className,
      order: 1000 + i,
    });
    expect(classResponse.ok, `Failed to create class ${className}: ${JSON.stringify(classResponse.data)}`).toBeTruthy();
    const classId = Number((classResponse.data as { id: number }).id);
    classIds.push(classId);

    for (const sectionName of ['A', 'B']) {
      const sectionResponse = await postJson<{ id: number }>(request, '/api/academic/sections/', nextAccessToken(), schoolCode, {
        name: sectionName,
        academic_class: classId,
        capacity: 60,
      });
      expect(sectionResponse.ok, `Failed to create section ${sectionName} for class ${classId}: ${JSON.stringify(sectionResponse.data)}`).toBeTruthy();
      sectionIds.push(Number((sectionResponse.data as { id: number }).id));
    }
  }

  const teacherCredentials: Credential[] = [];
  const teacherIds: string[] = [];
  for (let i = 0; i < TARGET_TEACHERS; i += 1) {
    const username = toSlug(`e2e-teacher-${runId}-${i + 1}`);
    const email = `${username}@example.com`;
    const password = 'Teacher@1234';
    const assignedClassId = classIds[i % classIds.length];

    const teacherResponse = await postJson<{ id: string }>(request, '/api/academic/teachers/', nextAccessToken(), schoolCode, {
      email,
      username,
      first_name: `Teacher${i + 1}`,
      last_name: `Run${runId.slice(-6)}`,
      password,
      designation: 'subject_teacher',
      assigned_classes: [assignedClassId],
    });
    expect(teacherResponse.ok, `Failed to create teacher ${email}: ${JSON.stringify(teacherResponse.data)}`).toBeTruthy();
    teacherCredentials.push({ email, password, schoolCode });
    teacherIds.push(String((teacherResponse.data as { id: string }).id));
  }

  const subjectIds: number[] = [];
  const subjectTitles = ['Mathematics', 'Science', 'English'];
  let subjectCounter = 0;
  for (const classId of classIds) {
    for (let i = 0; i < SUBJECTS_PER_CLASS; i += 1) {
      const title = subjectTitles[i % subjectTitles.length];
      const teacherId = teacherIds[subjectCounter % teacherIds.length];
      const subjectResponse = await postJson<{ id: number }>(request, '/api/academic/subjects/', nextAccessToken(), schoolCode, {
        name: `${title} ${runId}-${classId}-${i + 1}`,
        code: `E2E-${classId}-${i + 1}`,
        academic_class: classId,
        description: `Autogenerated subject ${subjectCounter + 1}`,
        is_elective: false,
        is_active: true,
        teacher: teacherId,
      });
      expect(subjectResponse.ok, `Failed to create subject for class ${classId}: ${JSON.stringify(subjectResponse.data)}`).toBeTruthy();
      subjectIds.push(Number((subjectResponse.data as { id: number }).id));
      subjectCounter += 1;
    }
  }

  const chapterIds: number[] = [];
  for (const subjectId of subjectIds) {
    for (let i = 0; i < CHAPTERS_PER_SUBJECT; i += 1) {
      const chapterResponse = await postJson<{ id: number }>(request, '/api/academic/chapters/', nextAccessToken(), schoolCode, {
        subject: subjectId,
        title: `E2E Chapter ${runId}-${subjectId}-${i + 1}`,
        description: 'Autogenerated chapter for deployed scale test',
        order: i + 1,
        is_published: true,
      });
      expect(chapterResponse.ok, `Failed to create chapter for subject ${subjectId}: ${JSON.stringify(chapterResponse.data)}`).toBeTruthy();
      chapterIds.push(Number((chapterResponse.data as { id: number }).id));
    }
  }

  const lessonIds: number[] = [];
  for (const chapterId of chapterIds) {
    for (let i = 0; i < LESSONS_PER_CHAPTER; i += 1) {
      const lessonResponse = await postJson<{ id: number }>(request, '/api/academic/lessons/', nextAccessToken(), schoolCode, {
        chapter: chapterId,
        title: `E2E Lesson ${runId}-${chapterId}-${i + 1}`,
        content_type: 'text',
        content: `<p>Autogenerated lesson content for run ${runId}</p>`,
        order: i + 1,
        is_published: true,
        duration_minutes: 20,
      });
      expect(lessonResponse.ok, `Failed to create lesson for chapter ${chapterId}: ${JSON.stringify(lessonResponse.data)}`).toBeTruthy();
      lessonIds.push(Number((lessonResponse.data as { id: number }).id));
    }
  }

  let materialCount = 0;
  for (const lessonId of lessonIds) {
    const materialResponse = await postJson<{ id: number }>(request, '/api/academic/materials/', nextAccessToken(), schoolCode, {
      lesson: lessonId,
      title: `Material ${runId}-${lessonId}`,
      link: `https://example.com/materials/${runId}/${lessonId}`,
      material_type: 'link',
    });
    expect(materialResponse.ok, `Failed to create material for lesson ${lessonId}: ${JSON.stringify(materialResponse.data)}`).toBeTruthy();
    materialCount += 1;
  }

  const studentCredentials: Credential[] = [];
  for (let i = 0; i < TARGET_STUDENTS; i += 1) {
    const username = toSlug(`e2e-student-${runId}-${i + 1}`);
    const email = `${username}@example.com`;
    const password = 'Student@1234';
    const classIndex = i % classIds.length;
    const academicClass = classIds[classIndex];
    const sectionA = sectionIds[classIndex * 2];
    const sectionB = sectionIds[classIndex * 2 + 1];
    const section = i % 2 === 0 ? sectionA : sectionB;

    const studentResponse = await postJson<{ id: string }>(request, '/api/academic/students/', nextAccessToken(), schoolCode, {
      email,
      password,
      first_name: `Student${i + 1}`,
      last_name: `Run${runId.slice(-6)}`,
      academic_class: academicClass,
      section,
      learning_style: 'visual',
      daily_study_goal: 60,
      ai_explanation_level: 'normal',
      language_preference: 'en',
    });
    expect(studentResponse.ok, `Failed to create student ${email}: ${JSON.stringify(studentResponse.data)}`).toBeTruthy();
    studentCredentials.push({ email, password, schoolCode });
  }

  const staffCredentials = await createStaffUsers(request, nextAccessToken, schoolCode, tenantValue, runId, TARGET_STAFF);

  return {
    runId,
    tenantValue,
    admin,
    teacher: teacherCredentials[0],
    student: studentCredentials[0],
    staff: staffCredentials[0],
    counts: {
      classes: classIds.length,
      sections: sectionIds.length,
      teachers: teacherCredentials.length,
      staff: staffCredentials.length,
      subjects: subjectIds.length,
      chapters: chapterIds.length,
      lessons: lessonIds.length,
      materials: materialCount,
      students: studentCredentials.length,
    },
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('Deployed LMS full-scale data and scenario checks', () => {
  test.setTimeout(30 * 60 * 1000);

  test('seed full dummy data set (100 students, 20 teachers, 3 staff) with classes and learning materials', async ({ request }) => {
    seededData = await seedLargeDataset(request);

    expect(seededData.counts.students).toBe(TARGET_STUDENTS);
    expect(seededData.counts.teachers).toBe(TARGET_TEACHERS);
    expect(seededData.counts.staff).toBe(TARGET_STAFF);
    expect(seededData.counts.classes).toBe(TARGET_CLASSES);
    expect(seededData.counts.sections).toBe(TARGET_CLASSES * 2);
    expect(seededData.counts.subjects).toBe(TARGET_CLASSES * SUBJECTS_PER_CLASS);
    expect(seededData.counts.chapters).toBe(seededData.counts.subjects * CHAPTERS_PER_SUBJECT);
    expect(seededData.counts.lessons).toBe(seededData.counts.chapters * LESSONS_PER_CHAPTER);
    expect(seededData.counts.materials).toBe(seededData.counts.lessons);

    test.info().annotations.push({ type: 'seed-run-id', description: seededData.runId });
  });

  test('admin scenario: verify seeded entities are visible via API', async ({ request }) => {
    test.skip(!seededData, 'Seed dataset was not created in previous step.');
    const seed = seededData as SeedResult;

    const loginPayload = await loginAs(request, seed.admin);
    const token = loginPayload.access;
    const headers = authHeaders(token, seed.admin.schoolCode);

    const [students, teachers, classes, subjects, lessons] = await Promise.all([
      fetchAllPages<Record<string, unknown>>(request, '/api/academic/students/', headers),
      fetchAllPages<Record<string, unknown>>(request, '/api/academic/teachers/', headers),
      fetchAllPages<Record<string, unknown>>(request, '/api/academic/classes/', headers),
      fetchAllPages<Record<string, unknown>>(request, '/api/academic/subjects/', headers),
      fetchAllPages<Record<string, unknown>>(request, '/api/academic/lessons/', headers),
    ]);

    const runMarker = seed.runId;
    const runStudents = students.filter((s) => String((s.email as string) || '').includes(runMarker));
    const runTeachers = teachers.filter((t) => String((t.email as string) || '').includes(runMarker));
    const runClasses = classes.filter((c) => String((c.name as string) || '').includes(runMarker));
    const runSubjects = subjects.filter((s) => String((s.name as string) || '').includes(runMarker));
    const runLessons = lessons.filter((l) => String((l.title as string) || '').includes(runMarker));

    expect(runStudents.length).toBe(TARGET_STUDENTS);
    expect(runTeachers.length).toBe(TARGET_TEACHERS);
    expect(runClasses.length).toBe(TARGET_CLASSES);
    expect(runSubjects.length).toBe(TARGET_CLASSES * SUBJECTS_PER_CLASS);
    expect(runLessons.length).toBe(TARGET_CLASSES * SUBJECTS_PER_CLASS * CHAPTERS_PER_SUBJECT * LESSONS_PER_CHAPTER);
  });

  test('role scenarios: admin + teacher + student + staff authentication checks', async ({ request }) => {
    test.skip(!seededData, 'Seed dataset was not created in previous step.');
    const seed = seededData as SeedResult;

    const adminLogin = await loginAs(request, seed.admin);
    const teacherLogin = await loginAs(request, seed.teacher);
    const studentLogin = await loginAs(request, seed.student);
    const staffLogin = await loginAs(request, seed.staff);

    expect(adminLogin.access).toBeTruthy();
    expect(teacherLogin.access).toBeTruthy();
    expect(studentLogin.access).toBeTruthy();
    expect(staffLogin.access).toBeTruthy();

    expect(adminLogin.user?.role).toBe('admin');
    expect(teacherLogin.user?.role).toBe('teacher');
    expect(studentLogin.user?.role).toBe('student');
    expect(staffLogin.user?.role).toBe('staff');
  });
});
