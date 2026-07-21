// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import * as SecureStore from 'expo-secure-store';

// ─── Configuration ────────────────────────────────────────────
// Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).
// On a physical device this must be your computer's LAN IP, not localhost.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';
if (!process.env.EXPO_PUBLIC_API_URL) {
    // eslint-disable-next-line no-console
    console.warn('[mobile] EXPO_PUBLIC_API_URL not set — falling back to localhost. Physical devices will fail; set it in mobile/.env and restart Expo.');
}
const USER_STORE_KEY = 'current_user';
const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || 15000);

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'staff' | 'saas_admin';

// ─── Types (mirrored from web frontend/lib/api.ts) ────────────
export interface User {
    user_id: string;
    id?: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    tenant: string;
    is_active?: boolean;
    phone_number?: string;
    bio?: string;
    tenant_features?: Record<string, boolean>;
}

export interface Subject {
    id: number;
    name: string;
    code?: string;
    academic_class: number;
    description?: string;
    is_elective: boolean;
    teacher?: string;
    teacher_name?: string;
    additional_teacher_names?: string[];
    total_lessons?: number;
    completed_lessons?: number;
    progress_percentage?: number;
}

export interface Chapter {
    id: number;
    subject: number;
    title: string;
    description?: string;
    order: number;
    is_published: boolean;
    lessons?: Lesson[];
}

export interface Lesson {
    id: number;
    chapter: number;
    title: string;
    content_type: 'text' | 'video' | 'interactive' | 'quiz';
    content?: string;
    video_url?: string | null;
    order: number;
    is_published: boolean;
    duration_minutes: number;
    completed?: boolean;
    assessment?: string | null;
}

export interface Assessment {
    id: string;
    assessment_id: string;
    title: string;
    description: string;
    type: 'quiz' | 'exam' | 'assignment';
    total_marks: number;
    duration_minutes: number;
    due_date: string;
    scheduled_at?: string;
    subject?: number;
    subject_name?: string;
}

export interface Question {
    id: string;
    question_id: string;
    assessment: string;
    text: string;
    type: 'mcq' | 'short_answer' | 'long_answer' | 'code';
    options: string[];
    correct_answer?: string;
    points: number;
    order: number;
}

export interface Submission {
    id: string;
    submission_id: string;
    assessment: string;
    student: string;
    content?: string;
    submitted_at: string;
    status: 'draft' | 'submitted' | 'graded' | 'late';
    is_graded: boolean;
    score?: number;
    max_score?: number;
    feedback?: string;
    result?: {
        result_id: string;
        score: number;
        max_score: number;
        percentage?: number;
        grade?: string;
        ai_feedback?: string;
        answers?: Record<string, unknown>;
    };
}

export interface SubmitExamResponse {
    score: number;
    max_score: number;
    result_id: string;
}

export interface TutorChatSource {
    lesson_id?: string | number;
    lesson_title?: string;
    chapter_title?: string;
    score?: number;
    snippet?: string;
}

export interface TutorChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface TutorChatResponse {
    answer: string;
    sources: TutorChatSource[];
    usage: { model: string; prompt_tokens: number; completion_tokens: number };
    tokens_used: number;
    is_demo: boolean;
    error?: string;
    fallback_reason?: string;
}

export interface Notice {
    id?: number;
    title: string;
    content: string;
    category: string;
    priority: 'low' | 'normal' | 'high';
    target_audience?: 'school' | 'class' | 'student';
    target_class?: number | null;
    target_student?: string | null;
    published_date?: string;
}

export interface Student {
    id: string;
    student_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    academic_class: number | null;
    class_name?: string;
    section_name?: string;
    current_streak: number;
    total_minutes_learned: number;
    focus_score: number;
}

export interface Attendance {
    attendance_id: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    subject_name?: string;
}

export interface CreateAttendancePayload {
    student: string;
    subject: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    remarks?: string;
}

export interface GradeSubmissionPayload {
    score: number;
    teacher_feedback?: string;
}

export interface GradeResultResponse {
    submission?: Submission;
    result?: {
        result_id: string;
        score: number;
        max_score: number;
        percentage?: number;
        grade?: string;
        teacher_feedback?: string;
    };
    message?: string;
}

