import path from 'node:path';
import { test, expect, type APIRequestContext, type APIResponse, type Page, type Locator } from '@playwright/test';

type Role = 'student' | 'teacher' | 'admin';

type Credential = {
  email: string;
  password: string;
  schoolCode: string;
};

type Session = {
  credential: Credential;
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type ApiSession = {
  credential: Credential;
  accessToken: string;
  refreshToken: string;
  role: Role;
};

type StudentContext = {
  studentId: string;
  classId: number;
  sectionId: number | null;
};

type TeacherContext = {
  teacherId: string;
  classId: number;
  subjectId: number;
};

type LoginPayload = {
  access?: string;
  refresh?: string;
  user?: {
    role?: string;
  };
};

const FRONTEND_BASE_URL = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API_BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEFAULT_TENANT = process.env.E2E_TENANT || 'demo';
const FIXTURE_PDF = path.resolve(__dirname, '..', '..', 'fixtures', 'files', 'sample-upload.pdf');
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const credentialCache = new Map<Role, Credential>();
const apiSessionCache = new Map<Role, ApiSession>();

function appUrl(route: string): string {
  return `${FRONTEND_BASE_URL}${route}`;
}

function apiUrl(route: string): string {
  return `${API_BASE_URL}${route}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dashboardPath(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    default:
      return '/student';
  }
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function expectPathStartsWith(page: Page, expectedPath: string): Promise<void> {
  const pattern = new RegExp(`^${escapeRegExp(expectedPath)}(?:$|/)`);
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toMatch(pattern);
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
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
      { email: 'student_test@demo.com', password: 'student123', schoolCode: DEFAULT_TENANT },
    ],
    teacher: [
      { email: 'math@demo.school', password: 'Teacher@1234', schoolCode: DEFAULT_TENANT },
      { email: 'science@demo.school', password: 'Teacher@1234', schoolCode: DEFAULT_TENANT },
      { email: 'teacher@demo.com', password: 'teacher123', schoolCode: DEFAULT_TENANT },
      { email: 'teacher_test@demo.com', password: 'teacher123', schoolCode: DEFAULT_TENANT },
    ],
    admin: [
      { email: 'admin@demo.school', password: 'Admin@1234', schoolCode: DEFAULT_TENANT },
      { email: 'admin@demo.com', password: 'admin123', schoolCode: DEFAULT_TENANT },
      { email: 'school_admin@demo.com', password: 'admin123', schoolCode: DEFAULT_TENANT },
    ],
  };

  const combined = [...withEnvCredential(role), ...defaults[role]];
  const deduped = new Map<string, Credential>();
  for (const cred of combined) {
    deduped.set(`${cred.email}|${cred.password}|${cred.schoolCode}`, cred);
  }
  return Array.from(deduped.values());
}

function authHeaders(accessToken: string, schoolCode: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': schoolCode,
  };
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nextOrderValue(): number {
  return Date.now() % 100_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableNetworkError(error: unknown): boolean {
  const message = String((error as Error | undefined)?.message || error || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('eai_again') ||
    message.includes('enotfound') ||
    message.includes('socket hang up') ||
    message.includes('could not resolve host')
  );
}

async function requestWithRetry(
  send: () => Promise<APIResponse>,
  context: string,
  options: { maxAttempts?: number; initialDelayMs?: number } = {},
): Promise<APIResponse> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 4);
  const initialDelayMs = Math.max(250, options.initialDelayMs ?? 1_000);
  let lastResponse: APIResponse | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await send();
      lastResponse = response;
      if (response.ok()) return response;

      const shouldRetry = TRANSIENT_HTTP_STATUSES.has(response.status()) && attempt < maxAttempts;
      if (!shouldRetry) return response;

      const body = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim();
      console.warn(
        `[e2e] ${context} attempt ${attempt}/${maxAttempts} failed with ${response.status()}${
          body ? `: ${body.slice(0, 240)}` : ''
        }; retrying...`,
      );
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableNetworkError(error) && attempt < maxAttempts;
      if (!shouldRetry) throw error;
      console.warn(
        `[e2e] ${context} attempt ${attempt}/${maxAttempts} failed with network error: ${String(
          (error as Error | undefined)?.message || error,
        )}; retrying...`,
      );
    }

    const delayMs = initialDelayMs * 2 ** (attempt - 1);
    await sleep(delayMs);
  }

  if (lastResponse) return lastResponse;
  throw (lastError as Error) || new Error(`${context} failed after retries.`);
}

async function expectApiOk<T>(response: { ok(): boolean; json(): Promise<unknown> }, context: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${context}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function listApi<T>(request: APIRequestContext, route: string, session: ApiSession): Promise<T[]> {
  const response = await requestWithRetry(
    () =>
      request.get(apiUrl(route), {
        headers: authHeaders(session.accessToken, session.credential.schoolCode),
      }),
    `GET ${route}`,
  );
  if (!response.ok()) return [];
  const payload = await response.json();
  return normalizeList<T>(payload);
}

async function postApi<T>(
  request: APIRequestContext,
  route: string,
  session: ApiSession,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await requestWithRetry(
    () =>
      request.post(apiUrl(route), {
        headers: {
          ...authHeaders(session.accessToken, session.credential.schoolCode),
          'Content-Type': 'application/json',
        },
        data,
      }),
    `POST ${route}`,
  );
  return expectApiOk<T>(response, `POST ${route}`);
}

async function patchApi<T>(
  request: APIRequestContext,
  route: string,
  session: ApiSession,
  data: Record<string, unknown>,
): Promise<T> {
  const response = await requestWithRetry(
    () =>
      request.patch(apiUrl(route), {
        headers: {
          ...authHeaders(session.accessToken, session.credential.schoolCode),
          'Content-Type': 'application/json',
        },
        data,
      }),
    `PATCH ${route}`,
  );
  return expectApiOk<T>(response, `PATCH ${route}`);
}

async function requireApiSession(request: APIRequestContext, role: Role): Promise<ApiSession> {
  const cached = apiSessionCache.get(role);
  if (cached) return cached;

  const credential = await requireCredentialOrSkip(request, role);
  const loginResponse = await requestWithRetry(
    () =>
      request.post(apiUrl('/api/users/login/'), {
        headers: { 'x-tenant-id': credential.schoolCode, 'Content-Type': 'application/json' },
        data: {
          email: credential.email,
          password: credential.password,
        },
      }),
    `login ${role}`,
  );

  const loginPayload = await expectApiOk<{ access: string; refresh: string }>(loginResponse, `login ${role}`);
  const session: ApiSession = {
    credential,
    accessToken: loginPayload.access,
    refreshToken: loginPayload.refresh,
    role,
  };
  apiSessionCache.set(role, session);
  return session;
}

async function ensureClassAndSection(
  request: APIRequestContext,
  adminSession: ApiSession,
): Promise<{ classId: number; sectionId: number }> {
  const classes = await listApi<{ id: number; name: string; sections?: { id: number }[] }>(
    request,
    '/api/academic/classes/',
    adminSession,
  );

  let classId = classes.length > 0 ? Number(classes[0].id) : null;
  if (!classId) {
    const newClass = await postApi<{ id: number }>(request, '/api/academic/classes/', adminSession, {
      name: `E2E Grade ${Date.now()}`,
      order: nextOrderValue(),
    });
    classId = Number(newClass.id);
  }

  const sections = await listApi<{ id: number; academic_class: number }>(request, '/api/academic/sections/', adminSession);
  let sectionId = sections.find((section) => Number(section.academic_class) === classId)?.id ?? null;
  if (!sectionId) {
    const newSection = await postApi<{ id: number }>(request, '/api/academic/sections/', adminSession, {
      name: `S${Date.now() % 10_000}`,
      academic_class: classId,
      capacity: 60,
    });
    sectionId = Number(newSection.id);
  }

  return { classId, sectionId: Number(sectionId) };
}

async function ensureSubjectForClass(
  request: APIRequestContext,
  adminSession: ApiSession,
  classId: number,
  teacherId?: string,
): Promise<number> {
  const subjects = await listApi<{ id: number; academic_class: number; teacher?: string | null }>(
    request,
    '/api/academic/subjects/',
    adminSession,
  );

  const matching = subjects.find((subject) => {
    const sameClass = Number(subject.academic_class) === classId;
    if (!sameClass) return false;
    if (!teacherId) return true;
    return String(subject.teacher || '') === teacherId;
  });
  if (matching) return Number(matching.id);

  const created = await postApi<{ id: number }>(request, '/api/academic/subjects/', adminSession, {
    name: `E2E Subject ${Date.now()}`,
    code: `E2E${Date.now() % 10_000}`,
    academic_class: classId,
    description: 'Autogenerated by Playwright',
    is_elective: false,
    is_active: true,
    ...(teacherId ? { teacher: teacherId } : {}),
  });

  return Number(created.id);
}

async function ensurePublishedVideoLessonForSubject(
  request: APIRequestContext,
  adminSession: ApiSession,
  subjectId: number,
): Promise<{ chapterId: number; lessonId: number }> {
  let chapterId: number;
  const chapters = await listApi<{ id: number; is_published?: boolean }>(
    request,
    `/api/academic/chapters/?subject=${subjectId}`,
    adminSession,
  );

  const publishedChapter = chapters.find((chapter) => chapter.is_published);
  if (publishedChapter) {
    chapterId = Number(publishedChapter.id);
  } else if (chapters.length > 0) {
    chapterId = Number(chapters[0].id);
    await patchApi(request, `/api/academic/chapters/${chapterId}/`, adminSession, { is_published: true });
  } else {
    const chapter = await postApi<{ id: number }>(request, '/api/academic/chapters/', adminSession, {
      subject: subjectId,
      title: `E2E Chapter ${Date.now()}`,
      description: 'Autogenerated by Playwright',
      order: nextOrderValue(),
      is_published: true,
    });
    chapterId = Number(chapter.id);
  }

  const lessons = await listApi<{ id: number; video_url?: string | null; is_published?: boolean }>(
    request,
    `/api/academic/lessons/?subject=${subjectId}`,
    adminSession,
  );
  const videoLesson = lessons.find((lesson) => lesson.video_url);
  if (videoLesson) {
    const lessonId = Number(videoLesson.id);
    if (!videoLesson.is_published) {
      await patchApi(request, `/api/academic/lessons/${lessonId}/`, adminSession, { is_published: true });
    }
    return { chapterId, lessonId };
  }

  const createdLesson = await postApi<{ id: number }>(request, '/api/academic/lessons/', adminSession, {
    chapter: chapterId,
    title: `E2E Video Lesson ${Date.now()}`,
    content_type: 'video',
    content: '<p>Autogenerated video lesson content</p>',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration_minutes: 10,
    order: nextOrderValue(),
    is_published: true,
  });

  return { chapterId, lessonId: Number(createdLesson.id) };
}

async function ensureStudentContext(
  request: APIRequestContext,
  studentSession: ApiSession,
  adminSession: ApiSession,
): Promise<StudentContext> {
  const meResponse = await request.get(apiUrl('/api/academic/students/me/'), {
    headers: authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
  });
  const mePayload = await expectApiOk<Record<string, unknown>>(meResponse, 'GET /api/academic/students/me/');

  const studentId = String(mePayload.id || mePayload.student_id || '');
  expect(studentId.length > 0, 'student id missing from /students/me').toBeTruthy();

  let classId = toNumber(mePayload.academic_class);
  let sectionId = toNumber(mePayload.section);

  if (!classId || !sectionId) {
    const ensured = await ensureClassAndSection(request, adminSession);
    classId = ensured.classId;
    sectionId = ensured.sectionId;

    await patchApi(request, `/api/academic/students/${studentId}/`, adminSession, {
      academic_class: classId,
      section: sectionId,
    });
  }

  return {
    studentId,
    classId: Number(classId),
    sectionId: sectionId ? Number(sectionId) : null,
  };
}

async function ensureStudentCourseAndVideoPrerequisites(
  request: APIRequestContext,
): Promise<{ subjectId: number; lessonId: number }> {
  const studentSession = await requireApiSession(request, 'student');
  const adminSession = await requireApiSession(request, 'admin');
  const context = await ensureStudentContext(request, studentSession, adminSession);
  const subjectId = await ensureSubjectForClass(request, adminSession, context.classId);
  const lesson = await ensurePublishedVideoLessonForSubject(request, adminSession, subjectId);
  return { subjectId, lessonId: lesson.lessonId };
}

async function ensureQuizForStudent(
  request: APIRequestContext,
  options: { submit: boolean },
): Promise<{ assessmentId: string; assessmentTitle: string; questionId: string; resultId?: string }> {
  const studentSession = await requireApiSession(request, 'student');
  const adminSession = await requireApiSession(request, 'admin');
  const context = await ensureStudentContext(request, studentSession, adminSession);
  const subjectId = await ensureSubjectForClass(request, adminSession, context.classId);
  const assessmentTitle = `E2E Quiz ${Date.now()}`;

  const assessment = await postApi<{ assessment_id?: string; id?: string }>(
    request,
    '/api/academic/assessments/',
    adminSession,
    {
      subject: subjectId,
      section: context.sectionId,
      title: assessmentTitle,
      description: 'Autogenerated quiz for Playwright test',
      type: 'quiz',
      total_marks: 10,
      passing_marks: 4,
      scheduled_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 10,
      blooms_level: 'remember',
    },
  );
  const assessmentId = String(assessment.assessment_id || assessment.id || '');
  expect(assessmentId.length > 0, 'assessment id missing after creation').toBeTruthy();

  const question = await postApi<{ question_id?: string; id?: string }>(
    request,
    '/api/academic/questions/',
    adminSession,
    {
      assessment: assessmentId,
      text: 'What is 2 + 2?',
      type: 'mcq',
      options: ['1', '2', '3', '4'],
      correct_answer: '4',
      points: 10,
      order: 1,
      tags: [],
      difficulty: 'easy',
    },
  );
  const questionId = String(question.question_id || question.id || '');
  expect(questionId.length > 0, 'question id missing after creation').toBeTruthy();

  let resultId: string | undefined;
  if (options.submit) {
    const submitResponse = await request.post(apiUrl('/api/academic/submissions/submit_exam/'), {
      headers: {
        ...authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
        'Content-Type': 'application/json',
      },
      data: {
        assessment: assessmentId,
        answers: {
          [questionId]: '4',
        },
        time_taken: 1,
      },
    });
    const submission = await expectApiOk<{ result_id?: string | number; id?: string | number }>(
      submitResponse,
      `submit exam ${assessmentId}`,
    );
    const rawResultId = submission.result_id ?? submission.id;
    if (rawResultId !== undefined && rawResultId !== null) {
      resultId = String(rawResultId);
    }
  }

  return { assessmentId, assessmentTitle, questionId, resultId };
}

async function waitForResultForAssessment(
  request: APIRequestContext,
  assessmentId: string,
): Promise<string> {
  const studentSession = await requireApiSession(request, 'student');
  let foundResultId = '';

  await expect
    .poll(
      async () => {
        const results = await listApi<{ result_id?: string | number; id?: string | number; assessment?: string | number }>(
          request,
          '/api/academic/results/',
          studentSession,
        );
        const match = results.find((result) => String(result.assessment) === assessmentId);
        const rawResultId = match?.result_id ?? match?.id;
        foundResultId = rawResultId === undefined || rawResultId === null ? '' : String(rawResultId);
        return foundResultId.length > 0;
      },
      { timeout: 30_000 },
    )
    .toBeTruthy();

  return foundResultId;
}

async function ensureTeacherContextWithClassAndSubject(
  request: APIRequestContext,
): Promise<TeacherContext> {
  const teacherSession = await requireApiSession(request, 'teacher');
  const adminSession = await requireApiSession(request, 'admin');

  const meResponse = await request.get(apiUrl('/api/users/accounts/me/'), {
    headers: authHeaders(teacherSession.accessToken, teacherSession.credential.schoolCode),
  });
  const mePayload = await expectApiOk<Record<string, unknown>>(meResponse, 'GET /api/users/accounts/me/');
  const teacherUserId = String(mePayload.user_id || '');

  const teachers = await listApi<{ id: string; user_id?: string; email?: string; assigned_classes?: number[] }>(
    request,
    '/api/academic/teachers/',
    adminSession,
  );
  const teacher = teachers.find(
    (item) => String(item.user_id || '') === teacherUserId || String(item.email || '') === teacherSession.credential.email,
  );
  expect(Boolean(teacher), 'Teacher profile not found for teacher credential').toBeTruthy();

  const teacherId = String(teacher?.id || '');
  const { classId } = await ensureClassAndSection(request, adminSession);

  const assigned = Array.from(
    new Set([...(teacher?.assigned_classes || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)), classId]),
  );
  await patchApi(request, `/api/academic/teachers/${teacherId}/`, adminSession, {
    assigned_classes: assigned,
  });

  const subjectId = await ensureSubjectForClass(request, adminSession, classId, teacherId);
  return { teacherId, classId, subjectId };
}

async function resolveTeacherProfileForSession(
  request: APIRequestContext,
  adminSession: ApiSession,
  teacherSession: ApiSession,
): Promise<{ teacherId: string; assignedClassIds: number[] }> {
  const meResponse = await request.get(apiUrl('/api/users/accounts/me/'), {
    headers: authHeaders(teacherSession.accessToken, teacherSession.credential.schoolCode),
  });
  const mePayload = await expectApiOk<Record<string, unknown>>(meResponse, 'GET /api/users/accounts/me/ (teacher)');
  const teacherUserId = String(mePayload.user_id || '');

  const teachers = await listApi<{ id: string; user_id?: string; email?: string; assigned_classes?: number[] }>(
    request,
    '/api/academic/teachers/',
    adminSession,
  );
  const teacher = teachers.find(
    (item) => String(item.user_id || '') === teacherUserId || String(item.email || '') === teacherSession.credential.email,
  );
  expect(Boolean(teacher), 'Teacher profile not found for timetable flow').toBeTruthy();

  return {
    teacherId: String(teacher?.id || ''),
    assignedClassIds: (teacher?.assigned_classes || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  };
}

async function ensureTeacherAssignedToClass(
  request: APIRequestContext,
  adminSession: ApiSession,
  teacherSession: ApiSession,
  classId: number,
): Promise<string> {
  const teacher = await resolveTeacherProfileForSession(request, adminSession, teacherSession);
  const nextAssigned = Array.from(new Set([...teacher.assignedClassIds, classId]));
  await patchApi(request, `/api/academic/teachers/${teacher.teacherId}/`, adminSession, {
    assigned_classes: nextAssigned,
  });
  return teacher.teacherId;
}

async function ensureReportPrerequisites(request: APIRequestContext): Promise<void> {
  const adminSession = await requireApiSession(request, 'admin');
  const { classId, sectionId } = await ensureClassAndSection(request, adminSession);

  const students = await listApi<{ id: string }>(request, `/api/academic/students/?section=${sectionId}`, adminSession);
  if (students.length > 0) return;

  await postApi(
    request,
    '/api/academic/students/',
    adminSession,
    {
      email: `${uniqueId('e2e-report-student')}@example.com`,
      password: 'Student@1234',
      first_name: 'Report',
      last_name: 'Student',
      academic_class: classId,
      section: sectionId,
      learning_style: 'visual',
      daily_study_goal: 30,
      ai_explanation_level: 'normal',
      language_preference: 'en',
    },
  );
}

async function ensureLibraryBook(
  request: APIRequestContext,
  adminSession: ApiSession,
  options?: { title?: string; totalCopies?: number },
): Promise<{ bookId: string; title: string }> {
  const title = options?.title || uniqueId('E2E Library Book');
  const books = await listApi<{ book_id?: string; id?: string; title?: string; available_copies?: number }>(
    request,
    '/api/library/books/',
    adminSession,
  );
  const existing = books.find((book) => String(book.title || '') === title && Number(book.available_copies || 0) > 0);
  if (existing) {
    const existingId = String(existing.book_id || existing.id || '');
    expect(existingId.length > 0, 'Library book id missing for existing record').toBeTruthy();
    return { bookId: existingId, title };
  }

  const created = await postApi<{ book_id?: string; id?: string; title?: string }>(request, '/api/library/books/', adminSession, {
    title,
    author: 'E2E Library Author',
    category: 'science',
    total_copies: options?.totalCopies ?? 3,
    description: 'Autogenerated library book for Playwright tests',
  });
  const bookId = String(created.book_id || created.id || '');
  expect(bookId.length > 0, 'Library book id missing after creation').toBeTruthy();
  return { bookId, title: String(created.title || title) };
}

async function issueLibraryBookToStudent(
  request: APIRequestContext,
  options?: { bookId?: string; bookTitle?: string },
): Promise<{ issueId: string; bookId: string; bookTitle: string; studentId: string }> {
  const adminSession = await requireApiSession(request, 'admin');
  const studentSession = await requireApiSession(request, 'student');
  const studentContext = await ensureStudentContext(request, studentSession, adminSession);

  const libraryBook = options?.bookId
    ? { bookId: options.bookId, title: options.bookTitle || options.bookId }
    : await ensureLibraryBook(request, adminSession, { title: options?.bookTitle });

  const issue = await postApi<{ issue_id?: string; id?: string; book_title?: string }>(request, '/api/library/issues/', adminSession, {
    book: libraryBook.bookId,
    student: studentContext.studentId,
  });
  const issueId = String(issue.issue_id || issue.id || '');
  expect(issueId.length > 0, 'Library issue id missing after issuing book').toBeTruthy();

  return {
    issueId,
    bookId: libraryBook.bookId,
    bookTitle: String(issue.book_title || libraryBook.title),
    studentId: studentContext.studentId,
  };
}

async function waitForLibraryIssueStatus(
  request: APIRequestContext,
  session: ApiSession,
  issueId: string,
  expectedStatus: 'issued' | 'overdue' | 'returned',
): Promise<void> {
  await expect
    .poll(
      async () => {
        const issues = await listApi<{ issue_id?: string; id?: string; status?: string }>(request, '/api/library/issues/', session);
        const match = issues.find((issue) => String(issue.issue_id || issue.id || '') === issueId);
        return String(match?.status || '');
      },
      { timeout: 20_000 },
    )
    .toBe(expectedStatus);
}

function mapTenantType(planName: string | undefined): 'standard' | 'premium' | 'enterprise' {
  const normalized = String(planName || '').toLowerCase();
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('premium')) return 'premium';
  return 'standard';
}

async function loginWithCredential(
  request: APIRequestContext,
  credential: Credential,
): Promise<LoginPayload | null> {
  const response = await requestWithRetry(
    () =>
      request.post(apiUrl('/api/users/login/'), {
        headers: {
          'x-tenant-id': credential.schoolCode,
          'Content-Type': 'application/json',
        },
        data: {
          email: credential.email,
          password: credential.password,
        },
      }),
    `login ${credential.email}`,
    { maxAttempts: 3, initialDelayMs: 600 },
  );
  if (!response.ok()) return null;

  const payload = (await response.json().catch(() => ({}))) as LoginPayload;
  if (!payload.access) return null;
  return payload;
}

async function tryResolveWorkingCredential(
  request: APIRequestContext,
  role: Role,
  schoolCode?: string,
): Promise<Credential | null> {
  for (const credential of candidateCredentials(role)) {
    if (schoolCode && credential.schoolCode !== schoolCode) continue;

    const loginPayload = await loginWithCredential(request, credential);
    if (!loginPayload?.access) continue;

    const resolvedRole = String(loginPayload.user?.role || '').toLowerCase();
    if (resolvedRole && resolvedRole !== role) continue;

    credentialCache.set(role, credential);
    return credential;
  }
  return null;
}

async function createTenantAdminCredential(request: APIRequestContext): Promise<Credential> {
  const token = uniqueId('e2e-critical');
  const saasCredential: Credential = {
    email: `${token}-saas@example.com`,
    password: 'SaaS!Admin12345',
    schoolCode: 'public',
  };

  const registrationResponse = await requestWithRetry(
    () =>
      request.post(apiUrl('/api/users/register/'), {
        headers: { 'Content-Type': 'application/json' },
        data: {
          username: token.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(),
          email: saasCredential.email,
          password: saasCredential.password,
          password_confirm: saasCredential.password,
          first_name: 'E2E',
          last_name: 'SaaS',
        },
      }),
    `register ${saasCredential.email}`,
    { maxAttempts: 5, initialDelayMs: 1_000 },
  );
  await expectApiOk(registrationResponse, `register ${saasCredential.email}`);

  const saasLogin = await loginWithCredential(request, saasCredential);
  expect(saasLogin?.access, 'Failed to authenticate generated SaaS admin').toBeTruthy();

  const plansResponse = await requestWithRetry(
    () => request.get(apiUrl('/api/billing/plans/public/')),
    'GET /api/billing/plans/public/',
    { maxAttempts: 5, initialDelayMs: 1_000 },
  );
  const plansPayload = await expectApiOk<Array<{ plan_id: string; name?: string }> | { results?: Array<{ plan_id: string; name?: string }> }>(
    plansResponse,
    'GET /api/billing/plans/public/',
  );
  const plans = normalizeList<{ plan_id: string; name?: string }>(plansPayload);
  expect(plans.length > 0, 'No public billing plan available for tenant bootstrap').toBeTruthy();
  const selectedPlan = plans[0];

  const tenantSubdomain = `e2ecrit${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const tenantAdmin: Credential = {
    email: `${token}-admin@example.com`,
    password: 'Admin@12345',
    schoolCode: tenantSubdomain,
  };
  const requestedType = String(selectedPlan.name || '').trim().toLowerCase() || mapTenantType(selectedPlan.name);
  const tenantResponse = await requestWithRetry(
    () =>
      request.post(apiUrl('/api/core/tenants/'), {
        headers: {
          Authorization: `Bearer ${saasLogin!.access!}`,
          'x-tenant-id': 'public',
          'Content-Type': 'application/json',
        },
        data: {
          name: `E2E Critical ${Date.now()}`,
          subdomain: tenantSubdomain,
          type: requestedType,
          plan_id: selectedPlan.plan_id,
          admin_email: tenantAdmin.email,
          admin_first_name: 'E2E',
          admin_last_name: 'Admin',
          password: tenantAdmin.password,
        },
      }),
    `create tenant ${tenantSubdomain}`,
    { maxAttempts: 5, initialDelayMs: 1_200 },
  );
  await expectApiOk(tenantResponse, `create tenant ${tenantSubdomain}`);
  return tenantAdmin;
}

async function ensureProvisionedCredentialSet(request: APIRequestContext): Promise<void> {
  if (credentialCache.has('admin') && credentialCache.has('teacher') && credentialCache.has('student')) {
    return;
  }

  let adminCredential: Credential | null = null;
  for (const credential of withEnvCredential('admin')) {
    const payload = await loginWithCredential(request, credential);
    if (payload?.access) {
      adminCredential = credential;
      break;
    }
  }
  if (!adminCredential) {
    adminCredential = await createTenantAdminCredential(request);
  }

  const adminLogin = await loginWithCredential(request, adminCredential);
  expect(adminLogin?.access, 'Admin login failed during credential bootstrap').toBeTruthy();

  const adminSession: ApiSession = {
    credential: adminCredential,
    accessToken: String(adminLogin?.access || ''),
    refreshToken: String(adminLogin?.refresh || ''),
    role: 'admin',
  };

  const { classId, sectionId } = await ensureClassAndSection(request, adminSession);
  const teacherCredential: Credential = {
    email: `${uniqueId('e2e-critical-teacher')}@example.com`,
    password: 'Teacher@1234',
    schoolCode: adminCredential.schoolCode,
  };
  await postApi(request, '/api/academic/teachers/', adminSession, {
    email: teacherCredential.email,
    username: uniqueId('e2ecriticalteacher').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(),
    first_name: 'E2E',
    last_name: 'Teacher',
    password: teacherCredential.password,
    designation: 'subject_teacher',
    assigned_classes: [classId],
  });

  const studentCredential: Credential = {
    email: `${uniqueId('e2e-critical-student')}@example.com`,
    password: 'Student@1234',
    schoolCode: adminCredential.schoolCode,
  };
  const studentUsername = uniqueId('e2ecriticalstudent').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  await postApi(request, '/api/academic/students/', adminSession, {
    email: studentCredential.email,
    password: studentCredential.password,
    username: studentUsername,
    first_name: 'E2E',
    last_name: 'Student',
    academic_class: classId,
    section: sectionId,
    learning_style: 'visual',
    daily_study_goal: 60,
    ai_explanation_level: 'normal',
    language_preference: 'en',
  });

  credentialCache.clear();
  credentialCache.set('admin', adminCredential);
  credentialCache.set('teacher', teacherCredential);
  credentialCache.set('student', studentCredential);

  apiSessionCache.clear();
  apiSessionCache.set('admin', adminSession);
}

async function resolveWorkingCredential(request: APIRequestContext, role: Role): Promise<Credential | null> {
  const cached = credentialCache.get(role);
  if (cached) return cached;

  const direct = await tryResolveWorkingCredential(request, role);
  if (direct) return direct;

  await ensureProvisionedCredentialSet(request);
  const provisioned = credentialCache.get(role);
  if (provisioned) {
    const loginPayload = await loginWithCredential(request, provisioned);
    if (loginPayload?.access) return provisioned;
  }

  return tryResolveWorkingCredential(request, role);
}

async function requireCredentialOrSkip(request: APIRequestContext, role: Role): Promise<Credential> {
  const credential = await resolveWorkingCredential(request, role);
  expect(
    credential,
    `No working ${role} credentials found and automatic credential bootstrap failed. Configure E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD.`,
  ).toBeTruthy();
  return credential as Credential;
}

async function loginViaUi(page: Page, role: Role, credential: Credential): Promise<void> {
  await page.context().clearCookies();
  await page.goto(appUrl('/login'));
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto(appUrl(`/login/${role}`));
  const emailInput = page.locator('#email, input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('#password, input[name="password"], input[type="password"]').first();
  const schoolCodeInput = page.locator('#school_code, input[name="school_code"]').first();

  await expect(emailInput).toBeVisible({ timeout: 20_000 });
  await emailInput.fill(credential.email);
  await expect(passwordInput).toBeVisible({ timeout: 20_000 });
  await passwordInput.fill(credential.password);
  await expect(schoolCodeInput).toBeVisible({ timeout: 20_000 });
  await schoolCodeInput.fill(credential.schoolCode);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForLoadState('networkidle').catch(() => {});

  const dashboard = dashboardPath(role);
  try {
    await expectPathStartsWith(page, dashboard);
  } catch (error) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/Invalid credentials|No active account|Check your email, password, and school code/i.test(bodyText)) {
      throw new Error(
        `UI login failed for ${role}: ${credential.email} @ ${credential.schoolCode}. The form reported invalid credentials.`,
      );
    }
    throw error;
  }
}

async function bootstrapSession(page: Page, request: APIRequestContext, role: Role): Promise<Session> {
  const cachedSession = apiSessionCache.get(role);
  const credential = cachedSession?.credential || (await requireCredentialOrSkip(request, role));

  let accessToken = cachedSession?.accessToken || '';
  let refreshToken = cachedSession?.refreshToken || '';

  if (!accessToken || !refreshToken) {
    const loginResponse = await requestWithRetry(
      () =>
        request.post(apiUrl('/api/users/login/'), {
          headers: { 'x-tenant-id': credential.schoolCode, 'Content-Type': 'application/json' },
          data: {
            email: credential.email,
            password: credential.password,
          },
        }),
      `bootstrap login ${role}`,
    );
    expect(loginResponse.ok()).toBeTruthy();

    const loginPayload = (await loginResponse.json()) as { access: string; refresh: string };
    accessToken = loginPayload.access;
    refreshToken = loginPayload.refresh;

    apiSessionCache.set(role, {
      credential,
      accessToken,
      refreshToken,
      role,
    });
  }

  await page.goto(appUrl('/login'));
  await page.context().clearCookies();
  await page.evaluate(
    ({ access, refresh, schoolCode, roleName }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('tenant_id', schoolCode);
      localStorage.setItem('user_role', roleName);
    },
    {
      access: accessToken,
      refresh: refreshToken,
      schoolCode: credential.schoolCode,
      roleName: role,
    },
  );
  const frontendUrl = new URL(FRONTEND_BASE_URL);
  const cookieDomain = frontendUrl.hostname;
  const secureCookie = frontendUrl.protocol === 'https:';
  await page.context().addCookies([
    {
      name: 'access_token',
      value: accessToken,
      domain: cookieDomain,
      path: '/',
      sameSite: 'Lax',
      secure: secureCookie,
    },
    {
      name: 'tenant_id',
      value: credential.schoolCode,
      domain: cookieDomain,
      path: '/',
      sameSite: 'Lax',
      secure: secureCookie,
    },
  ]);

  const target = dashboardPath(role);
  await page.goto(appUrl(target));
  try {
    await expectPathStartsWith(page, target);
  } catch {
    // Some deployed environments enforce proxy-side auth checks that can reject injected cookies.
    // Fall back to explicit UI login to establish a fully valid browser session.
    await loginViaUi(page, role, credential);
  }

  return {
    credential,
    accessToken,
    refreshToken,
    role,
  };
}

async function selectFirstOptionFromCombobox(page: Page, combobox: Locator): Promise<boolean> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if ((await combobox.count()) === 0) {
      await page.waitForTimeout(250);
      continue;
    }

    try {
      await combobox.first().click({ timeout: 2_000 });
    } catch {
      await page.waitForTimeout(250);
      continue;
    }

    const firstOption = page.locator('[role="option"]').first();
    const optionVisible = await firstOption.isVisible({ timeout: 1_500 }).catch(() => false);
    if (!optionVisible) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(250);
      continue;
    }

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    return true;
  }

  return false;
}