export interface Grade {
    id: string;
    assessment_title?: string;
    score: number;
    total_marks?: number;
    submitted_at: string;
    ai_feedback?: string;
}

export interface StudentFee {
    student_fee_id: string;
    fee_name: string;
    amount: number;
    amount_paid: number;
    discount_amount: number;
    due_date: string;
    status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
    student_name?: string;
}

export interface FeePayment {
    payment_id: string;
    student_fee: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    transaction_ref?: string;
}

export interface MyFeesResponse {
    fees: StudentFee[];
    payments: FeePayment[];
    summary: { total_due: number; total_paid: number; outstanding: number };
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user: User;
    tenant?: string;
}

export interface AcademicStats {
    total_teachers: number;
    total_students: number;
    total_classes: number;
    total_subjects: number;
}

export interface TeacherProfile {
    id: string;
    teacher_id?: string;
    user_id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    designation?: string;
    assigned_classes?: number[];
}

export interface TeacherProfileOverview {
    teacher_id: string;
    teacher_name: string;
    designation?: string;
    summary?: {
        total_subjects: number;
        total_classes: number;
        total_lessons: number;
        taught_lessons: number;
        remaining_lessons: number;
        progress_percentage: number;
    };
    subjects?: Array<{
        subject_id: number;
        subject_name: string;
        class_name: string;
        role: string;
        total_lessons: number;
        taught_lessons: number;
        remaining_lessons: number;
        progress_percentage: number;
    }>;
    class_sections_progress?: Array<{
        class_id: number;
        class_name: string;
        section_names: string[];
        roles: string[];
        progress_percentage: number;
    }>;
}

export interface StudentListItem {
    id: string;
    student_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    class_name?: string;
    section_name?: string;
    focus_score?: number;
}

export interface ParentMeResponse {
    id: string;
    parent_id: string;
    user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
    };
    students?: StudentListItem[];
}

export interface ChildAttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'late' | string;
}

export interface ChildAttendanceSummary {
    present: number;
    absent: number;
    late: number;
    percentage: number;
    total?: number;
}

export interface ChildAttendanceResponse {
    records: ChildAttendanceRecord[];
    summary: ChildAttendanceSummary;
}

export interface ChildResult {
    id?: string;
    assessment_title?: string;
    subject?: string;
    subject_name?: string;
    score?: number;
    total_marks?: number;
    percentage?: number;
    date?: string;
    submitted_at?: string;
}

export interface StudentProfileOverview {
    student: {
        id: string;
        first_name?: string;
        last_name?: string;
        class_name?: string;
        section_name?: string;
        focus_score?: number;
        current_streak?: number;
        total_minutes_learned?: number;
    };
    overall?: {
        total_subjects: number;
        progress_percentage: number;
        total_assessments: number;
        completed_assessments: number;
        total_assignments: number;
        submitted_assignments: number;
        pending_assignments: number;
        average_score_percentage: number;
    };
    subject_progress?: Array<{
        subject_id: number;
        subject_name: string;
        progress_percentage: number;
        average_score_percentage: number;
        assignment_pending: number;
    }>;
    recent_results?: Array<{
        assessment_title: string;
        subject_name: string;
        percentage: number;
        submitted_at?: string;
    }>;
    assignments?: Array<{
        title: string;
        subject_name: string;
        status: string;
        due_date?: string | null;
    }>;
}

export interface TimetableEntry {
    id: number;
    timetable_id: number;
    academic_class?: number;
    academic_class_name?: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    teacher_name?: string;
    room_number?: string | null;
    entry_type: 'main' | 'extra';
    status: 'pending' | 'approved' | 'rejected';
}

export interface NoticeCreatePayload {
    title: string;
    content: string;
    category?: string;
    priority?: 'low' | 'normal' | 'high';
    target_audience?: 'school' | 'class' | 'student';
    target_class?: number | null;
    target_student?: string | null;
}

export interface TimetableRequestPayload {
    academic_class: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    room_number?: string;
    entry_type?: 'extra' | 'main';
}

export interface CreateTeacherPayload {
    first_name: string;
    last_name: string;
    email: string;
    username?: string;
    password?: string;
    designation?: string;
    assigned_classes?: number[];
}

export interface CreateStudentPayload {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    academic_class: number;
    section?: number | null;
}

export interface AcademicClass {
    id: number;
    name: string;
    order?: number;
}

export interface Section {
    id: number;
    name: string;
    academic_class: number;
}

// ─── Auth Helpers ─────────────────────────────────────────────
export async function getAuthToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync('access_token');
    } catch {
        return null;
    }
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
}

export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync(USER_STORE_KEY);
}

export async function getTenantId(): Promise<string> {
    const tenant = await SecureStore.getItemAsync('tenant_id');
    return tenant || 'demo';
}

export async function saveTenantId(tenantId: string): Promise<void> {
    await SecureStore.setItemAsync('tenant_id', tenantId);
}

export async function saveCurrentUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_STORE_KEY, JSON.stringify(user));
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const stored = await SecureStore.getItemAsync(USER_STORE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored) as User;
        return parsed;
    } catch {
        return null;
    }
}

// ─── Response Helpers ─────────────────────────────────────────
function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (!isObject(payload)) return [];

    const candidates: unknown[] = [
        payload.results,
        payload.data,
        payload.items,
        payload.records,
        payload.subjects,
        payload.students,
        payload.teachers,
        payload.notices,
        payload.assignments,
        payload.recent_results,
        payload.subject_progress,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate as T[];
    }

    return [];
}

function toUser(payload: Partial<User>): User {
    const userId = payload.user_id || payload.id || '';
    return {
        user_id: userId,
        id: payload.id,
        username: payload.username || payload.email || userId,
        email: payload.email || '',
        first_name: payload.first_name || '',
        last_name: payload.last_name || '',
        role: (payload.role || 'student') as UserRole,
        tenant: payload.tenant || 'demo',
        is_active: payload.is_active,
        phone_number: payload.phone_number,
        bio: payload.bio,
        tenant_features: payload.tenant_features,
    };
}

// ─── Core API Request ─────────────────────────────────────────
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();
    const tenantId = await getTenantId();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const hasExternalSignal = Boolean(options.signal);
    const timeoutHandle = hasExternalSignal
        ? null
        : setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: options.signal || controller.signal,
        });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`Request timeout after ${Math.floor(API_TIMEOUT_MS / 1000)}s`);
        }
        throw new Error('Network request failed. Check internet and API URL.');
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }

    const bodyText = await response.text();
    let bodyData: unknown = null;

    if (bodyText) {
        try {
            bodyData = JSON.parse(bodyText);
        } catch {
            bodyData = bodyText;
        }
    }

    if (!response.ok) {
        let message = `API Error ${response.status}`;
        if (isObject(bodyData)) {
            const detail = bodyData.detail;
            const msg = bodyData.message;
            if (typeof detail === 'string') message = detail;
            else if (typeof msg === 'string') message = msg;
            else message = JSON.stringify(bodyData);
        }
        throw new Error(message);
    }

    if (response.status === 204) return {} as T;
    return (bodyData ?? ({} as T)) as T;
}

// ─── Auth API ─────────────────────────────────────────────────
export const authAPI = {
    login: async (username: string, password: string, subdomain: string): Promise<LoginResponse> => {
        const headers = {
            'Content-Type': 'application/json',
            'x-tenant-id': subdomain,
        };

        const primaryPayload = { email: username, password };
        let response = await fetch(`${API_BASE_URL}/users/login/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(primaryPayload),
        });

        if (!response.ok) {
            // Compatibility fallback for backends that still expect username
            response = await fetch(`${API_BASE_URL}/users/login/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ username, password }),
            });
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({} as Record<string, string>));
            throw new Error(err.detail || 'Login failed. Check credentials.');
        }

        const data = (await response.json()) as Partial<LoginResponse>;
        const normalizedUser = toUser(data.user || {});

        return {
            access: data.access || '',
            refresh: data.refresh || '',
            user: normalizedUser,
            tenant: data.tenant,
        };
    },
};