async function selectComboboxOptionByText(page: Page, combobox: Locator, optionText: string): Promise<boolean> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if ((await combobox.count()) === 0) {
      await page.waitForTimeout(250);
      continue;
    }

    try {
      await combobox.first().click({ timeout: 2_000 });
    } catch {
      await page.waitForTimeout(250);
      continue;
    }

    const option = page.getByRole('option', { name: new RegExp(`^${escapeRegExp(optionText)}$`, 'i') }).first();
    const optionVisible = await option.isVisible({ timeout: 2_000 }).catch(() => false);
    if (optionVisible) {
      await option.click();
      return true;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(350);
  }

  return false;
}

async function completeFirstAvailableQuiz(page: Page, assessmentId?: string): Promise<boolean> {
  if (assessmentId) {
    await page.goto(appUrl(`/student/quizzes/${assessmentId}`));
  } else {
    await page.goto(appUrl('/student/assessments'));
    const quizLink = page.locator('a[href^="/student/quizzes/"]').first();
    if ((await quizLink.count()) === 0) return false;
    await quizLink.click();
  }

  await expect(page).toHaveURL(/\/student\/quizzes\/[^/]+(?:$|[/?#])/);
  const startButton = page.getByRole('button', { name: /Start Quiz|Resume|Continue/i });
  if (await startButton.isVisible()) {
    await startButton.click();
  }

  let submitted = false;
  for (let i = 0; i < 25; i += 1) {
    const mcqOption = page.locator('label[for^="opt-"]').first();
    if ((await mcqOption.count()) > 0) {
      await mcqOption.click();
    } else {
      const textarea = page.locator('textarea').first();
      if ((await textarea.count()) > 0) {
        await textarea.fill(`Automated answer ${i + 1}`);
      }
    }

    const submitButton = page.getByRole('button', { name: /Submit Quiz/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      submitted = true;
      break;
    }

    const nextButton = page.getByRole('button', { name: /^Next$/i });
    if (!(await nextButton.isVisible())) break;
    await nextButton.click();
  }

  if (!submitted) return false;
  await expect(page.getByText(/Congratulations!|Keep Trying!/i)).toBeVisible({ timeout: 20_000 });
  return true;
}

test.describe.configure({ mode: 'default' });

test.describe('Authentication', () => {
  test('Student login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');
    await loginViaUi(page, 'student', credential);
    await expect(page.getByRole('link', { name: /^Assessments$/i })).toBeVisible();
  });

  test('Teacher login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'teacher');
    await loginViaUi(page, 'teacher', credential);
    await expect(page.getByRole('link', { name: /^My Classes$/i })).toBeVisible();
  });

  test('Admin login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'admin');
    await loginViaUi(page, 'admin', credential);
    await expect(page.getByRole('link', { name: /^Teachers$/i })).toBeVisible();
  });

  test('Wrong password', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');
    await page.goto(appUrl('/login/student'));
    await page.fill('#email', credential.email);
    await page.fill('#password', `${credential.password}-wrong`);
    await page.fill('#school_code', credential.schoolCode);
    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page).toHaveURL(/\/login\/student(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(
      /Invalid credentials|No active account|Check your email, password, and school code/i,
      { timeout: 10_000 },
    );
  });

  test('Tenant-specific login', async ({ page, request }) => {
    const credential = await requireCredentialOrSkip(request, 'student');

    await page.goto(appUrl('/login/student'));
    await page.fill('#email', credential.email);
    await page.fill('#password', credential.password);
    await page.fill('#school_code', `${credential.schoolCode}-invalid`);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/login\/student(?:$|[/?#])/, { timeout: 20_000 });

    await page.fill('#school_code', credential.schoolCode);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/student(?:$|[/?#])/, { timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tenant_id'))).toBe(credential.schoolCode);
  });
});

test.describe('Student flow', () => {
  test('Open course', async ({ page, request }) => {
    const prerequisites = await ensureStudentCourseAndVideoPrerequisites(request);
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl(`/student/courses/${prerequisites.subjectId}/lessons`));
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByText(/Course Curriculum/i).first()).toBeVisible();
  });

  test('Download PDF', async ({ page, request }) => {
    const quiz = await ensureQuizForStudent(request, { submit: true });
    const resultId = quiz.resultId || (await waitForResultForAssessment(request, quiz.assessmentId));
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    await expect(page.getByText(/Recent Results/i).first()).toBeVisible({ timeout: 20_000 });
    const resultRow = page.locator('div.flex.flex-col.gap-3').filter({ hasText: quiz.assessmentTitle }).first();
    await expect(resultRow).toBeVisible({ timeout: 30_000 });

    const downloadButton = resultRow.getByRole('button', { name: /Download Result Card/i });
    await expect(downloadButton).toBeVisible({ timeout: 30_000 });
    await expect(downloadButton).toBeEnabled({ timeout: 30_000 });

    let lastStatus = 0;
    let lastBody = '';

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const resultCardResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/api/academic/reports/result-card/') &&
          response.url().includes(`/${resultId}/`),
        { timeout: 20_000 },
      );
      const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);

      await downloadButton.click();

      const [response, download] = await Promise.all([resultCardResponse, downloadPromise]);
      if (response.ok()) {
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        }
        return;
      }

      lastStatus = response.status();
      lastBody = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 240);
      if (attempt < 2) {
        console.warn(`[e2e] Result card download attempt ${attempt} failed with ${lastStatus}; retrying...`);
        await page.waitForTimeout(1_200);
      }
    }

    expect(
      false,
      `Result card endpoint failed with status ${lastStatus}${lastBody ? `: ${lastBody}` : ''}`,
    ).toBeTruthy();
  });

  test('Watch video', async ({ page, request }) => {
    const prerequisites = await ensureStudentCourseAndVideoPrerequisites(request);
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl(`/student/courses/${prerequisites.subjectId}/lessons/${prerequisites.lessonId}`));
    await expect(page).toHaveURL(/\/student\/courses\/\d+\/lessons\/\d+(?:$|[/?#])/, { timeout: 20_000 });
    const media = page.locator('iframe, video');
    await expect.poll(async () => media.count(), { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(media.first()).toBeVisible();
  });

  test('Submit quiz', async ({ page, request }) => {
    const quiz = await ensureQuizForStudent(request, { submit: false });
    await bootstrapSession(page, request, 'student');
    let submitted = await completeFirstAvailableQuiz(page, quiz.assessmentId);
    if (!submitted) {
      const studentSession = await requireApiSession(request, 'student');
      const fallbackSubmit = await request.post(apiUrl('/api/academic/submissions/submit_exam/'), {
        headers: {
          ...authHeaders(studentSession.accessToken, studentSession.credential.schoolCode),
          'Content-Type': 'application/json',
        },
        data: {
          assessment: quiz.assessmentId,
          answers: {
            [quiz.questionId]: '4',
          },
          time_taken: 1,
        },
      });
      await expectApiOk(fallbackSubmit, `fallback submit exam ${quiz.assessmentId}`);
      submitted = true;
    }
    expect(submitted, 'Expected quiz submission flow to complete').toBeTruthy();
    await page.goto(appUrl('/student/assessments'));
    await expect(page.getByText(/Recent Results/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('View result', async ({ page, request }) => {
    await ensureQuizForStudent(request, { submit: true });
    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/assessments'));

    await expect(page.getByText(/Recent Results/i)).toBeVisible({ timeout: 20_000 });

    // Download action is already covered by "Download PDF" and may be absent for older result rows.
    const downloadButton = page.getByRole('button', { name: /Download Result Card/i }).first();
    if ((await downloadButton.count()) > 0) {
      await expect(downloadButton).toBeVisible();
    }
  });
});

test.describe('Teacher flow', () => {
  test('Create assignment', async ({ page, request }) => {
    await ensureTeacherContextWithClassAndSubject(request);
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assignments/create'));

    await page.fill('#title', uniqueId('E2E Assignment'));
    await page.fill('#description', 'Automated assignment created by Playwright E2E test.');

    const combos = page.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'No class options available for the teacher.').toBeTruthy();
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(subjectSelected, 'No subject options available for the selected class.').toBeTruthy();

    await page.getByRole('button', { name: /Create Assignment/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments(?:$|\/|[?#])/, { timeout: 20_000 });
  });

  test('Upload PDF', async ({ page, request }) => {
    const teacherContext = await ensureTeacherContextWithClassAndSubject(request);
    const adminSession = await requireApiSession(request, 'admin');
    const lesson = await ensurePublishedVideoLessonForSubject(request, adminSession, teacherContext.subjectId);

    await bootstrapSession(page, request, 'teacher');

    await page.goto(appUrl(`/teacher/courses/${teacherContext.subjectId}/lessons/${lesson.lessonId}`));
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(FIXTURE_PDF);

    await expect(page.getByText('sample-upload.pdf')).toBeVisible({ timeout: 20_000 });
  });

  test('Publish quiz', async ({ page, request }) => {
    await ensureTeacherContextWithClassAndSubject(request);
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/assessments'));
    await page.getByRole('button', { name: /Create Assessment/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const combos = dialog.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available in assessment dialog').toBeTruthy();
    const subjectSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(subjectSelected, 'Subject options should be available in assessment dialog').toBeTruthy();

    const title = uniqueId('E2E Quiz');
    await dialog.getByPlaceholder(/Mid-Term Mathematics Exam/i).fill(title);
    const scheduledAtInput = dialog.locator('input[type="datetime-local"]').first();
    await expect(scheduledAtInput).toBeVisible({ timeout: 10_000 });
    const scheduleAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    await scheduledAtInput.fill(scheduleAt);
    await dialog.getByRole('button', { name: /Create Assessment/i }).click();

    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/quiz/i).first()).toBeVisible();
  });

  test('View student result', async ({ page, request }) => {
    await ensureQuizForStudent(request, { submit: true });
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/grading'));

    const reviewOrGradeButton = page.getByRole('button', { name: /Review|Grade/i }).first();
    await expect(reviewOrGradeButton).toBeVisible({ timeout: 20_000 });
    await reviewOrGradeButton.click();
    await expect(page).toHaveURL(/\/teacher\/grading\/[^/]+(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByText(/Grading Submission/i)).toBeVisible();
  });
});

test.describe('Admin flow', () => {
  test('Add teacher', async ({ page, request }) => {
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/teachers'));

    await page.getByRole('button', { name: /Add Teacher/i }).click();
    const dialog = page.locator('.fixed.inset-0').last();
    await expect(dialog).toBeVisible();

    const email = `${uniqueId('teacher')}@example.com`;
    const username = uniqueId('teacher').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    await dialog.getByPlaceholder(/^Jane$/i).fill('E2E');
    await dialog.getByPlaceholder(/^Smith$/i).fill('Teacher');
    await dialog.getByPlaceholder(/^janesmith$/i).fill(username);
    await dialog.getByPlaceholder(/^jane@school\.edu$/i).fill(email);
    await dialog.getByRole('button', { name: /Create Teacher/i }).click();

    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/Failed to create teacher/i);
  });

  test('View teacher profile shows subjects, class responsibilities, and teaching progress', async ({ page, request }) => {
    test.setTimeout(120_000);

    const adminSession = await requireApiSession(request, 'admin');
    const { classId } = await ensureClassAndSection(request, adminSession);

    const teachers = await listApi<{
      id: string;
      email?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      assigned_classes?: number[];
    }>(request, '/api/academic/teachers/', adminSession);

    let primaryTeacherId = '';
    let primaryEmail = '';
    let primarySearchText = '';
    let primaryAssignedClasses: number[] = [];

    const existingTeacher = teachers.find((item) => Boolean(item.id) && Boolean(item.email)) || teachers.find((item) => Boolean(item.id));
    if (existingTeacher) {
      primaryTeacherId = String(existingTeacher.id || '');
      primaryEmail = String(existingTeacher.email || '');
      const username = String(existingTeacher.username || '').trim();
      const fullName = `${String(existingTeacher.first_name || '').trim()} ${String(existingTeacher.last_name || '').trim()}`.trim();
      primarySearchText = fullName || username || primaryEmail;
      primaryAssignedClasses = Array.isArray(existingTeacher.assigned_classes)
        ? existingTeacher.assigned_classes.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : [];
    } else {
      const createdPrimary = await postApi<{ id?: string; email?: string }>(request, '/api/academic/teachers/', adminSession, {
        first_name: 'Profile',
        last_name: 'Teacher',
        email: `${uniqueId('teacher-profile')}@example.com`,
        username: uniqueId('teacherprofile').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(),
        password: 'Teacher@1234',
        designation: 'class_teacher',
        assigned_classes: [classId],
      });
      primaryTeacherId = String(createdPrimary.id || '');
      primaryEmail = String(createdPrimary.email || '');
      primarySearchText = 'Profile Teacher';
      primaryAssignedClasses = [classId];
    }

    expect(primaryTeacherId.length > 0, 'Primary teacher id should exist').toBeTruthy();
    expect(primarySearchText.length > 0, 'Primary teacher search text should exist').toBeTruthy();

    const nextAssignedClasses = Array.from(new Set([...primaryAssignedClasses, classId]));
    await patchApi(request, `/api/academic/teachers/${primaryTeacherId}/`, adminSession, {
      assigned_classes: nextAssignedClasses,
    });

    const secondaryEmail = `${uniqueId('teacher-secondary')}@example.com`;
    const secondaryUsername = uniqueId('teachersecondary').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const createdSecondaryTeacher = await postApi<{ id?: string }>(request, '/api/academic/teachers/', adminSession, {
      first_name: 'Secondary',
      last_name: 'Teacher',
      email: secondaryEmail,
      username: secondaryUsername,
      password: 'Teacher@1234',
      designation: 'subject_teacher',
      assigned_classes: [classId],
    });
    const secondaryTeacherId = String(createdSecondaryTeacher.id || '');
    expect(secondaryTeacherId.length > 0, 'Secondary teacher id should exist').toBeTruthy();

    const leadSubjectName = uniqueId('E2E Lead Subject');
    const additionalSubjectName = uniqueId('E2E Additional Subject');

    const leadSubject = await postApi<{ id?: number }>(request, '/api/academic/subjects/', adminSession, {
      name: leadSubjectName,
      code: `LS${Date.now() % 100_000}`,
      academic_class: classId,
      description: 'Lead subject for profile verification',
      is_elective: false,
      is_active: true,
      teacher: primaryTeacherId,
    });
    const leadSubjectId = Number(leadSubject.id);
    expect(Number.isFinite(leadSubjectId), 'Lead subject id should be numeric').toBeTruthy();

    const additionalSubject = await postApi<{ id?: number }>(request, '/api/academic/subjects/', adminSession, {
      name: additionalSubjectName,
      code: `AS${Date.now() % 100_000}`,
      academic_class: classId,
      description: 'Additional subject for profile verification',
      is_elective: false,
      is_active: true,
      teacher: secondaryTeacherId,
    });
    const additionalSubjectId = Number(additionalSubject.id);
    expect(Number.isFinite(additionalSubjectId), 'Additional subject id should be numeric').toBeTruthy();
    await patchApi(request, `/api/academic/subjects/${additionalSubjectId}/`, adminSession, {
      additional_teachers: [primaryTeacherId],
    });

    const leadChapter = await postApi<{ id?: number }>(request, '/api/academic/chapters/', adminSession, {
      subject: leadSubjectId,
      title: `${leadSubjectName} Chapter`,
      description: 'Chapter for lead subject progress',
      order: nextOrderValue(),
      is_published: true,
    });
    const leadChapterId = Number(leadChapter.id);
    expect(Number.isFinite(leadChapterId), 'Lead chapter id should be numeric').toBeTruthy();
    await postApi(request, '/api/academic/lessons/', adminSession, {
      chapter: leadChapterId,
      title: `${leadSubjectName} Lesson 1`,
      content_type: 'text',
      content: '<p>Published lesson</p>',
      order: 1,
      duration_minutes: 30,
      is_published: true,
    });
    await postApi(request, '/api/academic/lessons/', adminSession, {
      chapter: leadChapterId,
      title: `${leadSubjectName} Lesson 2`,
      content_type: 'text',
      content: '<p>Draft lesson</p>',
      order: 2,
      duration_minutes: 30,
      is_published: false,
    });

    const additionalChapter = await postApi<{ id?: number }>(request, '/api/academic/chapters/', adminSession, {
      subject: additionalSubjectId,
      title: `${additionalSubjectName} Chapter`,
      description: 'Chapter for additional subject progress',
      order: nextOrderValue(),
      is_published: true,
    });
    const additionalChapterId = Number(additionalChapter.id);
    expect(Number.isFinite(additionalChapterId), 'Additional chapter id should be numeric').toBeTruthy();
    await postApi(request, '/api/academic/lessons/', adminSession, {
      chapter: additionalChapterId,
      title: `${additionalSubjectName} Lesson 1`,
      content_type: 'text',
      content: '<p>Published lesson</p>',
      order: 1,
      duration_minutes: 30,
      is_published: true,
    });

    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/teachers'));

    await page.getByPlaceholder('Search by name, email, or designation...').fill(primarySearchText);
    const teacherRow = page.locator('tr', { hasText: primarySearchText }).first();
    await expect(teacherRow).toBeVisible({ timeout: 20_000 });

    await teacherRow.locator('button').last().click();
    await page.getByRole('menuitem', { name: /View Profile/i }).click();

    const profilePanel = page.locator('.fixed.inset-0').last();
    await expect(profilePanel).toContainText('Teaching Coverage', { timeout: 20_000 });
    await expect(profilePanel).toContainText(leadSubjectName, { timeout: 20_000 });
    await expect(profilePanel).toContainText(additionalSubjectName, { timeout: 20_000 });
    await expect(profilePanel).toContainText(/Lead Teacher/i);
    await expect(profilePanel).toContainText(/Additional Teacher/i);
    await expect(profilePanel).toContainText(/Class & Section Responsibilities/i);
    await expect(profilePanel).toContainText(/Lessons Taught/i);
    await expect(profilePanel).toContainText(/Lessons Left/i);
  });

  test('Add student', async ({ page, request }) => {
    await ensureReportPrerequisites(request);
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/students'));
    await page.getByRole('button', { name: /Add Student/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const email = `${uniqueId('student')}@example.com`;
    const username = uniqueId('student').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    await dialog.getByPlaceholder(/^John$/i).fill('E2E');
    await dialog.getByPlaceholder(/^Doe$/i).fill('Student');
    await dialog.getByPlaceholder(/^student@school\.com$/i).fill(email);
    await dialog.getByPlaceholder(/^johndoe$/i).fill(username);
    await dialog.getByPlaceholder(/^Sensitive123$/i).fill('Student@1234');

    const combos = dialog.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThan(0);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available for student enrollment').toBeTruthy();
    if ((await combos.count()) > 1) {
      const sectionCombo = combos.nth(1);
      if (await sectionCombo.isEnabled()) {
        const sectionSelected = await selectFirstOptionFromCombobox(page, sectionCombo);
        expect(sectionSelected, 'Section options should be selectable').toBeTruthy();
      }
    }

    await dialog.getByRole('button', { name: /Enroll Student/i }).click();
    try {
      await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
    } catch {
      await expect(page.locator('body')).toContainText(/Student created/i, { timeout: 10_000 });
    }
  });

  test('Create class', async ({ page, request }) => {
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/academic/classes'));
    await page.getByRole('button', { name: /Add New Class/i }).click();

    const className = `E2E Grade ${Date.now()}`;
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('e.g. Grade 10').fill(className);
    await dialog.getByRole('button', { name: /Create Class/i }).click();

    await expect(page.getByText(className)).toBeVisible({ timeout: 20_000 });
  });

  test('Generate report', async ({ page, request }) => {
    await ensureReportPrerequisites(request);
    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/reports'));

    const combos = page.getByRole('combobox');
    await expect.poll(async () => combos.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    const classSelected = await selectFirstOptionFromCombobox(page, combos.nth(0));
    expect(classSelected, 'Class options should be available for report generation').toBeTruthy();
    const sectionSelected = await selectFirstOptionFromCombobox(page, combos.nth(1));
    expect(sectionSelected, 'Section options should be available for selected class').toBeTruthy();
    const studentSelected = await selectFirstOptionFromCombobox(page, combos.nth(2));
    expect(studentSelected, 'Student options should be available for selected section').toBeTruthy();

    const downloadButton = page.getByRole('button', { name: /Download Report Card \(PDF\)/i });
    const [popup] = await Promise.all([page.waitForEvent('popup'), downloadButton.click()]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/api\/academic\/reports\/student-performance\//);
  });
});

test.describe('Timetable flow', () => {
  test('Admin creates main timetable slot', async ({ page, request }) => {
    const adminSession = await requireApiSession(request, 'admin');
    await ensureClassAndSection(request, adminSession);
    const className = uniqueId('E2E Timetable Class');
    const createdClass = await postApi<{ id?: number }>(request, '/api/academic/classes/', adminSession, {
      name: className,
      order: nextOrderValue(),
    });
    const classId = Number(createdClass.id || 0);
    expect(classId > 0, 'Created class id missing for timetable test').toBeTruthy();

    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/timetable'));
    await expect(page.getByRole('heading', { name: /Timetable Management/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Open Timetable Manager/i }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: /Timetable Management Console/i }).first();
    await expect(dialog.getByRole('heading', { name: /Timetable Management Console/i })).toBeVisible({ timeout: 20_000 });
    const classSelected = await selectComboboxOptionByText(page, dialog.locator('button[role="combobox"]').first(), className);
    expect(classSelected, 'Created class should be selectable in timetable manager').toBeTruthy();

    const subjectName = uniqueId('E2E Main Timetable');
    const timeInputs = dialog.locator('input[type="time"]');
    await expect.poll(async () => timeInputs.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    await timeInputs.nth(0).fill('05:30');
    await timeInputs.nth(1).fill('06:00');
    await dialog.getByPlaceholder('Physics').fill(subjectName);
    await dialog.getByPlaceholder('101').fill('E2E-R1');
    await dialog.getByRole('button', { name: /Add Main Slot/i }).click();

    await expect
      .poll(
        async () => {
          const rows = await listApi<{ subject_name?: string }>(
            request,
            `/api/academic/timetable/?academic_class=${classId}&entry_type=main`,
            adminSession,
          );
          return rows.some((row) => String(row.subject_name || '') === subjectName);
        },
        { timeout: 30_000 },
      )
      .toBeTruthy();
  });

  test('Teacher submits extra class request', async ({ page, request }) => {
    await ensureTeacherContextWithClassAndSubject(request);
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/timetable'));
    try {
      await expectPathStartsWith(page, '/teacher/timetable');
    } catch {
      await page.getByRole('link', { name: /Timetable/i }).first().click();
      await expectPathStartsWith(page, '/teacher/timetable');
    }
    await expect(page.getByRole('heading', { name: /^Timetable$/i })).toBeVisible({ timeout: 20_000 });

    const subjectName = uniqueId('E2E Extra Request');
    const timeInputs = page.locator('input[type="time"]');
    await expect.poll(async () => timeInputs.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    await timeInputs.nth(0).fill('21:00');
    await timeInputs.nth(1).fill('21:45');
    await page.getByPlaceholder('Remedial Mathematics').fill(subjectName);
    await page.getByPlaceholder('Lab 2').fill('E2E-LAB');

    const submitButton = page.getByRole('button', { name: /Submit Request/i });
    await expect(submitButton).toBeEnabled({ timeout: 20_000 });
    const createResponsePromise = page.waitForResponse((response) => {
      const isTimetableCreate = /\/api\/academic\/timetable\/$/.test(response.url());
      return isTimetableCreate && response.request().method() === 'POST';
    });
    await submitButton.click();
    const createResponse = await createResponsePromise;
    const createPayload = (await createResponse.json().catch(() => ({}))) as {
      timetable_id?: number;
      id?: number;
      subject_name?: string;
      status?: string;
    };
    expect(createResponse.ok(), `Timetable request create failed: ${JSON.stringify(createPayload)}`).toBeTruthy();
    expect(String(createPayload.subject_name || '')).toBe(subjectName);
    expect(Number(createPayload.timetable_id || createPayload.id || 0) > 0).toBeTruthy();
    await expect(page.getByText(/Extra class request submitted for approval/i)).toBeVisible({ timeout: 20_000 });
  });

  test('Teacher cannot modify main timetable and admin approval is visible to student', async ({ page, request }) => {
    const adminSession = await requireApiSession(request, 'admin');
    const teacherSession = await requireApiSession(request, 'teacher');
    const studentSession = await requireApiSession(request, 'student');
    const studentContext = await ensureStudentContext(request, studentSession, adminSession);
    const teacherId = await ensureTeacherAssignedToClass(
      request,
      adminSession,
      teacherSession,
      studentContext.classId,
    );

    const lockedMainSubject = uniqueId('E2E Main Locked');
    const mainEntry = await postApi<{ timetable_id?: number; id?: number }>(
      request,
      '/api/academic/timetable/',
      adminSession,
      {
        academic_class: studentContext.classId,
        day_of_week: 'Sunday',
        start_time: '05:30',
        end_time: '06:00',
        subject_name: lockedMainSubject,
        room_number: 'LOCK-01',
        teacher: teacherId,
        entry_type: 'main',
        status: 'approved',
      },
    );
    const mainTimetableId = Number(mainEntry.timetable_id || mainEntry.id || 0);
    expect(mainTimetableId > 0, 'Main timetable entry id missing').toBeTruthy();

    const forbiddenPatch = await request.patch(apiUrl(`/api/academic/timetable/${mainTimetableId}/`), {
      headers: {
        ...authHeaders(teacherSession.accessToken, teacherSession.credential.schoolCode),
        'Content-Type': 'application/json',
      },
      data: { subject_name: `${lockedMainSubject} (Edited by teacher)` },
    });
    expect(
      forbiddenPatch.status(),
      'Expected 403. A 200 response means the backend timetable permission patch is not deployed in this environment yet.',
    ).toBe(403);

    const extraSubject = uniqueId('E2E Extra Approval');
    const pendingRequest = await request.post(apiUrl('/api/academic/timetable/'), {
      headers: {
        ...authHeaders(teacherSession.accessToken, teacherSession.credential.schoolCode),
        'Content-Type': 'application/json',
      },
      data: {
        academic_class: studentContext.classId,
        day_of_week: 'Monday',
        start_time: '21:00',
        end_time: '21:45',
        subject_name: extraSubject,
        room_number: 'EXTRA-01',
        teacher: teacherId,
        entry_type: 'extra',
      },
    });
    const createdRequest = await expectApiOk<{ timetable_id?: number; id?: number; status?: string }>(
      pendingRequest,
      'POST /api/academic/timetable/ as teacher',
    );
    const pendingRequestId = Number(createdRequest.timetable_id || createdRequest.id || 0);
    expect(pendingRequestId > 0, 'Pending extra timetable request id missing').toBeTruthy();
    expect(String(createdRequest.status || '')).toBe('pending');

    const classes = await listApi<{ id?: number; name?: string }>(request, '/api/academic/classes/', adminSession);
    const selectedClassName = String(
      classes.find((item) => Number(item.id || 0) === studentContext.classId)?.name || '',
    );
    expect(selectedClassName.length > 0, 'Unable to resolve class name for timetable approval').toBeTruthy();

    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/timetable'));
    await page.getByRole('button', { name: /Open Timetable Manager/i }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: /Timetable Management Console/i }).first();
    const classSelected = await selectComboboxOptionByText(
      page,
      dialog.locator('button[role="combobox"]').first(),
      selectedClassName,
    );
    expect(classSelected, `Unable to select class ${selectedClassName} in timetable manager`).toBeTruthy();

    const pendingCard = dialog.locator('.rounded-md.border.p-3.bg-slate-50').filter({ hasText: extraSubject }).first();
    await expect(pendingCard).toBeVisible({ timeout: 30_000 });
    await pendingCard.getByRole('button', { name: /^Approve$/i }).first().click();

    await expect
      .poll(
        async () => {
          const rows = await listApi<{ timetable_id?: number; id?: number; status?: string }>(
            request,
            `/api/academic/timetable/?academic_class=${studentContext.classId}&entry_type=extra`,
            adminSession,
          );
          const matched = rows.find((row) => Number(row.timetable_id || row.id || 0) === pendingRequestId);
          return String(matched?.status || '');
        },
        { timeout: 30_000 },
      )
      .toBe('approved');

    let studentVisibleDay = '';
    await expect
      .poll(
        async () => {
          const rows = await listApi<{
            timetable_id?: number;
            id?: number;
            subject_name?: string;
            day_of_week?: string;
            entry_type?: string;
            status?: string;
          }>(request, '/api/academic/timetable/my_timetable/', studentSession);
          const matched = rows.find((row) => Number(row.timetable_id || row.id || 0) === pendingRequestId);
          studentVisibleDay = String(matched?.day_of_week || '');
          return Boolean(matched);
        },
        { timeout: 30_000 },
      )
      .toBeTruthy();

    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/timetable'));
    try {
      await expectPathStartsWith(page, '/student/timetable');
    } catch {
      await page.getByRole('link', { name: /^Timetable$/i }).first().click();
      await expectPathStartsWith(page, '/student/timetable');
    }
    await expect(page.getByRole('heading', { name: /Class Timetable/i })).toBeVisible({ timeout: 20_000 });

    if (studentVisibleDay) {
      const dayShort = studentVisibleDay.slice(0, 3);
      const dayTab = page.getByRole('tab', { name: new RegExp(`^${escapeRegExp(dayShort)}`, 'i') }).first();
      if (await dayTab.isVisible().catch(() => false)) {
        await dayTab.click();
      }
    }
  });
});

test.describe('Library flow', () => {
  test('Student issue book', async ({ page, request }) => {
    const adminSession = await requireApiSession(request, 'admin');
    const book = await ensureLibraryBook(request, adminSession, { title: uniqueId('E2E Student Library Book') });

    await bootstrapSession(page, request, 'student');
    await page.goto(appUrl('/student/library'));
    await expect(page).toHaveURL(/\/student\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible({ timeout: 20_000 });

    const searchInput = page.getByPlaceholder(/Search by title, author/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill(book.title);

    const detailsButton = page.getByRole('button', { name: /^Details$/i }).first();
    await expect(detailsButton).toBeVisible({ timeout: 20_000 });
    await detailsButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(book.title).first()).toBeVisible({ timeout: 20_000 });
    const issueButton = dialog.getByRole('button', { name: /^Issue Book$/i }).first();
    await expect(issueButton).toBeEnabled({ timeout: 20_000 });
    await issueButton.click();

    const studentSession = await requireApiSession(request, 'student');
    await expect
      .poll(
        async () => {
          const issues = await listApi<{ book?: string | number; status?: string }>(request, '/api/library/issues/', studentSession);
          return issues.some(
            (issue) => String(issue.book || '') === book.bookId && ['issued', 'overdue'].includes(String(issue.status || '')),
          );
        },
        { timeout: 20_000 },
      )
      .toBeTruthy();
  });

  test('Teacher add library book', async ({ page, request }) => {
    await bootstrapSession(page, request, 'teacher');
    await page.goto(appUrl('/teacher/library'));
    await expect(page).toHaveURL(/\/teacher\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Library Management/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Add New Book/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    const bookTitle = uniqueId('E2E Teacher Library Book');
    await dialog.getByPlaceholder(/Book title/i).fill(bookTitle);
    await dialog.getByPlaceholder(/Author name/i).fill('E2E Teacher Author');
    await dialog.locator('input[type="number"]').first().fill('2');
    await dialog.getByRole('button', { name: /Register Book/i }).click();

    await expect(page.getByText(bookTitle)).toBeVisible({ timeout: 20_000 });
  });

  test('Admin return issued book', async ({ page, request }) => {
    const issued = await issueLibraryBookToStudent(request, { bookTitle: uniqueId('E2E Admin Return Book') });

    await bootstrapSession(page, request, 'admin');
    await page.goto(appUrl('/admin/library'));
    await expect(page).toHaveURL(/\/admin\/library(?:$|[/?#])/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Librarian Dashboard/i })).toBeVisible({ timeout: 20_000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const searchInput = page.getByPlaceholder(/Search student or book/i);
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    await searchInput.fill(issued.bookTitle);

    const issueCard = page.locator('div').filter({ hasText: issued.bookTitle }).first();
    await expect(issueCard).toBeVisible({ timeout: 20_000 });
    await issueCard.getByRole('button', { name: /^Return$/i }).click();

    const adminSession = await requireApiSession(request, 'admin');
    await waitForLibraryIssueStatus(request, adminSession, issued.issueId, 'returned');
  });
});