// ─── Users API ────────────────────────────────────────────────
export const usersAPI = {
    getMe: async (): Promise<User> => {
        const response = await apiRequest<Partial<User>>('/users/accounts/me/');
        const normalized = toUser(response);
        await saveCurrentUser(normalized);
        return normalized;
    },

    updateMe: async (payload: Partial<Pick<User, 'first_name' | 'last_name' | 'phone_number' | 'bio'>>): Promise<User> => {
        const response = await apiRequest<Partial<User>>('/users/accounts/me/', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const normalized = toUser(response);
        await saveCurrentUser(normalized);
        return normalized;
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
        await apiRequest<{ message?: string }>('/users/accounts/change-password/', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
    },
};

// ─── Academic API ─────────────────────────────────────────────
export const academicAPI = {
    getStats: () => apiRequest<AcademicStats>('/academic/stats/'),

    getClasses: async (): Promise<AcademicClass[]> => {
        const response = await apiRequest<unknown>('/academic/classes/');
        return normalizeList<AcademicClass>(response);
    },

    getSections: async (): Promise<Section[]> => {
        const response = await apiRequest<unknown>('/academic/sections/');
        return normalizeList<Section>(response);
    },

    getMyStudent: () => apiRequest<Student>('/academic/students/me/'),

    getStudents: async (): Promise<StudentListItem[]> => {
        const response = await apiRequest<unknown>('/academic/students/');
        return normalizeList<StudentListItem>(response);
    },

    getStudentProfileOverview: (studentId: string) =>
        apiRequest<StudentProfileOverview>(`/academic/students/${studentId}/profile-overview/`),

    getSubjects: async (studentId: string, studentClassId?: number | null): Promise<Subject[]> => {
        // Newer backends may not expose /students/{id}/subjects/.
        try {
            const response = await apiRequest<unknown>(`/academic/students/${studentId}/subjects/`);
            const subjects = normalizeList<Subject>(response);
            if (subjects.length > 0) return subjects;
        } catch {
            // Fallback below.
        }

        const classId = studentClassId ?? (await academicAPI.getMyStudent()).academic_class;
        if (!classId) return [];
        return academicAPI.getSubjectsByClass(classId);
    },

    getAllSubjects: async (): Promise<Subject[]> => {
        const response = await apiRequest<unknown>('/academic/subjects/');
        return normalizeList<Subject>(response);
    },

    getSubjectsByClass: async (classId: number): Promise<Subject[]> => {
        const response = await apiRequest<unknown>(`/academic/subjects/?academic_class=${classId}`);
        return normalizeList<Subject>(response);
    },

    getTeachers: async (): Promise<TeacherProfile[]> => {
        const response = await apiRequest<unknown>('/academic/teachers/');
        return normalizeList<TeacherProfile>(response);
    },

    getTeacherProfileOverview: (teacherId: string) =>
        apiRequest<TeacherProfileOverview>(`/academic/teachers/${teacherId}/profile-overview/`),

    getParentMe: () => apiRequest<ParentMeResponse>('/academic/parents/me/'),

    getChildAttendance: (
        studentId: string,
        month?: number,
        year?: number
    ): Promise<ChildAttendanceResponse> => {
        const params = new URLSearchParams();
        if (month) params.set('month', String(month));
        if (year) params.set('year', String(year));
        const qs = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<ChildAttendanceResponse>(
            `/academic/parents/child/${studentId}/attendance/${qs}`
        );
    },

    getChildResults: async (studentId: string): Promise<ChildResult[]> => {
        const response = await apiRequest<unknown>(`/academic/parents/child/${studentId}/results/`);
        return normalizeList<ChildResult>(response);
    },

    getChapters: async (subjectId: number): Promise<Chapter[]> => {
        const response = await apiRequest<unknown>(`/academic/chapters/?subject=${subjectId}`);
        return normalizeList<Chapter>(response);
    },

    getAssessments: async (): Promise<Assessment[]> => {
        const response = await apiRequest<unknown>('/academic/assessments/');
        return normalizeList<Assessment>(response);
    },

    getAssessment: (id: string): Promise<Assessment> =>
        apiRequest<Assessment>(`/academic/assessments/${id}/`),

    createAssessment: (payload: Partial<Assessment> & { subject?: number; total_marks?: number; duration_minutes?: number }): Promise<Assessment> =>
        apiRequest<Assessment>('/academic/assessments/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateAssessment: (id: string, payload: Partial<Assessment>): Promise<Assessment> =>
        apiRequest<Assessment>(`/academic/assessments/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),

    deleteAssessment: (id: string): Promise<void> =>
        apiRequest<void>(`/academic/assessments/${id}/`, { method: 'DELETE' }),

    createQuestion: (payload: Partial<Question> & { assessment: string }): Promise<Question> =>
        apiRequest<Question>('/academic/questions/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    deleteQuestion: (id: string): Promise<void> =>
        apiRequest<void>(`/academic/questions/${id}/`, { method: 'DELETE' }),

    getQuestionsByAssessment: async (assessmentId: string): Promise<Question[]> => {
        const response = await apiRequest<unknown>(`/academic/questions/?assessment=${assessmentId}`);
        return normalizeList<Question>(response);
    },

    submitExam: (
        assessmentId: string,
        answers: Record<string, unknown>,
        timeTaken: number
    ): Promise<SubmitExamResponse> =>
        apiRequest<SubmitExamResponse>('/academic/submissions/submit_exam/', {
            method: 'POST',
            body: JSON.stringify({ assessment: assessmentId, answers, time_taken: timeTaken }),
        }),

    getSubmission: (id: string): Promise<Submission> =>
        apiRequest<Submission>(`/academic/submissions/${id}/`),

    getSubmissions: async (assessmentId?: string): Promise<Submission[]> => {
        const query = assessmentId ? `?assessment=${assessmentId}` : '';
        const response = await apiRequest<unknown>(`/academic/submissions/${query}`);
        return normalizeList<Submission>(response);
    },

    gradeSubmission: (id: string, payload: GradeSubmissionPayload): Promise<GradeResultResponse> =>
        apiRequest<GradeResultResponse>(`/academic/submissions/${id}/grade/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getStudent: (id: string): Promise<Student> =>
        apiRequest<Student>(`/academic/students/${id}/`),

    createAttendance: (payload: CreateAttendancePayload): Promise<Attendance> =>
        apiRequest<Attendance>('/academic/attendance/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getGrades: async (): Promise<Grade[]> => {
        const response = await apiRequest<unknown>('/academic/results/');
        return normalizeList<Grade>(response);
    },

    getAttendance: async (): Promise<Attendance[]> => {
        const response = await apiRequest<unknown>('/academic/attendance/');
        return normalizeList<Attendance>(response);
    },

    getNotices: async (): Promise<Notice[]> => {
        const response = await apiRequest<unknown>('/academic/notices/');
        return normalizeList<Notice>(response);
    },

    createNotice: (payload: NoticeCreatePayload) =>
        apiRequest<Notice>('/academic/notices/', {
            method: 'POST',
            body: JSON.stringify({
                category: 'General',
                priority: 'normal',
                target_audience: 'school',
                ...payload,
            }),
        }),

    getMyTimetable: async (): Promise<TimetableEntry[]> => {
        const response = await apiRequest<unknown>('/academic/timetable/my_timetable/');
        return normalizeList<TimetableEntry>(response);
    },

    getMyTimetableRequests: async (): Promise<TimetableEntry[]> => {
        const response = await apiRequest<unknown>('/academic/timetable/my_requests/');
        return normalizeList<TimetableEntry>(response);
    },

    getPendingTimetableRequests: async (): Promise<TimetableEntry[]> => {
        const response = await apiRequest<unknown>('/academic/timetable/pending_requests/');
        return normalizeList<TimetableEntry>(response);
    },

    createTimetableRequest: (payload: TimetableRequestPayload) =>
        apiRequest<TimetableEntry>('/academic/timetable/', {
            method: 'POST',
            body: JSON.stringify({
                entry_type: 'extra',
                ...payload,
            }),
        }),

    deleteTimetableEntry: (timetableId: number) =>
        apiRequest<void>(`/academic/timetable/${timetableId}/`, {
            method: 'DELETE',
        }),

    approveTimetableRequest: (
        timetableId: number,
        status: 'approved' | 'rejected',
        approval_comment?: string
    ) =>
        apiRequest<TimetableEntry>(`/academic/timetable/${timetableId}/approve/`, {
            method: 'POST',
            body: JSON.stringify({ status, approval_comment }),
        }),

    createTeacher: (payload: CreateTeacherPayload) =>
        apiRequest<TeacherProfile>('/academic/teachers/', {
            method: 'POST',
            body: JSON.stringify({
                designation: 'subject_teacher',
                ...payload,
            }),
        }),

    createStudent: (payload: CreateStudentPayload) =>
        apiRequest<StudentListItem>('/academic/students/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    toggleLessonProgress: (lessonId: number) =>
        apiRequest<{ completed: boolean }>(`/academic/lessons/${lessonId}/toggle_progress/`, {
            method: 'POST',
        }),
};

// ─── Conversations API ────────────────────────────────────────
export interface ConversationParticipant {
    user: { id: number; first_name: string; last_name: string; email: string };
    joined_at: string;
    last_read_at: string;
}

export interface Conversation {
    conversation_id: string;
    type: 'direct' | 'group';
    title: string | null;
    updated_at: string;
    participants: ConversationParticipant[];
    last_message?: { content: string; sender_name: string; created_at: string } | null;
    unread_count?: number;
}

export interface ConversationMessage {
    message_id: string;
    sender: { id: number; first_name: string; last_name: string };
    content: string;
    is_system_message: boolean;
    created_at: string;
}

export const conversationsAPI = {
    list: (): Promise<Conversation[]> =>
        apiRequest<unknown>('/conversations/conversations/').then(r => {
            if (Array.isArray(r)) return r as Conversation[];
            return ((r as any).results || []) as Conversation[];
        }),

    getMessages: (conversationId: string): Promise<ConversationMessage[]> =>
        apiRequest<unknown>(`/conversations/messages/?conversation=${conversationId}`).then(r => {
            if (Array.isArray(r)) return r as ConversationMessage[];
            return ((r as any).results || []) as ConversationMessage[];
        }),

    sendMessage: (conversationId: string, content: string): Promise<ConversationMessage> =>
        apiRequest<ConversationMessage>('/conversations/messages/', {
            method: 'POST',
            body: JSON.stringify({ conversation: conversationId, content }),
        }),

    markAsRead: (conversationId: string): Promise<void> =>
        apiRequest<void>(`/conversations/conversations/${conversationId}/mark_as_read/`, {
            method: 'POST',
        }),

    startDirectMessage: (recipientId: number): Promise<Conversation> =>
        apiRequest<Conversation>('/conversations/conversations/start_direct_message/', {
            method: 'POST',
            body: JSON.stringify({ recipient_id: recipientId }),
        }),
};

export const billingAPI = {
    getMyFees: (): Promise<MyFeesResponse> =>
        apiRequest<MyFeesResponse>('/billing/school/student-fees/my_fees/'),

    getStudentFees: async (studentId?: string): Promise<StudentFee[]> => {
        const url = studentId
            ? `/billing/school/student-fees/?student=${studentId}`
            : '/billing/school/student-fees/';
        const response = await apiRequest<unknown>(url);
        if (Array.isArray(response)) return response as StudentFee[];
        const r = response as { results?: StudentFee[] };
        return r.results || [];
    },
};

// ─── Library ──────────────────────────────────────────────────
export interface LibraryBook {
    book_id: string;
    title: string;
    author: string;
    isbn?: string | null;
    category: string;
    publisher?: string | null;
    published_year?: number | null;
    total_copies: number;
    available_copies: number;
    description?: string | null;
    cover_image?: string | null;
}

export interface BookIssue {
    issue_id: string;
    book: string;
    book_title?: string;
    book_author?: string;
    issued_date: string;
    due_date: string;
    return_date?: string | null;
    status: 'issued' | 'returned' | 'overdue';
    fine_amount?: string | number;
    remarks?: string | null;
}

export const libraryAPI = {
    getBooks: async (search?: string): Promise<LibraryBook[]> => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await apiRequest<unknown>(`/library/books/${qs}`);
        return normalizeList<LibraryBook>(response);
    },

    getMyIssues: async (): Promise<BookIssue[]> => {
        const response = await apiRequest<unknown>('/library/issues/');
        return normalizeList<BookIssue>(response);
    },
};

// ─── Gamification ────────────────────────────────────────────
export interface Badge {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    points?: number;
}

export interface StudentBadge {
    id: number;
    badge: number;
    badge_details?: Badge;
    earned_at: string;
}

export interface GamificationStats {
    current_level: number;
    current_xp: number;
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    next_level_xp: number;
}

export interface LeaderboardEntry {
    rank: number;
    student_id: string;
    student_name: string;
    total_xp: number;
    current_level: number;
    current_streak: number;
    badges_count: number;
    is_me: boolean;
}

export interface LeaderboardResponse {
    scope: string;
    total_participants: number;
    my_rank?: number | null;
    entries: LeaderboardEntry[];
}

export const gamificationAPI = {
    getMyStats: (): Promise<GamificationStats> =>
        apiRequest<GamificationStats>('/gamification/profile/my_stats/'),

    getMyBadges: async (): Promise<StudentBadge[]> => {
        const response = await apiRequest<unknown>('/gamification/student-badges/');
        return normalizeList<StudentBadge>(response);
    },

    getLeaderboard: (scope: 'class' | 'school' = 'class', limit = 20): Promise<LeaderboardResponse> =>
        apiRequest<LeaderboardResponse>(
            `/gamification/leaderboard/?scope=${scope}&limit=${limit}`
        ),
};

// ─── Learning Path ────────────────────────────────────────────
export interface LearningNode {
    id: number;
    title: string;
    description?: string;
    order: number;
    node_type?: string;
    status?: 'pending' | 'in_progress' | 'completed' | string;
    lesson?: number | null;
    subject?: number | null;
    subject_name?: string;
    progress_percentage?: number;
}

export interface LearningPath {
    id: number;
    title: string;
    description?: string;
    status?: string;
    created_at?: string;
    nodes?: LearningNode[];
    progress_percentage?: number;
}

export const learningPathAPI = {
    getPaths: async (): Promise<LearningPath[]> => {
        const response = await apiRequest<unknown>('/ai/learning-paths/');
        return normalizeList<LearningPath>(response);
    },

    getNodes: async (pathId?: number): Promise<LearningNode[]> => {
        const qs = pathId ? `?learning_path=${pathId}` : '';
        const response = await apiRequest<unknown>(`/ai/learning-nodes/${qs}`);
        return normalizeList<LearningNode>(response);
    },
};

// ─── AI Engine API ────────────────────────────────────────────
export const aiAPI = {
    tutorChat: async (
        message: string,
        studentId: string,
        conversationHistory: TutorChatMessage[] = [],
        context?: { lesson_id?: string | number; chapter_id?: string | number }
    ): Promise<TutorChatResponse> => {
        const payload = await apiRequest<{
            answer?: string;
            response?: string;
            sources?: TutorChatSource[];
            usage?: Partial<TutorChatResponse['usage']>;
            tokens_used?: number;
            is_demo?: boolean;
            error?: string;
            fallback_reason?: string;
        }>('/ai/tutor/chat/', {
            method: 'POST',
            body: JSON.stringify({
                message,
                student_id: studentId,
                conversation_history: conversationHistory,
                context: context || undefined,
            }),
        });

        const answer = String(payload.answer ?? payload.response ?? '');
        const sources = Array.isArray(payload.sources) ? payload.sources : [];
        const promptTokens = Number(payload.usage?.prompt_tokens ?? 0);
        const completionTokens = Number(payload.usage?.completion_tokens ?? 0);
        const model = String(payload.usage?.model ?? 'fallback');
        return {
            answer,
            sources,
            usage: { model, prompt_tokens: promptTokens, completion_tokens: completionTokens },
            tokens_used: Number(payload.tokens_used ?? (promptTokens + completionTokens)),
            is_demo: Boolean(payload.is_demo),
            error: payload.error,
            fallback_reason: payload.fallback_reason,
        };
    },
};
