// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * API Client for E-Learning SaaS Platform
 * Centralized client for all backend API calls
 */

import { removeTokens } from "./auth";
import { getTenantFromSubdomain } from "./tenant";

// API Base Configuration
// API Base Configuration
export const getApiBaseUrl = () => {
    const fallback = 'http://localhost:8000/api';
    const rawUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    const rawLower = rawUrl.toLowerCase();
    if (rawLower === '/api' || rawLower === 'api' || rawLower === 'same-origin' || rawLower === 'same_origin' || rawLower === 'relative') {
        return '/api';
    }

    const candidates = rawUrl.split(',').map((item) => item.trim()).filter(Boolean);
    const apiAbsoluteCandidate = candidates.find((item) => /^https?:\/\//i.test(item) && /\/api(\/|$)/i.test(item));
    let url = apiAbsoluteCandidate
        || candidates.find((item) => /^https?:\/\//i.test(item))
        || candidates.find((item) => !item.startsWith('/'))
        || rawUrl
        || fallback;

    // Ignore invalid path-only values and fall back to default.
    if (url.startsWith('/')) {
        url = fallback;
    }

    // Ensure protocol is present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    // Ensure it ends with /api (without double slashes)
    url = url.replace(/\/$/, ''); // Remove trailing slash if any
    if (!url.endsWith('/api')) {
        url = `${url}/api`;
    }

    return url;
};

const API_BASE_URL = getApiBaseUrl();
const BILLING_SAAS_BASE = '/billing/saas';
const BILLING_SCHOOL_BASE = '/billing/school';

// Types for API Responses
export interface Tenant {
    id?: number | string;
    tenant_id: string;
    name: string;
    subdomain: string;
    domain: string | null;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
    // Profile
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    current_academic_year?: string;
    established_year?: number;
    logo?: string;
    features?: Record<string, boolean>;
    feature_overrides?: Record<string, boolean>;
    /** Plan baseline (without overrides). Read-only; provided by the
     *  TenantSerializer so the SaaS UI can highlight divergence. */
    plan_features?: Record<string, boolean>;
    // Computed SaaS metrics
    student_count?: number;
    teacher_count?: number;
    total_users?: number;
    admin_count?: number;
    plan_name?: string;
    billing_cycle?: string;
    subscription_status?: string;
    ai_usage?: string;
    ai_tokens_used?: number;
    ai_token_limit?: number;
    storage_used_bytes?: number;
    storage_used_mb?: number;
    storage_limit_gb?: number;
    storage_usage_percent?: number;
}

export interface User {
    user_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'teacher' | 'parent' | 'admin' | 'staff' | 'saas_admin' | 'saas_staff';
    staff_role?: '' | 'accountant' | 'librarian' | 'receptionist' | 'hr_manager' | 'hostel_warden' | 'transport_manager';
    tenant: string;
    is_active?: boolean;
    phone_number?: string;
    address?: string;
    bio?: string;
    date_of_birth?: string;
    tenant_features?: Record<string, any>;
}


export interface AcademicYear {
    id: number;
    name: string; // e.g. "2023-2024"
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export interface NepalGradingProfile {
    profile_id: string;
    name: string;
    directive_name: string;
    amendment: string;
    effective_from_bs: string;
    bands: Array<{ min: number; grade: string; grade_point: number; description?: string }>;
    theory_pass_percent: string;
    internal_pass_percent: string;
    practical_pass_percent: string;
}

export interface ExamTerm {
    term_id: string;
    academic_year: number;
    academic_year_name?: string;
    grading_profile?: string;
    grading_profile_name?: string;
    name: string;
    exam_type: 'unit_test' | 'first_terminal' | 'second_terminal' | 'final' | 'pre_board' | 'other';
    start_date: string;
    end_date: string;
    status: 'draft' | 'active' | 'marking' | 'verification' | 'locked' | 'published';
    subject_count?: number;
    include_rank?: boolean;
}

export interface ExamSubjectConfiguration {
    exam_subject_id: string;
    term: string;
    subject: number;
    subject_name?: string;
    subject_code?: string;
    section: number;
    class_name?: string;
    section_name?: string;
    examiner?: string | null;
    examiner_name?: string;
    theory_full_marks: string;
    internal_full_marks: string;
    practical_full_marks: string;
    credit_hours: string;
    marking_status: 'draft' | 'submitted' | 'verified';
    paper_count?: number;
}

export interface StudentTermResult {
    term_result_id: string;
    term: string;
    term_name?: string;
    academic_year?: string;
    student: string;
    student_name?: string;
    marksheet_number: string;
    total_obtained: string;
    total_full_marks: string;
    gpa: string | null;
    result_status: string;
    rank?: number | null;
    snapshot: {
        student?: { name?: string; class?: string; section?: string };
        subjects?: Array<{ subject_name: string; obtained: number; full_marks: number; grade: string; grade_point: number; status: string }>;
    };
    published_at: string;
}

export interface AcademicYearRolloverOptions {
    migrate_timetable?: boolean;
    migrate_courses?: boolean;
    migrate_subjects?: boolean;
    migrate_lessons?: boolean;
    migrate_chapters?: boolean;
    migrate_quizzes?: boolean;
    migrate_exercises?: boolean;
    migrate_assessments?: boolean;
    auto_upgrade_students?: boolean;
    min_score_percentage?: number;
    min_attendance_percentage?: number;
    manual_promote_student_ids?: string[];
    manual_hold_student_ids?: string[];
}

export interface AcademicYearRolloverRequest {
    source_year?: number;
    target_year?: number;
    dry_run?: boolean;
    confirm?: boolean;
    target?: {
        name?: string;
        start_date?: string;
        end_date?: string;
    };
    name?: string;
    start_date?: string;
    end_date?: string;
    options?: AcademicYearRolloverOptions;
}

export interface AcademicYearRolloverSummary {
    subjects_to_migrate?: number;
    chapters_to_migrate?: number;
    lessons_to_migrate?: number;
    materials_to_migrate?: number;
    assessments_to_migrate?: number;
    questions_to_migrate?: number;
    timetable_entries_to_migrate?: number;
    subjects_migrated?: number;
    chapters_migrated?: number;
    lessons_migrated?: number;
    materials_migrated?: number;
    assessments_migrated?: number;
    questions_migrated?: number;
    timetable_entries_migrated?: number;
    students_promoted?: number;
    students_skipped?: number;
}

export interface AcademicYearPromotionPreview {
    promoted_students: number;
    skipped_students: number;
    failed_score?: number;
    failed_attendance?: number;
    manual_promoted?: number;
    manual_held?: number;
    insufficient_data?: number;
    missing_next_section?: number;
    final_class_students?: number;
    unknown_class_students?: number;
}

export interface AcademicYearRolloverResponse {
    dry_run?: boolean;
    executed?: boolean;
    can_execute?: boolean;
    target_exists?: boolean;
    blockers?: string[];
    warnings?: string[];
    source_year: string;
    target_year: string;
    summary: AcademicYearRolloverSummary;
    promotion_preview?: AcademicYearPromotionPreview;
}


export interface Subject {
    id: number;
    name: string; // e.g. "Mathematics"
    code?: string; // e.g. "MTH101"
    academic_class: number;
    description?: string;
    credits?: number;
    is_elective: boolean;
    teacher?: string | null; // UUID
    teacher_name?: string;
    additional_teachers?: string[]; // UUID[]
    additional_teacher_names?: string[];
    total_lessons?: number;
    completed_lessons?: number;
    progress_percentage?: number;
    is_active?: boolean;
}

export interface Section {
    id: number;
    name: string;
    capacity: number;
}

export interface AcademicClass {
    id: number;
    name: string; // e.g. "Grade 10"
    order: number;
    sections?: Section[];
    subjects?: Subject[]; // Read-only from API
}

export interface Student {
    id: string; // UUID (usually maps to student_id or pk)
    student_id: string; // Explicitly from some serializers
    user_id?: string | null; // UUID — null if linked user was deleted (db_constraint=False)
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    academic_class: number | null;
    class_name?: string | null;
    section: number | null;
    section_name?: string | null;
    parent_email?: string;
    password?: string;

    // Gamification
    current_streak: number;
    total_minutes_learned: number;
    focus_score: number;

    // Preferences
    learning_style?: 'visual' | 'reading' | 'practice';
    daily_study_goal?: number;
    ai_explanation_level?: 'simple' | 'normal' | 'exam';
    language_preference?: string;
    is_active?: boolean;
}

export interface StudentSubjectProgress {
    subject_id: number;
    subject_name: string;
    subject_code?: string | null;
    class_name?: string | null;
    total_lessons: number;
    completed_lessons: number;
    progress_percentage: number;
    assessments_total: number;
    assessments_completed: number;
    assignment_total: number;
    assignment_submitted: number;
    assignment_pending: number;
    average_score_percentage: number;
    latest_result?: {
        assessment_id: string;
        assessment_title: string;
        type: 'quiz' | 'exam' | 'assignment';
        score: number;
        total_marks: number;
        percentage: number;
        submitted_at: string | null;
    } | null;
}

export interface StudentResultOverview {
    result_id: string;
    assessment_id: string;
    assessment_title: string;
    assessment_type: 'quiz' | 'exam' | 'assignment';
    subject_id: number;
    subject_name: string;
    score: number;
    total_marks: number;
    percentage: number;
    submitted_at: string | null;
    teacher_feedback?: string | null;
}

export interface StudentAssignmentOverview {
    assessment_id: string;
    title: string;
    subject_id: number;
    subject_name: string;
    due_date: string | null;
    status: 'pending' | 'draft' | 'submitted' | 'graded' | 'late';
    submitted_at: string | null;
    is_graded: boolean;
    score: number | null;
    total_marks: number;
    percentage: number | null;
}

export interface StudentProfileOverview {
    student: {
        id: string;
        user_id: string;
        first_name: string;
        last_name: string;
        email: string;
        class_id: number | null;
        class_name: string | null;
        section_id: number | null;
        section_name: string | null;
        learning_style?: string;
        daily_study_goal?: number;
        focus_score?: number;
        current_streak?: number;
        total_minutes_learned?: number;
    };
    overall: {
        total_subjects: number;
        total_lessons: number;
        completed_lessons: number;
        progress_percentage: number;
        total_assessments: number;
        completed_assessments: number;
        total_assignments: number;
        submitted_assignments: number;
        pending_assignments: number;
        graded_assignments: number;
        average_score_percentage: number;
    };
    subject_progress: StudentSubjectProgress[];
    recent_results: StudentResultOverview[];
    assignments: StudentAssignmentOverview[];
    analytics: {
        best_subject?: {
            subject_id: number;
            subject_name: string;
            average_score_percentage: number;
            progress_percentage: number;
        } | null;
        weakest_subject?: {
            subject_id: number;
            subject_name: string;
            average_score_percentage: number;
            progress_percentage: number;
        } | null;
        needs_attention_subjects: string[];
        momentum_label: 'excellent' | 'steady' | 'needs_support';
    };
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_name: string;
    criteria_type: string;
    criteria_value: number;
    xp_reward: number;
}

export interface StudentBadge {
    id: string;
    badge: string;
    badge_details?: Badge;
    earned_at: string;
}

export interface PointTransaction {
    id: string;
    points: number;
    description: string;
    activity_type: string;
    timestamp: string;
}

export interface Teacher {
    id: string; // UUID
    user_id: string; // UUID
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    assigned_classes: number[];
    designation?: string;
    is_active?: boolean;
    password?: string; // For creation
}

export interface TeacherSubjectProgress {
    subject_id: number;
    subject_name: string;
    subject_code?: string | null;
    class_id: number;
    class_name: string;
    section_names: string[];
    role: 'lead_teacher' | 'additional_teacher';
    total_lessons: number;
    taught_lessons: number;
    remaining_lessons: number;
    progress_percentage: number;
}

export interface TeacherClassProgress {
    class_id: number;
    class_name: string;
    section_names: string[];
    is_class_teacher: boolean;
    is_subject_teacher: boolean;
    roles: Array<'class_teacher' | 'subject_teacher'>;
    subjects: Array<{
        subject_id: number;
        subject_name: string;
        role: 'lead_teacher' | 'additional_teacher';
    }>;
    total_subjects: number;
    total_lessons: number;
    taught_lessons: number;
    remaining_lessons: number;
    progress_percentage: number;
}

export interface TeacherProfileOverview {
    teacher_id: string;
    teacher_name: string;
    designation: string;
    subjects: TeacherSubjectProgress[];
    class_sections_progress: TeacherClassProgress[];
    summary: {
        total_subjects: number;
        total_classes: number;
        total_classes_as_class_teacher: number;
        total_classes_as_subject_teacher: number;
        total_lessons: number;
        taught_lessons: number;
        remaining_lessons: number;
        progress_percentage: number;
    };
}

export interface Parent {
    parent_id: string;
    user: User;
    students: Student[];
}

// Course interface removed in favor of Subject

// ... existing Lesson ...

export interface Assessment {
    id: string;
    assessment_id: string;
    academic_year?: number | null;
    academic_year_name?: string;
    subject: number | string;
    subject_name?: string;
    section?: number | null;
    title: string;
    description: string;
    type: 'quiz' | 'exam' | 'assignment';
    total_marks: number;
    passing_marks: number;
    duration_minutes: number;
    blooms_level: string;
    due_date: string;
    scheduled_at?: string;
    is_final_assessment?: boolean;
    results_published?: boolean;
    results_published_at?: string | null;
    questions?: Question[];
}

export interface PublishAssessmentResultsResponse {
    assessment_id: string;
    results_published: boolean;
    results_published_at: string | null;
    is_final_assessment: boolean;
    student_promotion?: {
        promoted_students: number;
        skipped_students: number;
        failed_score?: number;
        failed_attendance?: number;
        manual_promoted?: number;
        manual_held?: number;
        insufficient_data?: number;
    } | null;
}

export interface ReopenAssessmentResultsResponse {
    assessment_id: string;
    results_published: boolean;
    results_published_at: string | null;
    reopened: boolean;
}

export type PromotionExceptionAction = 'promote' | 'hold' | 'override' | 'clear';

export interface PromotionExceptionStudent {
    student_id: string;
    student_name: string;
    class_id: number | null;
    class_name: string | null;
    section_id: number | null;
    section_name: string | null;
    recommended_action: 'promote' | 'hold';
    effective_action: 'promote' | 'hold';
    is_override: boolean;
    hold_reason: string | null;
    hold_reason_label?: string;
    warning_reasons?: string[];
    average_score_percentage?: number | null;
    attendance_percentage?: number | null;
    decision?: {
        decision: 'promote' | 'hold';
        decision_reason?: string | null;
        decided_by?: string | null;
        decided_by_name?: string | null;
        updated_at?: string | null;
    } | null;
    history?: Array<{
        action: PromotionExceptionAction;
        previous_decision?: 'promote' | 'hold' | null;
        new_decision?: 'promote' | 'hold' | null;
        decision_reason: string;
        decided_by?: string | null;
        decided_by_name?: string | null;
        created_at: string;
    }>;
}

export interface PromotionExceptionsResponse {
    assessment_id: string;
    assessment_title: string;
    is_final_assessment: boolean;
    locked: boolean;
    lock_reason?: string | null;
    rules: {
        min_score_percentage?: number | null;
        min_attendance_percentage?: number | null;
    };
    summary: {
        total_students: number;
        recommended_promote: number;
        recommended_hold: number;
        decided_promote: number;
        decided_hold: number;
        overrides: number;
        pending_decisions: number;
    };
    publication_audit?: Array<{
        action: 'publish' | 'unpublish' | 'reopen';
        was_published: boolean;
        is_published: boolean;
        reason?: string;
        performed_by?: string | null;
        performed_by_name?: string | null;
        created_at: string;
    }>;
    students: PromotionExceptionStudent[];
    available_filters: {
        classes: Array<{ id: number; name: string; count: number }>;
        sections: Array<{ id: number; class_id: number | null; name: string; count: number }>;
        fail_reasons: Array<{ code: string; label: string; count: number }>;
    };
}

export interface PromotionExceptionSingleDecisionResponse {
    updated: boolean;
    cleared?: boolean;
    student_id: string;
    decision?: 'promote' | 'hold';
    student?: PromotionExceptionStudent | null;
    summary: PromotionExceptionsResponse['summary'];
}

export interface PromotionExceptionBulkDecisionResponse {
    updated: number;
    matched_students: number;
    action?: PromotionExceptionAction;
    summary: PromotionExceptionsResponse['summary'];
}

export interface Result {
    id: string;
    result_id: string;
    assessment: string;
    assessment_title?: string;
    student: string;
    student_name?: string;
    score: number;
    time_taken_minutes: number;
    submitted_at: string;
    ai_feedback?: string;
    teacher_feedback?: string;
    graded_by?: string;
    answers_data?: any;
}

export interface GradebookData {
    assessments: {
        id: string;
        title: string;
        total_marks: number;
        type: string;
    }[];
    students: {
        id: string;
        name: string;
        email: string;
        section_id: number | null;
        section_name: string | null;
        results: Record<string, {
            score: number | null;
            result_id: string | null;
            submitted_at: string | null;
        }>;
    }[];
}

export interface Submission {
    id: string;
    submission_id: string;
    assessment: string;
    student: string;
    content?: string;
    file_url?: string;
    submitted_at: string;
    status: 'draft' | 'submitted' | 'graded' | 'late';
    is_graded: boolean;
    result?: Result;
}

export interface Exam {
    exam_id: string;
    assessment: string;
    assessment_details?: Assessment;
    hall_ticket_prefix: string;
    exam_center?: string;
    seating_capacity: number;
    instructions?: string;
    is_published: boolean;
    results_released: boolean;
    seating_arrangements?: ExamSeating[];
    created_at: string;
    updated_at: string;
}

export interface ExamSeating {
    seating_id: string;
    exam: string;
    student: string;
    student_name?: string;
    student_id_code?: string;
    hall_ticket_number: string;
    room_number: string;
    seat_number: string;
    attendance_status: 'present' | 'absent' | 'late';
}

export interface Chapter {
    id: number;
    subject: number;
    title: string;
    description?: string;
    order: number;
    is_published: boolean;
    lessons?: Lesson[];
    created_at?: string;
}

export interface LessonProgress {
    id: number;
    student: string;
    lesson: number;
    completed: boolean;
    progress_percent?: number;
    video_watched_seconds?: number;
    video_duration_seconds?: number;
    last_accessed: string;
    last_watched_at?: string | null;
    completed_at?: string | null;
}

export interface Lesson {
    id: number;
    chapter: number;
    title: string;
    content_type: 'text' | 'video' | 'interactive' | 'quiz';
    content?: string;
    video_url?: string | null;
    interactive_data?: any;
    assessment?: string;
    order: number;
    is_published: boolean;
    duration_minutes: number;
    materials?: LessonMaterial[];
    user_progress?: LessonProgress | null;
    completed?: boolean; // Convenience field for list views
    progress_percent?: number; // Summary progress (0-100)
    created_at?: string;
    updated_at?: string;
}

export interface LessonMaterial {
    id: number;
    lesson: number;
    title: string;
    file?: string;
    link?: string;
    material_type: 'pdf' | 'image' | 'video' | 'link' | 'other';
    created_at?: string;
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

export interface LearningNode {
    id: string;
    learning_path: string;
    title: string;
    description?: string;
    order: number;
    resource_type: 'video' | 'article' | 'quiz' | 'assignment' | 'topic';
    resource_link?: string;
    lesson?: number;
    estimated_minutes: number;
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    completed_at?: string;
}

export interface LearningPath {
    id: string;
    tenant: string;
    student: string;
    subject?: number | null;
    title: string;
    description?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    generated_by_ai: boolean;
    nodes: LearningNode[];
}

// (Moved definitions to top)

export interface Subscription {
    id?: string;
    subscription_id: string;
    tenant: string;
    plan: string;
    status?: 'active' | 'past_due' | 'cancelled' | 'trial' | string;
    billing_cycle?: 'monthly' | 'yearly' | string;
    auto_renew?: boolean;
    start_date?: string;
    end_date?: string | null;
    active?: boolean;
    student_limit: number;
    storage_limit_gb: number;
    ai_token_limit: number;
    plan_details?: SubscriptionPlan;
}

export interface SubscriptionPlan {
    id: string;
    plan_id: string;
    name: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    currency?: string;
    student_limit: number;
    teacher_limit: number;
    storage_limit_gb: number;
    ai_token_limit: number;
    has_ai_tutor?: boolean;
    has_ai_eval?: boolean;
    has_parent_portal?: boolean;
    has_analytics?: boolean;
    has_career_guidance?: boolean;
    is_active: boolean;
}

export interface Invoice {
    invoice_id: string;
    tenant: string;
    tenant_name?: string;
    subscription?: string;
    plan_name?: string;
    amount: string;
    status: 'pending' | 'paid' | 'failed';
    issued_date: string;
    due_date?: string;
}

export interface SubscriptionPlanHistory {
    history_id: string;
    tenant: string;
    tenant_name?: string;
    subscription: string;
    previous_plan?: string | null;
    new_plan?: string | null;
    previous_plan_name: string;
    new_plan_name: string;
    previous_plan_snapshot: Record<string, any>;
    new_plan_snapshot: Record<string, any>;
    previous_status: string;
    new_status: string;
    previous_billing_cycle: string;
    new_billing_cycle: string;
    reason?: string;
    changed_by?: string | null;
    changed_by_name?: string | null;
    effective_date: string;
    changed_at: string;
}

export interface GlobalSettings {
    id?: number;
    site_name: string;
    support_email: string;
    default_language: string;
    maintenance_mode: boolean;
    allow_registration: boolean;
    ai_enabled: boolean;
    ai_provider_name: string;
    ai_base_url: string;
    ai_model: string;
    auto_detect_model?: boolean;
    ai_api_key?: string;
    ai_api_key_masked?: string;
    ai_api_key_configured?: boolean;
    updated_at?: string;
}

export interface SeedDefaultPlansResponse {
    message: string;
    created: number;
    updated: number;
    rate_used: string;
    used_fallback: boolean;
    plans: SubscriptionPlan[];
}

export interface SaasAIUsageResponse {
    provider: {
        name: string;
        base_url: string;
        model: string;
        configured: boolean;
        enabled?: boolean;
        source?: string;
        api_key_masked?: string;
    };
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_requests: number;
    cost_estimate: number;
    avg_cost_per_1k_tokens: number;
    avg_tokens_per_request: number;
    usage_by_feature: Array<{
        feature: string;
        tokens: number;
        prompt_tokens: number;
        completion_tokens: number;
        requests: number;
        cost_estimate: number;
        percentage: number;
    }>;
    daily_usage_last_7_days: Array<{
        date: string;
        tokens: number;
        requests: number;
        cost_estimate: number;
    }>;
}

export interface AuditLog {
    id: number | string;
    action: string;
    actor?: string;
    user?: string;
    created_at?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
    details?: Record<string, unknown>;
    ip_address?: string | null;
}

export interface SystemStatus {
    status: string;
    latency: string;
    storage: {
        total: string;
        used: string;
        free: string;
        percent: number;
    };
}

export interface Group {
    id: number;
    name: string;
}

export interface Permission {
    id: number;
    name: string;
    codename: string;
}

export interface GradeResult {
    score: number;
    feedback: string;
    tokens_used?: number;
}

type PaginatedResponse<T> = {
    count?: number;
    next?: string | null;
    results?: T[];
};

export function normalizeArrayPayload<T>(payload: T[] | PaginatedResponse<T> | null | undefined): T[] {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
}

// School-site content (admin-managed marketing site data — /admin/school-site/*)
export interface SiteContentBase {
    id: number;
    order: number;
    is_active: boolean;
}

export interface NewsArticle extends SiteContentBase {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    category: 'academics' | 'events' | 'achievements' | 'community';
    published_date: string;
    image?: File | null;
    image_url?: string | null;
}

export interface GalleryItem extends SiteContentBase {
    caption: string;
    category: 'campus' | 'academics' | 'sports' | 'culture' | 'events';
    image?: File | null;
    image_url?: string | null;
}

export interface Testimonial extends SiteContentBase {
    quote: string;
    name: string;
    role: string;
    image?: File | null;
    image_url?: string | null;
}

export interface Program extends SiteContentBase {
    title: string;
    description: string;
    icon: 'book' | 'flask' | 'palette' | 'trophy';
    image?: File | null;
    image_url?: string | null;
}

export interface CoreValue extends SiteContentBase {
    title: string;
    description: string;
    image?: File | null;
    image_url?: string | null;
}

export interface HistoryMilestone extends SiteContentBase {
    year: string;
    title: string;
    description: string;
    image?: File | null;
    image_url?: string | null;
}

export interface StudentLifeActivity extends SiteContentBase {
    name: string;
    description: string;
    category: 'clubs' | 'sports' | 'arts' | 'leadership';
    image?: File | null;
    image_url?: string | null;
}

export interface FieldTrip extends SiteContentBase {
    title: string;
    description: string;
    grade_band: string;
    image?: File | null;
    image_url?: string | null;
}

export interface WellbeingSupport extends SiteContentBase {
    title: string;
    description: string;
    image?: File | null;
    image_url?: string | null;
}

export interface AdmissionFaq extends SiteContentBase {
    question: string;
    answer: string;
    image?: File | null;
    image_url?: string | null;
}

function contentCrudAPI<T extends { id: number }>(basePath: string) {
    return {
        list: async (): Promise<T[]> => fetchAllPages<T>(basePath),
        create: (data: FormData | Partial<T>) => apiRequest<T>(basePath, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        }),
        update: (id: number, data: FormData | Partial<T>) => apiRequest<T>(`${basePath}${id}/`, {
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        }),
        remove: (id: number) => apiRequest<void>(`${basePath}${id}/`, { method: 'DELETE' }),
    };
}

export const newsArticlesAPI = contentCrudAPI<NewsArticle>('/academic/news-articles/');
export const galleryItemsAPI = contentCrudAPI<GalleryItem>('/academic/gallery-items/');
export const testimonialsAPI = contentCrudAPI<Testimonial>('/academic/testimonials/');
export const programsAPI = contentCrudAPI<Program>('/academic/programs/');
export const coreValuesAPI = contentCrudAPI<CoreValue>('/academic/core-values/');
export const historyMilestonesAPI = contentCrudAPI<HistoryMilestone>('/academic/history-milestones/');
export const studentLifeActivitiesAPI = contentCrudAPI<StudentLifeActivity>('/academic/student-life-activities/');
export const fieldTripsAPI = contentCrudAPI<FieldTrip>('/academic/field-trips/');
export const wellbeingSupportAPI = contentCrudAPI<WellbeingSupport>('/academic/wellbeing-support/');
export const admissionFaqsAPI = contentCrudAPI<AdmissionFaq>('/academic/admission-faqs/');

// Phase B report row types
export interface DayBookRow {
    date: string;
    type: 'receipt' | 'expense';
    particulars: string;
    method: string;
    reference: string;
    in: string;
    out: string;
}
export interface CashRow {
    date: string;
    particulars: string;
    reference: string;
    amount: string;
}
export interface BankRow {
    date: string;
    method: string;
    particulars: string;
    reference: string;
    amount: string;
}
export interface LedgerRow {
    date: string;
    particulars: string;
    reference: string;
    debit: string;
    credit: string;
    balance: string;
}
export interface AgingBucketRow {
    student_id: string;
    student_name: string;
    fee_name: string;
    due_date: string;
    days_overdue: number;
    balance: string;
}
export interface AgingReport {
    as_of: string;
    buckets: {
        current: AgingBucketRow[];
        '0-30': AgingBucketRow[];
        '31-60': AgingBucketRow[];
        '61-90': AgingBucketRow[];
        '90+': AgingBucketRow[];
    };
    totals: { current: string; '0-30': string; '31-60': string; '61-90': string; '90+': string };
    grand_total: string;
}
export interface TrialBalance {
    as_of: string;
    rows: { account_code: string; account_name: string; account_type: string; debit: string; credit: string }[];
    totals: { debit: string; credit: string };
    balanced: boolean;
}

// School profile (Phase A: Nepali billing identity for IRD-style receipts)
export interface SchoolProfile {
    id?: string;
    schema_name?: string;
    name: string;
    address: string;
    contact_email: string;
    contact_phone: string;
    website: string;
    established_year: number | null;
    current_academic_year: string;
    pan_number: string;
    vat_number: string;
    fiscal_year_bs: string;
    currency_code: string;
    currency_symbol: string;
    principal_name: string;
    accountant_name: string;
    bill_prefix: string;
    logo: string;
    hero_image: string;
    principal_photo: string;
}

// For "how many X are there" UI (KPI cards, badges) — reads DRF's `count`
// field off page 1 instead of walking every page just to call .length.
export async function fetchCount(endpoint: string): Promise<number> {
    const sep = endpoint.includes('?') ? '&' : '?';
    const page = await apiRequest<unknown[] | PaginatedResponse<unknown>>(`${endpoint}${sep}page_size=1`);
    if (Array.isArray(page)) return page.length;
    return typeof page?.count === 'number' ? page.count : 0;
}

async function fetchAllPages<T>(endpoint: string, options?: ApiRequestOptions): Promise<T[]> {
    const sep = endpoint.includes('?') ? '&' : '?';
    const firstPage = await apiRequest<T[] | PaginatedResponse<T>>(endpoint, options);
    if (Array.isArray(firstPage)) return firstPage;
    if (!firstPage || !Array.isArray(firstPage.results)) return [];

    const pageSize = firstPage.results.length;
    const totalCount = typeof firstPage.count === 'number' ? firstPage.count : pageSize;
    if (!firstPage.next || pageSize === 0 || totalCount <= pageSize) {
        return firstPage.results;
    }

    // Page 1 already tells us the total count and page size, so the remaining
    // pages can be requested in parallel instead of awaiting one at a time —
    // the old sequential version turned e.g. 640 rows into 32 round-trips
    // taken one after another.
    const totalPages = Math.ceil(totalCount / pageSize);
    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
            apiRequest<T[] | PaginatedResponse<T>>(`${endpoint}${sep}page=${i + 2}`, options)
        )
    );

    const all = [...firstPage.results];
    for (const pageResult of remainingPages) {
        if (Array.isArray(pageResult)) {
            all.push(...pageResult);
        } else if (pageResult && Array.isArray(pageResult.results)) {
            all.push(...pageResult.results);
        }
    }
    return all;
}

export interface Conversation {
    conversation_id: string;
    type: 'direct' | 'group';
    title?: string;
    participants: ConversationParticipant[];
    last_message?: Message;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationParticipant {
    user: string;
    user_details: {
        id: string;
        email: string;
        full_name: string;
        role: string;
    };
    joined_at: string;
    last_read_at: string;
}

export interface Message {
    message_id: string;
    conversation: string;
    sender: string;
    sender_details: {
        id: string;
        email: string;
        full_name: string;
        role: string;
    };
    content: string;
    is_system_message: boolean;
    created_at: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface TutorChatSource {
    source_type: 'lesson' | 'chapter' | 'material' | string;
    source_id: string;
    snippet: string;
}

export interface TutorChatUsage {
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
}

export interface TutorChatResponse {
    answer: string;
    sources: TutorChatSource[];
    usage: TutorChatUsage;
    // Backward-compatible aliases for existing UI calls.
    response: string;
    tokens_used: number;
    is_demo: boolean;
    error?: string;
    fallback_reason?: string;
}

export interface AtRiskStudent {
    student_id: string;
    student_name?: string;
    risk_score: number;
    reasons: string[];
    suggested_actions: string[];
    metrics?: Record<string, any>;
}

export interface LessonAiArtifact {
    summary: string;
    bullets: string[];
    key_terms: string[];
    practice_questions: string[];
}

export interface GeneratedQuizQuestion {
    question_id?: string;
    type: 'mcq';
    prompt: string;
    options: string[];
    correct_index: number;
    explanation?: string;
}

export interface GeneratedQuizResponse {
    quiz_id: string;
    questions: GeneratedQuizQuestion[];
}

export interface GradingRubric {
    id: string;
    title: string;
    criteria: any;
    total_points: number;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AIGradingDraft {
    id: string;
    submission_id: string;
    rubric_id: string;
    score: number;
    feedback: string;
    criteria_breakdown: Array<{
        criterion: string;
        points_awarded: number;
        max_points: number;
        feedback?: string;
    }>;
    status: 'draft' | 'approved' | 'rejected' | string;
    approved_by?: string | null;
    approved_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface GeneratedExamQuestion {
    type: string;
    prompt: string;
    marks: number;
    options?: string[];
}

export interface GeneratedExamSection {
    title: string;
    instructions?: string;
    marks: number;
    questions: GeneratedExamQuestion[];
}

export interface GeneratedExamPaperResponse {
    paper: {
        title: string;
        total_marks: number;
        sections: GeneratedExamSection[];
    };
    answer_key: Record<string, any>;
    marking_scheme: Record<string, any>;
}

export interface AiGeneratedArtifactRecord {
    id: string;
    artifact_type: string;
    source_type: string;
    source_id: string;
    lang: string;
    content: Record<string, any>;
    created_by?: string | null;
    created_at: string;
}

export interface Timetable {
    timetable_id: number;
    academic_year?: number | string;
    academic_year_name?: string;
    academic_class: number | string;
    academic_class_name?: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    room_number?: string | null;
    teacher: string | null;
    teacher_name?: string; // Optional expansion
    entry_type?: 'main' | 'extra';
    status?: 'pending' | 'approved' | 'rejected';
    approval_comment?: string;
    approved_at?: string | null;
    created_by?: string | null;
    created_by_name?: string;
    approved_by?: string | null;
    approved_by_name?: string;
}

export interface TimetableOverviewDay {
    day_of_week: string;
    total_slots: number;
    approved_slots: number;
    main_slots: number;
    extra_slots: number;
    slots: Timetable[];
}

export interface TimetableOverview {
    academic_class: number;
    academic_class_name: string;
    total_slots: number;
    approved_slots: number;
    pending_slots: number;
    main_slots: number;
    extra_slots: number;
    days: TimetableOverviewDay[];
    created_count?: number;
    source_class?: number;
    target_class?: number;
}

export interface Attendance {
    attendance_id: number;
    student: string;
    academic_class: string;
    subject: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    remarks?: string;
    subject_name?: string; // Correctly maps to backend
}

export interface FeeHead {
    head_id: string;
    fee_structure: string;
    name: string;
    amount: number;
    sort_order: number;
    coa_account?: string | null;
    created_at: string;
}

export interface FeeStructure {
    fee_id: string;
    tenant: string;
    name: string;
    amount: number;
    academic_class?: number | null;
    frequency: 'monthly' | 'one_time' | 'annual' | 'term';
    // Phase C: late-fee policy
    late_fee_type: 'none' | 'flat' | 'percent';
    late_fee_amount: number;
    grace_days: number;
    // Phase C: head-wise breakdown (read-only nested)
    heads?: FeeHead[];
    heads_total?: number;
    created_at: string;
}

export interface StudentFee {
    student_fee_id: string;
    tenant: string;
    student: string;
    student_name?: string;
    fee_structure: string;
    fee_name?: string;
    amount_due: number;
    amount_paid: number;
    balance?: number;
    due_date: string;
    status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
    // Phase C: late-fee surcharge tracking
    late_fee_applied?: number;
    late_fee_applied_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id?: string;
    payment_id: string;
    tenant: string;
    student: string;
    student_name?: string;
    student_fee?: string | null;
    amount: number;
    payment_date: string;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'card';
    payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'card';
    transaction_id?: string;
    recorded_by?: string;
    recorded_by_name?: string;
    remarks?: string;
}

export interface Expense {
    expense_id: string;
    tenant: string;
    title: string;
    amount: number;
    category: 'salary' | 'maintenance' | 'utilities' | 'supplies' | 'events' | 'transport' | 'other';
    date: string;
    description?: string;
    recorded_by?: string;
    recorded_by_name?: string;
    created_at: string;
}

export interface FinanceDashboard {
    total_revenue: number;
    total_pending: number;
    total_expenses: number;
    net_balance: number;
    recent_payments: Payment[];
    recent_expenses: Expense[];
}

export interface FinancialAnalytics {
    monthly_collections: Array<{ month: string; label: string; total: number }>;
    expense_by_category: Array<{ category: string; total: number; count: number }>;
    fee_status_breakdown: Array<{ status: string; count: number; total_due: number; total_paid: number }>;
    collection_rate: number;
    top_defaulters: Array<{ student_id: string; student_name: string; outstanding: number; fee_count: number }>;
}

export interface Book {
    book_id: string;
    title: string;
    author: string;
    isbn?: string;
    category: string;
    publisher?: string;
    published_year?: number;
    total_copies: number;
    available_copies: number;
    description?: string;
    cover_image?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BookIssue {
    issue_id: string;
    book: string;
    student: string;
    issued_date: string;
    due_date: string;
    return_date?: string;
    status: 'issued' | 'returned' | 'overdue';
    fine_amount: number;
    remarks?: string;
    book_title?: string;
    book_author?: string;
    student_name?: string;
}

export interface Notification {
    id: number;
    recipient: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export interface Notice {
    id?: number;
    notice_id?: number;
    title: string;
    content: string;
    category: string;
    priority: 'low' | 'normal' | 'high';
    target_audience: 'school' | 'class' | 'student';
    target_class?: string | number | null;
    target_class_name?: string;
    target_student?: string | null;
    published_date?: string;
    expiry_date?: string | null;
    attachment?: string | null;
    attachment_url?: string | null;
    is_read?: boolean;
}

export type AdmissionEnquiryStatus =
    | 'new'
    | 'contacted'
    | 'interested'
    | 'application_started'
    | 'converted'
    | 'closed';

export type AdmissionEnquirySource =
    | 'walk_in'
    | 'website'
    | 'referral'
    | 'social'
    | 'phone'
    | 'other';

export interface AdmissionEnquiry {
    id: string;
    enquiry_id: string;
    tenant?: number | string;
    first_name: string;
    last_name?: string;
    guardian_name?: string;
    email?: string | null;
    phone_number: string;
    desired_class?: number | null;
    desired_class_name?: string;
    desired_section_name?: string;
    status: AdmissionEnquiryStatus;
    source: AdmissionEnquirySource;
    notes?: string | null;
    follow_up_date?: string | null;
    converted_student?: string | null;
    converted_student_name?: string;
    handled_by?: string | null;
    handled_by_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AdmissionPipelineBucket {
    label: string;
    count: number;
}

export interface AdmissionPipeline {
    new: AdmissionPipelineBucket;
    contacted: AdmissionPipelineBucket;
    interested: AdmissionPipelineBucket;
    application_started: AdmissionPipelineBucket;
    converted: AdmissionPipelineBucket;
    closed: AdmissionPipelineBucket;
    total: number;
}

export interface SchoolERPOverview {
    academic_year: string | null;
    school: {
        tenant_id: string | null;
        tenant_name: string | null;
    };
    summary: {
        total_students: number;
        total_teachers: number;
        total_classes: number;
        total_subjects: number;
        upcoming_assessments: number;
        published_results: number;
    };
    attendance_today: {
        date: string;
        total_marked: number;
        present: number;
        absent: number;
        late: number;
    };
    admissions: {
        total_enquiries: number;
        new: number;
        contacted: number;
        interested: number;
        application_started: number;
        converted: number;
        closed: number;
    };
    finance: {
        total_revenue: number;
        total_pending: number;
        total_expenses: number;
        net_balance: number;
    };
}

// Phase 9 – Progress Report types
export interface ProgressReportMetrics {
    student_name: string;
    class_name: string;
    avg_score: number;
    subject_averages: Record<string, number>;
    strengths: string[];
    weak_subjects: string[];
    attendance_rate: number;
    sm2: {
        reviews_completed: number;
        avg_quality: number;
        avg_ease_factor: number;
        due_reviews: number;
    };
    bkt: {
        skill_gaps: Array<{ skill: string; mastery_pct: number }>;
        skill_strengths: Array<{ skill: string; mastery_pct: number }>;
        total_skills_tracked: number;
    };
    tutor: {
        conversations_this_period: number;
        questions_asked: number;
    };
    budget_used_today_pct: number;
    streak_days: number;
    focus_score: number;
    daily_goal_minutes: number;
    plan_completion_pct: number;
}

export interface ProgressReport {
    cached: boolean;
    generated_at: string;
    report: {
        report_type: 'student' | 'parent' | 'teacher';
        student_name: string;
        class_name: string;
        generated_at: string;
        metrics: ProgressReportMetrics;
        /** LLM-generated section — key varies by report_type */
        ai: Record<string, any>;
    };
}

export interface ProgressReportHistoryItem {
    report_id: string;
    report_type: 'student' | 'parent' | 'teacher';
    generated_at: string;
    is_automated: boolean;
    report: ProgressReport['report'];
}

// Auth note: tokens live in httpOnly cookies which the same-origin /api
// proxy converts into Authorization headers server-side. Client code never
// reads or attaches tokens.
export function getResolvedTenantId(): string {
    if (typeof window === 'undefined') return 'public';

    const cachedTenant = (localStorage.getItem('tenant_id') || '').trim().toLowerCase();
    if (cachedTenant && cachedTenant !== 'localhost') {
        return cachedTenant;
    }

    const subdomainTenant = (getTenantFromSubdomain(window.location.hostname) || '').trim().toLowerCase();
    if (subdomainTenant && subdomainTenant !== 'localhost') {
        return subdomainTenant;
    }

    return 'public';
}

export const DATA_MUTATED_EVENT = 'elearn:data-mutated';
const LAST_MUTATION_AT_KEY = 'elearn:last-mutation-at';
const FRESH_FETCH_WINDOW_MS = 30_000;
const ME_CACHE_WINDOW_MS = 5_000;
type ApiRequestOptions = RequestInit & {
    skipAuthRedirectOn401?: boolean;
    suppressErrorStatuses?: number[];
};

function getRequestMethod(options: RequestInit): string {
    return (options.method || 'GET').toUpperCase();
}

function isMutationMethod(method: string): boolean {
    return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function readLastMutationAt(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LAST_MUTATION_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function markMutationNow(endpoint: string, method: string): void {
    if (typeof window === 'undefined') return;
    const timestamp = Date.now();
    localStorage.setItem(LAST_MUTATION_AT_KEY, String(timestamp));
    window.dispatchEvent(
        new CustomEvent(DATA_MUTATED_EVENT, {
            detail: { endpoint, method, timestamp },
        })
    );
}

function appendFreshQuery(endpoint: string, marker: number): string {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}_fresh=${marker}`;
}

// Access tokens are short-lived (as little as 15-20 min for admin/saas_admin
// roles — see JWT_ROLE_TOKEN_LIFETIMES in backend/config/settings/base.py)
// and nothing else in this codebase refreshes them proactively, so any call
// made after that window 401s. This refreshes the httpOnly access-token
// cookie via /api/auth/refresh (which itself reads the longer-lived
// refresh-token cookie) and lets the caller retry once. Concurrent 401s
// share one in-flight refresh — the backend rotates + blacklists refresh
// tokens on use (ROTATE_REFRESH_TOKENS/BLACKLIST_AFTER_ROTATION), so firing
// one refresh per simultaneous request would make all but the first fail.
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (!refreshInFlight) {
        refreshInFlight = fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'x-tenant-id': getResolvedTenantId() },
        })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

// Mirrors services/api.ts's isAuthEndpoint guard — never attempt a refresh
// (or its retry) for calls to the auth endpoints themselves.
function isAuthEndpoint(endpoint: string): boolean {
    return endpoint.includes('/auth/') || endpoint.includes('/users/login');
}

// Generic fetch wrapper with error handling
export async function apiRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    _isRetryAfterRefresh = false
): Promise<T> {
    const {
        skipAuthRedirectOn401 = false,
        suppressErrorStatuses = [],
        ...fetchOptions
    } = options;
    const method = getRequestMethod(fetchOptions);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers as Record<string, string>,
    };

    if (fetchOptions.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    // Add tenant context header — dynamically read from localStorage so SaaS users
    // get 'public' and school users get their own tenant slug.
    const explicitTenantHeader = headers['x-tenant-id'] || headers['X-Tenant-Id'];
    if (!explicitTenantHeader) {
        headers['x-tenant-id'] = getResolvedTenantId();
    }

    try {
        let resolvedEndpoint = endpoint;
        if (method === 'GET') {
            const lastMutationAt = readLastMutationAt();
            if (lastMutationAt && (Date.now() - lastMutationAt) <= FRESH_FETCH_WINDOW_MS) {
                resolvedEndpoint = appendFreshQuery(endpoint, lastMutationAt);
            }
        }

        const response = await fetch(`${API_BASE_URL}${resolvedEndpoint}`, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            // Access token likely expired rather than the whole session —
            // refresh it once (via the longer-lived refresh-token cookie)
            // and retry before treating this as a real auth failure.
            if (
                response.status === 401 &&
                !_isRetryAfterRefresh &&
                typeof window !== 'undefined' &&
                !isAuthEndpoint(endpoint)
            ) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    return apiRequest<T>(endpoint, options, true);
                }
            }

            const errorBody = await response.text();
            let errorMessage = `API Error: ${response.statusText}`;
            let errorDetails = errorBody;

            try {
                const errorData = JSON.parse(errorBody);
                errorDetails = JSON.stringify(errorData);
                if (errorData.detail) errorMessage = errorData.detail;
                else if (typeof errorData === 'object') errorMessage = JSON.stringify(errorData);
            } catch (e) {
                console.warn("API response was not JSON", e);
            }

            const suppressErrorLog = suppressErrorStatuses.includes(response.status);
            if (!suppressErrorLog) {
                console.error('API Error Response:', response.status, errorMessage, errorDetails);
            }

            const error = new Error(errorMessage) as Error & {
                status?: number;
                details?: string;
                suppressLog?: boolean;
            };
            error.status = response.status;
            error.details = errorDetails;
            error.suppressLog = suppressErrorLog;

            if (response.status === 401 && !skipAuthRedirectOn401) {
                if (typeof window !== 'undefined') {
                    removeTokens();
                    const { pathname, hostname } = window.location;
                    const onAuthPage = pathname.startsWith('/login') || pathname.startsWith('/saas-login');
                    if (!onAuthPage) {
                        // Detect SaaS context: explicit domain check OR tenant_id stored as 'public'
                        const storedTenantId = (localStorage.getItem('tenant_id') || '').toLowerCase().trim();
                        const isSaasContext = hostname === 'manyaltech.com'
                            || hostname === 'www.manyaltech.com'
                            || storedTenantId === 'public';
                        window.location.href = isSaasContext ? '/saas-login?expired=true' : '/login?expired=true';
                    }
                }
            }

            throw error;
        }

        if (isMutationMethod(method)) {
            markMutationNow(endpoint, method);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return undefined as T;
        }

        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const suppressLog = Boolean(
            error && typeof error === 'object' && 'suppressLog' in error && error.suppressLog
        );
        if (!suppressLog) {
            console.error('API request failed:', message);
        }
        throw error;
    }
}

// Download a file via the API with the auth header attached and trigger a
// browser save. Use this instead of window.open() / <a href> for any
// authenticated PDF/Excel/ZIP endpoint — bare navigations don't carry the
// Bearer token and the backend will 401.
export async function downloadReport(path: string, filename: string): Promise<void> {
    const blob = await apiRequestBlob(path);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Fetch wrapper for Blobs (PDFs, Excel, etc.)
async function apiRequestBlob(
    endpoint: string,
    options: RequestInit = {},
    _isRetryAfterRefresh = false
): Promise<Blob> {
    const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
    };

    const explicitTenantHeader = headers['x-tenant-id'] || headers['X-Tenant-Id'];
    if (!explicitTenantHeader) {
        headers['x-tenant-id'] = getResolvedTenantId();
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (
            response.status === 401 &&
            !_isRetryAfterRefresh &&
            typeof window !== 'undefined' &&
            !isAuthEndpoint(endpoint)
        ) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return apiRequestBlob(endpoint, options, true);
            }
        }

        // Best-effort: extract a friendly message from the JSON body so the
        // caller can surface it via toast instead of saving the JSON as a file.
        let message = `Download failed (${response.status})`;
        try {
            const body = await response.text();
            try {
                const parsed = JSON.parse(body);
                message = parsed.error || parsed.detail || parsed.message || message;
            } catch {
                if (body.trim()) message = body.trim().slice(0, 200);
            }
        } catch { /* ignore */ }
        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;
        throw err;
    }

    return await response.blob();
}

// Core API
export const coreAPI = {
    getAuditLogs: async () => {
        const firstPage = await apiRequest<AuditLog[] | PaginatedResponse<AuditLog>>('/core/audit-logs/');
        if (Array.isArray(firstPage)) return firstPage;
        if (!firstPage || !Array.isArray(firstPage.results)) return [];

        const all = [...firstPage.results];
        const totalCount = typeof firstPage.count === 'number' ? firstPage.count : all.length;
        let page = 2;
        let hasMore = Boolean(firstPage.next);

        while (hasMore && all.length < totalCount) {
            const nextPage = await apiRequest<AuditLog[] | PaginatedResponse<AuditLog>>(`/core/audit-logs/?page=${page}`);
            if (Array.isArray(nextPage)) {
                all.push(...nextPage);
                break;
            }
            const batch = Array.isArray(nextPage?.results) ? nextPage.results : [];
            if (batch.length === 0) break;
            all.push(...batch);
            hasMore = Boolean(nextPage?.next);
            page += 1;
        }

        return all;
    },
    getSystemStatus: () => apiRequest<SystemStatus>('/core/system-status/'),
};

// Users API
let inFlightMeRequest: Promise<User> | null = null;
let lastMeSnapshot: { value: User; timestamp: number } | null = null;

export const usersAPI = {
    // Unauthenticated by design — used from the login failure state when a
    // school admin can't get in. Always resolves with a generic message.
    requestAdminPasswordReset: (email: string) =>
        apiRequest<{ message: string }>('/users/admin-password-reset-requests/create/', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),
    getAccounts: async (tenantId?: string) => {
        const tenantHeaders = tenantId ? { 'x-tenant-id': tenantId } : undefined;
        const firstPage = await apiRequest<User[] | PaginatedResponse<User>>('/users/accounts/', {
            headers: tenantHeaders
        });
        if (Array.isArray(firstPage)) return firstPage;
        if (!firstPage || !Array.isArray(firstPage.results)) return [];

        const all = [...firstPage.results];
        const totalCount = typeof firstPage.count === 'number' ? firstPage.count : all.length;
        let page = 2;
        let hasMore = Boolean(firstPage.next);

        while (hasMore && all.length < totalCount) {
            const nextPage = await apiRequest<User[] | PaginatedResponse<User>>(`/users/accounts/?page=${page}`, {
                headers: tenantHeaders
            });
            if (Array.isArray(nextPage)) {
                all.push(...nextPage);
                break;
            }
            const batch = Array.isArray(nextPage?.results) ? nextPage.results : [];
            if (batch.length === 0) break;
            all.push(...batch);
            hasMore = Boolean(nextPage?.next);
            page += 1;
        }

        return all;
    },
    getMe: () => {
        const now = Date.now();
        if (lastMeSnapshot && (now - lastMeSnapshot.timestamp) <= ME_CACHE_WINDOW_MS) {
            return Promise.resolve(lastMeSnapshot.value);
        }
        if (inFlightMeRequest) {
            return inFlightMeRequest;
        }

        inFlightMeRequest = apiRequest<User>('/users/accounts/me/')
            .then((user) => {
                lastMeSnapshot = { value: user, timestamp: Date.now() };
                return user;
            })
            .finally(() => {
                inFlightMeRequest = null;
            });

        return inFlightMeRequest;
    },
    getAccount: (id: string, tenantId?: string) => apiRequest<User>(`/users/accounts/${id}/`, {
        headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
    }),
    createAccount: (data: Partial<User>, tenantId?: string) => apiRequest<User>('/users/accounts/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
    }),
    updateAccount: (id: string, data: Partial<User>, tenantId?: string) => apiRequest<User>(`/users/accounts/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
    }),
    changeMyPassword: (oldPassword: string, newPassword: string) =>
        apiRequest<{ message: string }>('/users/accounts/change-password/', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        }),
    forgotPassword: (email: string) =>
        apiRequest<{ message: string }>('/users/password-reset/', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),
    confirmPasswordReset: (data: { password: string; token: string; uidb64: string }) =>
        apiRequest<{ message: string; role?: string | null }>('/users/password-reset-confirm/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    resetUserPassword: (userId: string, newPassword: string, tenantId?: string) =>
        apiRequest<{ message: string }>('/users/admin/reset-password/', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, new_password: newPassword }),
            headers: tenantId ? { 'x-tenant-id': tenantId } : undefined
        }),
    getGroups: () => apiRequest<Group[]>('/users/groups/'),
    getGroup: (id: string | number) => apiRequest<Group>(`/users/groups/${id}/`),
    createGroup: (data: Partial<Group>) => apiRequest<Group>('/users/groups/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateGroup: (id: string | number, data: Partial<Group> | { permission_ids: number[] }) =>
        apiRequest<Group>(`/users/groups/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
    deleteGroup: (id: string | number) => apiRequest<void>(`/users/groups/${id}/`, {
        method: 'DELETE'
    }),
    getPermissions: () => apiRequest<Permission[]>('/users/permissions/'),
};

// Academic API
export const academicAPI = {
    // Academic Years
    getAcademicYears: async () => {
        return fetchAllPages<AcademicYear>('/academic/years/');
    },
    getCurrentAcademicYear: () => apiRequest<AcademicYear>('/academic/years/current/'),
    getAcademicYear: (id: number) => apiRequest<AcademicYear>(`/academic/years/${id}/`),
    createAcademicYear: (data: Partial<AcademicYear>) => apiRequest<AcademicYear>('/academic/years/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAcademicYear: (id: number, data: Partial<AcademicYear>) => apiRequest<AcademicYear>(`/academic/years/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteAcademicYear: (id: number) => apiRequest<void>(`/academic/years/${id}/`, {
        method: 'DELETE'
    }),
    rolloverAcademicYear: (data: AcademicYearRolloverRequest) =>
        apiRequest<AcademicYearRolloverResponse>('/academic/years/rollover/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    previewAcademicYearRollover: (data: AcademicYearRolloverRequest) =>
        apiRequest<AcademicYearRolloverResponse>('/academic/years/rollover/', {
            method: 'POST',
            body: JSON.stringify({ ...data, dry_run: true }),
        }),
    executeAcademicYearRollover: (data: AcademicYearRolloverRequest) =>
        apiRequest<AcademicYearRolloverResponse>('/academic/years/rollover/', {
            method: 'POST',
            body: JSON.stringify({ ...data, confirm: true, dry_run: false }),
        }),

    // Nepal-standard examination and result processing
    getGradingProfiles: async () => fetchAllPages<NepalGradingProfile>('/academic/grading-profiles/'),
    ensureNepal2081Profile: () => apiRequest<NepalGradingProfile>('/academic/grading-profiles/ensure-nepal-2081/', { method: 'POST' }),
    getExamTerms: async () => fetchAllPages<ExamTerm>('/academic/exam-terms/'),
    createExamTerm: (data: Partial<ExamTerm>) => apiRequest<ExamTerm>('/academic/exam-terms/', { method: 'POST', body: JSON.stringify(data) }),
    getExamTermReadiness: (id: string) => apiRequest<{ ready: boolean; subjects: Array<{ id: string; name: string; status: string; papers: number; marks: number }> }>(`/academic/exam-terms/${id}/readiness/`),
    publishExamTerm: (id: string) => apiRequest<{ detail: string; student_count: number }>(`/academic/exam-terms/${id}/publish/`, { method: 'POST' }),
    getExamSubjects: async (termId?: string) => fetchAllPages<ExamSubjectConfiguration>(`/academic/exam-subjects/${termId ? `?term=${encodeURIComponent(termId)}` : ''}`),
    createExamSubject: (data: Partial<ExamSubjectConfiguration>) => apiRequest<ExamSubjectConfiguration>('/academic/exam-subjects/', { method: 'POST', body: JSON.stringify(data) }),
    generateAnswerPaperCodes: (id: string) => apiRequest<{ generated: Array<{ paper_id: string; student_id: string; student_name: string; code: string }>; warning: string }>(`/academic/exam-subjects/${id}/generate-codes/`, { method: 'POST' }),
    submitExamMarks: (id: string) => apiRequest<ExamSubjectConfiguration>(`/academic/exam-subjects/${id}/submit-marks/`, { method: 'POST' }),
    verifyExamMarks: (id: string) => apiRequest<ExamSubjectConfiguration>(`/academic/exam-subjects/${id}/verify/`, { method: 'POST' }),
    reopenExamMarks: (id: string, reason: string) => apiRequest<ExamSubjectConfiguration>(`/academic/exam-subjects/${id}/reopen/`, { method: 'POST', body: JSON.stringify({ reason }) }),
    enterCodedMarks: (data: { code: string; theory_marks?: number; internal_marks?: number; practical_marks?: number; attendance_status?: string; examiner_remarks?: string; version?: number; reason?: string }) =>
        apiRequest<{ entry: { entry_id: string; version: number }; calculated: { grade: string; grade_point: number; status: string; percentage: number } }>('/academic/answer-papers/enter-marks/', { method: 'POST', body: JSON.stringify(data) }),
    getTermResults: async () => fetchAllPages<StudentTermResult>('/academic/term-results/'),
    downloadTermMarksheet: (id: string, number: string) => downloadReport(`/academic/term-results/${id}/marksheet/`, `marksheet-${number}.pdf`),

    // Classes
    getClasses: async () => {
        return fetchAllPages<AcademicClass>('/academic/classes/');
    },
    getClass: (id: number) => apiRequest<AcademicClass>(`/academic/classes/${id}/`),
    createClass: (data: Partial<AcademicClass>) => apiRequest<AcademicClass>('/academic/classes/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateClass: (id: number, data: Partial<AcademicClass>) => apiRequest<AcademicClass>(`/academic/classes/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteClass: (id: number) => apiRequest<void>(`/academic/classes/${id}/`, {
        method: 'DELETE'
    }),

    // Sections
    createSection: (data: Partial<Section> & { academic_class: number }) => apiRequest<Section>('/academic/sections/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteSection: (id: number) => apiRequest<void>(`/academic/sections/${id}/`, {
        method: 'DELETE'
    }),

    // Subjects
    getSubjects: async () => {
        return fetchAllPages<Subject>('/academic/subjects/');
    },
    getSubject: (id: number) => apiRequest<Subject>(`/academic/subjects/${id}/`),
    createSubject: (data: Partial<Subject> & { academic_class: number }) => apiRequest<Subject>('/academic/subjects/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateSubject: (id: number, data: Partial<Subject>) => apiRequest<Subject>(`/academic/subjects/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteSubject: (id: number) => apiRequest<void>(`/academic/subjects/${id}/`, {
        method: 'DELETE'
    }),

    // Reports
    getAttendanceSummaryPdf: (sectionId: number, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `${API_BASE_URL}/academic/reports/attendance-summary/${sectionId}?${params.toString()}`;
    },

    // Assessments
    getAssessments: async () => {
        return fetchAllPages<Assessment>('/academic/assessments/');
    },
    getAssessment: (id: string) => apiRequest<Assessment>(`/academic/assessments/${id}/`),
    createAssessment: (data: Partial<Assessment>) => apiRequest<Assessment>('/academic/assessments/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAssessment: (id: string, data: Partial<Assessment>) => apiRequest<Assessment>(`/academic/assessments/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    publishAssessmentResults: (
        id: string,
        data?: {
            publish?: boolean;
            auto_upgrade_students?: boolean;
            promotion_rules?: {
                min_score_percentage?: number;
                min_attendance_percentage?: number;
                manual_promote_student_ids?: string[];
                manual_hold_student_ids?: string[];
            };
        }
    ) =>
        apiRequest<PublishAssessmentResultsResponse>(`/academic/assessments/${id}/publish_results/`, {
            method: 'POST',
            body: JSON.stringify(data || {}),
        }),
    reopenAssessmentResults: (
        id: string,
        data: {
            reason: string;
            academic_year?: number | string;
        }
    ) => {
        const query = new URLSearchParams();
        if (data.academic_year !== undefined && data.academic_year !== '') {
            query.set('academic_year', String(data.academic_year));
        }
        const payload = { ...data };
        delete (payload as { academic_year?: number | string }).academic_year;
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiRequest<ReopenAssessmentResultsResponse>(
            `/academic/assessments/${id}/reopen_results/${suffix}`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        );
    },
    getPromotionExceptions: (
        id: string,
        params?: {
            academic_year?: number | string;
            min_score_percentage?: number;
            min_attendance_percentage?: number;
            class?: number | string;
            section?: number | string;
            fail_reason?: string;
        }
    ) => {
        const query = new URLSearchParams();
        if (params?.academic_year !== undefined && params?.academic_year !== '') {
            query.set('academic_year', String(params.academic_year));
        }
        if (params?.min_score_percentage !== undefined) {
            query.set('min_score_percentage', String(params.min_score_percentage));
        }
        if (params?.min_attendance_percentage !== undefined) {
            query.set('min_attendance_percentage', String(params.min_attendance_percentage));
        }
        if (params?.class !== undefined && params?.class !== '') {
            query.set('class', String(params.class));
        }
        if (params?.section !== undefined && params?.section !== '') {
            query.set('section', String(params.section));
        }
        if (params?.fail_reason) {
            query.set('fail_reason', params.fail_reason);
        }
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiRequest<PromotionExceptionsResponse>(
            `/academic/assessments/${id}/promotion_exceptions/${suffix}`
        );
    },
    decidePromotionException: (
        id: string,
        data: {
            student_id: string;
            action: PromotionExceptionAction;
            decision_reason: string;
            academic_year?: number | string;
            min_score_percentage?: number;
            min_attendance_percentage?: number;
        }
    ) => {
        const query = new URLSearchParams();
        if (data.academic_year !== undefined && data.academic_year !== '') {
            query.set('academic_year', String(data.academic_year));
        }
        const payload = { ...data };
        delete (payload as { academic_year?: number | string }).academic_year;
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiRequest<PromotionExceptionSingleDecisionResponse>(
            `/academic/assessments/${id}/promotion_exceptions/decide/${suffix}`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        );
    },
    bulkPromotionExceptions: (
        id: string,
        data: {
            action: PromotionExceptionAction;
            decision_reason: string;
            academic_year?: number | string;
            class?: number | string;
            section?: number | string;
            fail_reason?: string;
            min_score_percentage?: number;
            min_attendance_percentage?: number;
        }
    ) => {
        const query = new URLSearchParams();
        if (data.academic_year !== undefined && data.academic_year !== '') {
            query.set('academic_year', String(data.academic_year));
        }
        const payload = { ...data };
        delete (payload as { academic_year?: number | string }).academic_year;
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiRequest<PromotionExceptionBulkDecisionResponse>(
            `/academic/assessments/${id}/promotion_exceptions/bulk/${suffix}`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            }
        );
    },
    deleteAssessment: (id: string) => apiRequest<void>(`/academic/assessments/${id}/`, {
        method: 'DELETE'
    }),
    getAttendanceSummaryExcel: (sectionId: number, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `/api/academic/reports/attendance-summary-excel/${sectionId}/?${params.toString()}`;
    },
    getStudentPerformancePdf: (studentId: string) => `/api/academic/reports/student-performance/${studentId}/`,
    getStudentPerformanceExcel: (studentId: string) => `/api/academic/reports/student-performance-excel/${studentId}/`,



    // Attendance
    getAttendance: async () => {
        return fetchAllPages<Attendance>('/academic/attendance/');
    },
    getMyAttendance: async () => {
        const payload = await apiRequest<Attendance[] | PaginatedResponse<Attendance>>('/academic/attendance/my_attendance/');
        return normalizeArrayPayload(payload);
    },
    getAttendanceTrend: (params?: { days?: number; sectionId?: number }) => {
        const q = new URLSearchParams();
        if (params?.days) q.set('days', String(params.days));
        if (params?.sectionId) q.set('section_id', String(params.sectionId));
        const qs = q.toString();
        return apiRequest<Array<{ date: string; rate: number }>>(`/academic/attendance/trend/${qs ? `?${qs}` : ''}`);
    },
    createAttendance: (data: Partial<Attendance>) => apiRequest<Attendance>('/academic/attendance/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAttendance: (id: number, data: Partial<Attendance>) => apiRequest<Attendance>(`/academic/attendance/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),

    // Timetable
    getTimetable: async (params?: {
        academic_class?: number | string;
        day_of_week?: string;
        status?: 'pending' | 'approved' | 'rejected';
        entry_type?: 'main' | 'extra';
    }) => {
        const search = new URLSearchParams();
        if (params?.academic_class !== undefined && params?.academic_class !== null && params?.academic_class !== '') {
            search.set('academic_class', String(params.academic_class));
        }
        if (params?.day_of_week) search.set('day_of_week', params.day_of_week);
        if (params?.status) search.set('status', params.status);
        if (params?.entry_type) search.set('entry_type', params.entry_type);
        const query = search.toString();
        const endpoint = `/academic/timetable/${query ? `?${query}` : ''}`;
        return fetchAllPages<Timetable>(endpoint);
    },
    getMyTimetable: async () => {
        const payload = await apiRequest<Timetable[] | PaginatedResponse<Timetable>>('/academic/timetable/my_timetable/');
        return normalizeArrayPayload(payload);
    },
    getTimetableOverview: (academicClass: number | string) =>
        apiRequest<TimetableOverview>(`/academic/timetable/overview/?academic_class=${encodeURIComponent(String(academicClass))}`),
    getMyTimetableRequests: async () => {
        const payload = await apiRequest<Timetable[] | PaginatedResponse<Timetable>>('/academic/timetable/my_requests/');
        return normalizeArrayPayload(payload);
    },
    getPendingTimetableRequests: async () => {
        const payload = await apiRequest<Timetable[] | PaginatedResponse<Timetable>>('/academic/timetable/pending_requests/');
        return normalizeArrayPayload(payload);
    },
    approveTimetableRequest: (
        id: number,
        data: { status: 'approved' | 'rejected'; approval_comment?: string }
    ) =>
        apiRequest<Timetable>(`/academic/timetable/${id}/approve/`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    createTimetable: (data: Partial<Timetable>) => apiRequest<Timetable>('/academic/timetable/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    bulkReplaceMainTimetable: (
        academicClass: number | string,
        slots: Array<{
            day_of_week: string;
            start_time: string;
            end_time: string;
            subject_name: string;
            room_number?: string | null;
            teacher?: string | null;
        }>,
        overwriteExisting = true,
    ) =>
        apiRequest<TimetableOverview>('/academic/timetable/bulk_replace_main/', {
            method: 'POST',
            body: JSON.stringify({
                academic_class: academicClass,
                slots,
                overwrite_existing: overwriteExisting,
            }),
        }),
    cloneMainTimetable: (
        sourceClass: number | string,
        targetClass: number | string,
        overwriteExisting = true,
    ) =>
        apiRequest<TimetableOverview>('/academic/timetable/clone_main/', {
            method: 'POST',
            body: JSON.stringify({
                source_class: sourceClass,
                target_class: targetClass,
                overwrite_existing: overwriteExisting,
            }),
        }),
    updateTimetable: (id: number, data: Partial<Timetable>) => apiRequest<Timetable>(`/academic/timetable/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteTimetable: (id: number) => apiRequest<void>(`/academic/timetable/${id}/`, {
        method: 'DELETE'
    }),

    // Teachers
    getTeachers: async () => {
        return fetchAllPages<Teacher>('/academic/teachers/');
    },
    getTeacher: (id: string) => apiRequest<Teacher>(`/academic/teachers/${id}/`),
    getMyTeacherProfile: () => apiRequest<Teacher>('/academic/teachers/me/'),
    getTeacherProfileOverview: (id: string) =>
        apiRequest<TeacherProfileOverview>(`/academic/teachers/${id}/profile-overview/`),
    createTeacher: (data: Partial<Teacher> & { password?: string }) => apiRequest<Teacher>('/academic/teachers/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTeacher: (id: string, data: Partial<Teacher>) => apiRequest<Teacher>(`/academic/teachers/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    assignTeacherClasses: (id: string, classIds: number[], mode: 'set' | 'add' | 'remove' = 'set') =>
        apiRequest<{ teacher_id: string; assigned_classes: number[] }>(`/academic/teachers/${id}/assign-classes/`, {
            method: 'POST',
            body: JSON.stringify({ class_ids: classIds, mode }),
        }),

    // Stats
    getStats: () => apiRequest<{
        total_teachers: number;
        total_students: number;
        total_classes: number;
        total_subjects: number;
    }>('/academic/stats/'),
    getERPOverview: () => apiRequest<SchoolERPOverview>('/academic/erp/overview/'),

    // Students
    getStudents: async (params?: { section_id?: string }) => {
        const query = params?.section_id ? `?section=${params.section_id}` : '';
        return fetchAllPages<Student>(`/academic/students/${query}`);
    },
    getStudent: (id: string) => apiRequest<Student>(`/academic/students/${id}/`),
    getStudentProfileOverview: (id: string) => apiRequest<StudentProfileOverview>(`/academic/students/${id}/profile-overview/`),
    getMyStudent: () => apiRequest<Student>('/academic/students/me/'),
    createStudent: (data: Partial<Student>) => apiRequest<Student>('/academic/students/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    importStudents: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiRequest<{
            success: boolean;
            results: { created: number; failed: number; errors: any[] }
        }>('/academic/students/import_data/', {
            method: 'POST',
            body: formData,
        });
    },
    updateStudent: (id: string, data: Partial<Student>) => apiRequest<Student>(`/academic/students/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteStudent: (id: string) => apiRequest<void>(`/academic/students/${id}/`, {
        method: 'DELETE'
    }),
    repairStudentUser: (id: string, data: { email: string; password: string; first_name?: string; last_name?: string }) =>
        apiRequest<{ detail: string; student: Student }>(`/academic/students/${id}/repair_user/`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Admissions
    getAdmissions: async (params?: {
        status?: AdmissionEnquiryStatus | 'all';
        source?: AdmissionEnquirySource | 'all';
        desired_class?: number | string;
        q?: string;
    }) => {
        const search = new URLSearchParams();
        if (params?.status && params.status !== 'all') search.set('status', params.status);
        if (params?.source && params.source !== 'all') search.set('source', params.source);
        if (params?.desired_class !== undefined && params?.desired_class !== null && params?.desired_class !== '') {
            search.set('desired_class', String(params.desired_class));
        }
        if (params?.q) search.set('q', params.q);

        const query = search.toString();
        const endpoint = `/academic/admissions/${query ? `?${query}` : ''}`;
        return fetchAllPages<AdmissionEnquiry>(endpoint);
    },
    getAdmission: (id: string) => apiRequest<AdmissionEnquiry>(`/academic/admissions/${id}/`),
    createAdmission: (data: Partial<AdmissionEnquiry>) => apiRequest<AdmissionEnquiry>('/academic/admissions/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateAdmission: (id: string, data: Partial<AdmissionEnquiry>) => apiRequest<AdmissionEnquiry>(`/academic/admissions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteAdmission: (id: string) => apiRequest<void>(`/academic/admissions/${id}/`, {
        method: 'DELETE',
    }),
    getAdmissionsPipeline: () => apiRequest<AdmissionPipeline>('/academic/admissions/pipeline/'),
    convertAdmissionToStudent: (
        id: string,
        data: {
            email?: string;
            password?: string;
            first_name?: string;
            last_name?: string;
            phone_number?: string;
            academic_class: number | string;
            section?: number | string;
            username?: string;
        }
    ) =>
        apiRequest<{ detail: string; student_id: string; enquiry: AdmissionEnquiry }>(
            `/academic/admissions/${id}/convert_to_student/`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        ),

    // Chapters
    getChapters: async (subjectId?: number) => {
        const query = subjectId ? `?subject=${subjectId}` : '';
        const chapters = await fetchAllPages<Chapter>(`/academic/chapters/${query}`);
        return chapters.map((chapter) => ({
            ...chapter,
            lessons: Array.isArray(chapter.lessons) ? chapter.lessons : [],
        }));
    },
    getChapter: (id: number) => apiRequest<Chapter>(`/academic/chapters/${id}/`),
    createChapter: (data: Partial<Chapter>) => apiRequest<Chapter>('/academic/chapters/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateChapter: (id: number, data: Partial<Chapter>) => apiRequest<Chapter>(`/academic/chapters/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteChapter: (id: number) => apiRequest<void>(`/academic/chapters/${id}/`, {
        method: 'DELETE'
    }),
    reorderChapters: (orders: { id: number; order: number }[]) => apiRequest<{ status: string }>('/academic/chapters/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),

    // Lessons
    getLessons: async (chapterId?: number, subjectId?: number) => {
        const params = new URLSearchParams();
        if (chapterId) params.append('chapter', chapterId.toString());
        if (subjectId) params.append('subject', subjectId.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchAllPages<Lesson>(`/academic/lessons/${query}`);
    },
    getLesson: (id: number) => apiRequest<Lesson>(`/academic/lessons/${id}/`),
    createLesson: (data: Partial<Lesson>) => apiRequest<Lesson>('/academic/lessons/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateLesson: (id: number, data: Partial<Lesson>) => apiRequest<Lesson>(`/academic/lessons/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteLesson: (id: number) => apiRequest<void>(`/academic/lessons/${id}/`, {
        method: 'DELETE'
    }),
    reorderLessons: (orders: { id: number; order: number }[]) => apiRequest<{ status: string }>('/academic/lessons/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),
    toggleLessonProgress: (id: number) => apiRequest<{
        completed: boolean;
        progress_percent?: number;
        user_progress?: LessonProgress;
    }>(`/academic/lessons/${id}/toggle_progress/`, {
        method: 'POST'
    }),
    updateLessonProgress: (
        id: number,
        data: { watched_seconds?: number; duration_seconds?: number; progress_percent?: number }
    ) => apiRequest<{
        completed: boolean;
        progress_percent: number;
        user_progress: LessonProgress;
    }>(`/academic/lessons/${id}/update_progress/`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    // Lesson Materials
    getMaterials: async (lessonId?: number) => {
        const query = lessonId ? `?lesson=${lessonId}` : '';
        return fetchAllPages<LessonMaterial>(`/academic/materials/${query}`);
    },
    createMaterial: (data: FormData) => apiRequest<LessonMaterial>('/academic/materials/', {
        method: 'POST',
        body: data // Use FormData for file uploads
    }),
    deleteMaterial: (id: number) => apiRequest<void>(`/academic/materials/${id}/`, {
        method: 'DELETE'
    }),

    // Assessments

    getGradebook: (subjectId: number, sectionId?: number) => {
        const q = sectionId ? `&section=${sectionId}` : '';
        return apiRequest<GradebookData>(`/academic/assessments/gradebook/?subject=${subjectId}${q}`);
    },


    // Results
    getResults: async (studentId?: string) => {
        const query = studentId ? `?student_id=${studentId}` : '';
        return fetchAllPages<Result>(`/academic/results/${query}`);
    },
    getResult: (id: string) => apiRequest<Result>(`/academic/results/${id}/`),
    createResult: (data: Partial<Result>) => apiRequest<Result>('/academic/results/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateResult: (id: string, data: Partial<Result>) => apiRequest<Result>(`/academic/results/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    generateAIFeedback: (id: string) => apiRequest<{ ai_feedback: string }>(`/academic/results/${id}/generate_ai_feedback/`, {
        method: 'POST'
    }),

    // Submissions
    getSubmissions: async (assessmentId?: string) => {
        const query = assessmentId ? `?assessment=${assessmentId}` : '';
        return fetchAllPages<Submission>(`/academic/submissions/${query}`);
    },
    getSubmission: (id: string) => apiRequest<Submission>(`/academic/submissions/${id}/`),
    createSubmission: (data: Partial<Submission>) => apiRequest<Submission>('/academic/submissions/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateSubmission: (id: string, data: Partial<Submission>) => apiRequest<Submission>(`/academic/submissions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    gradeSubmission: (id: string, data: Record<string, unknown>) =>
        apiRequest<GradeResult>(`/academic/submissions/${id}/grade/`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    triggerAIGrading: (id: string) =>
        apiRequest<any>(`/academic/submissions/${id}/ai_grade/`, {
            method: 'POST'
        }),
    submitExam: (assessmentId: string, answers: any, timeTaken: number) => apiRequest<{ score: number; max_score: number; result_id: string }>('/academic/submissions/submit_exam/', {
        method: 'POST',
        body: JSON.stringify({ assessment: assessmentId, answers, time_taken: timeTaken })
    }),

    // Questions
    getQuestions: async () => {
        return fetchAllPages<Question>('/academic/questions/');
    },
    getQuestionsByAssessment: (assessmentId: string) => {
        return fetchAllPages<Question>(`/academic/questions/?assessment=${assessmentId}`);
    },
    createQuestion: (data: Partial<Question>) => apiRequest<Question>('/academic/questions/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateQuestion: (id: string, data: Partial<Question>) => apiRequest<Question>(`/academic/questions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteQuestion: (id: string) => apiRequest<void>(`/academic/questions/${id}/`, {
        method: 'DELETE'
    }),
    reorderQuestions: (orders: { id: string; order: number }[]) => apiRequest<{ status: string }>('/academic/questions/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),

    // Parent Profiles
    getMyParent: () => apiRequest<Parent>('/academic/parents/me/'),
    getChildAttendance: (studentId: string, month?: number, year?: number) => {
        const params = new URLSearchParams();
        if (month) params.set('month', String(month));
        if (year) params.set('year', String(year));
        const q = params.toString() ? `?${params}` : '';
        return apiRequest<{ records: any[]; summary: any }>(`/academic/parents/child/${studentId}/attendance/${q}`);
    },
    getChildResults: (studentId: string) =>
        apiRequest<any[]>(`/academic/parents/child/${studentId}/results/`),
    getChildFees: (studentId: string) =>
        apiRequest<{ fees: any[]; payments: any[]; summary: any }>(`/academic/parents/child/${studentId}/fees/`),

    // Parent-Teacher Meetings
    getMeetings: () => apiRequest<any[]>('/academic/parent-meetings/'),
    requestMeeting: (data: { student: string; teacher: string; requested_date: string; preferred_slot: string; purpose: string }) =>
        apiRequest<any>('/academic/parent-meetings/', { method: 'POST', body: JSON.stringify(data) }),
    cancelMeeting: (id: string, reason?: string) =>
        apiRequest<any>(`/academic/parent-meetings/${id}/cancel/`, { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) }),

    // Notices
    getNotices: async () => {
        return fetchAllPages<Notice>('/academic/notices/');
    },
    getNotice: (id: number) => apiRequest<Notice>(`/academic/notices/${id}/`),
    createNotice: (data: Partial<Notice>) => apiRequest<Notice>('/academic/notices/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateNotice: (id: number, data: Partial<Notice>) => apiRequest<Notice>(`/academic/notices/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteNotice: (id: number, data?: Partial<Notice>) => apiRequest<void>(`/academic/notices/${id}/`, {
        method: 'DELETE'
    }),
    markNoticeRead: (id: number) =>
        apiRequest<{ status: string; is_read: boolean }>(`/academic/notices/${id}/mark-read/`, {
            method: 'POST',
        }),
    getUnreadNoticeCount: () =>
        apiRequest<{ count: number }>(`/academic/notices/unread-count/`),

    // Exams
    getExams: async () => {
        return fetchAllPages<Exam>('/academic/exams/');
    },
    getExam: (id: string) => apiRequest<Exam>(`/academic/exams/${id}/`),
    createExam: (data: Partial<Exam>) => apiRequest<Exam>('/academic/exams/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExam: (id: string, data: Partial<Exam>) => apiRequest<Exam>(`/academic/exams/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteExam: (id: string) => apiRequest<void>(`/academic/exams/${id}/`, {
        method: 'DELETE'
    }),
    generateHallTickets: (id: string) => apiRequest<{ message: string }>(`/academic/exams/${id}/generate_hall_tickets/`, {
        method: 'POST'
    }),
    getExamSeating: async (studentId?: string) => {
        const query = studentId ? `?student=${studentId}` : '';
        return fetchAllPages<ExamSeating>(`/academic/exam-seating/${query}`);
    },
};

// Billing API
export const billingAPI = {
    getSubscriptions: () => apiRequest<Subscription[]>(`${BILLING_SAAS_BASE}/subscriptions/`),
    getSubscription: (id: string) => apiRequest<Subscription>(`${BILLING_SAAS_BASE}/subscriptions/${id}/`),
    getSubscriptionHistory: (id: string) => apiRequest<SubscriptionPlanHistory[] | PaginatedResponse<SubscriptionPlanHistory>>(`${BILLING_SAAS_BASE}/subscriptions/${id}/history/`),

    // Finance Management
    getFeeStructures: () => fetchAllPages<FeeStructure>(`${BILLING_SCHOOL_BASE}/fee-structures/`),

    // Fee heads (Phase C) — line items under a fee structure.
    getFeeHeads: (structureId: string) =>
        fetchAllPages<FeeHead>(`${BILLING_SCHOOL_BASE}/fee-heads/?fee_structure=${structureId}`),
    createFeeHead: (data: Partial<FeeHead>) =>
        apiRequest<FeeHead>(`${BILLING_SCHOOL_BASE}/fee-heads/`, {
            method: 'POST', body: JSON.stringify(data),
        }),
    updateFeeHead: (id: string, data: Partial<FeeHead>) =>
        apiRequest<FeeHead>(`${BILLING_SCHOOL_BASE}/fee-heads/${id}/`, {
            method: 'PATCH', body: JSON.stringify(data),
        }),
    deleteFeeHead: (id: string) =>
        apiRequest<void>(`${BILLING_SCHOOL_BASE}/fee-heads/${id}/`, { method: 'DELETE' }),
    createFeeStructure: (data: Partial<FeeStructure>) => apiRequest<FeeStructure>(`${BILLING_SCHOOL_BASE}/fee-structures/`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateFeeStructure: (id: string, data: Partial<FeeStructure>) => apiRequest<FeeStructure>(`${BILLING_SCHOOL_BASE}/fee-structures/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteFeeStructure: (id: string) => apiRequest<void>(`${BILLING_SCHOOL_BASE}/fee-structures/${id}/`, {
        method: 'DELETE'
    }),

    getStudentFees: () => fetchAllPages<StudentFee>(`${BILLING_SCHOOL_BASE}/student-fees/`),
    updateStudentFee: (id: string, data: Partial<StudentFee>) => apiRequest<StudentFee>(`${BILLING_SCHOOL_BASE}/student-fees/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    getMyFees: () => apiRequest<{ fees: StudentFee[]; payments: Payment[]; summary: { total_due: number; total_paid: number; outstanding: number } }>(`${BILLING_SCHOOL_BASE}/student-fees/my_fees/`),
    sendInvoice: (id: string) => apiRequest<{ status: string }>(`${BILLING_SCHOOL_BASE}/student-fees/${id}/send_invoice/`, { method: 'POST' }),
    assignBulkFees: (data: { fee_structure_id: string; academic_class_id: string; due_date: string }) =>
        apiRequest<{ message: string }>(`${BILLING_SCHOOL_BASE}/student-fees/assign_bulk/`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // Phase D: bulk monthly billing — multiple classes × multiple fee structures.
    bulkAssignMulti: (data: { class_ids: (string | number)[]; fee_structure_ids: string[]; due_date: string; skip_existing?: boolean }) =>
        apiRequest<{
            created: number;
            skipped: number;
            student_count: number;
            summary: { fee_structure_id: string; fee_structure_name: string; created: number; skipped: number }[];
            created_fee_ids: string[];
        }>(`${BILLING_SCHOOL_BASE}/student-fees/bulk-assign-multi/`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    generateBill: (studentFeeId: string) =>
        downloadReport(
            `${BILLING_SCHOOL_BASE}/student-fees/${studentFeeId}/generate-bill/`,
            `bill_${studentFeeId.slice(0, 8)}.pdf`,
        ),

    bulkBillsPdf: async (studentFeeIds: string[]) => {
        const blob = await apiRequestBlob(`${BILLING_SCHOOL_BASE}/student-fees/bulk-bills-pdf/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_fee_ids: studentFeeIds }),
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bills_${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    getPayments: () => fetchAllPages<Payment>(`${BILLING_SCHOOL_BASE}/payments/`),
    recordPayment: (data: Partial<Payment>) => apiRequest<Payment>(`${BILLING_SCHOOL_BASE}/payments/`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    getExpenses: () => fetchAllPages<Expense>(`${BILLING_SCHOOL_BASE}/expenses/`),

    // Phase B reports — JSON only; frontend renders + offers print.
    dayBook: (from: string, to: string) =>
        apiRequest<{ from: string; to: string; rows: DayBookRow[]; totals: { in: string; out: string; net: string } }>(
            `${BILLING_SCHOOL_BASE}/reports/day-book/?from=${from}&to=${to}`,
        ),
    cashBook: (from: string, to: string) =>
        apiRequest<{ from: string; to: string; rows: CashRow[]; total: string }>(
            `${BILLING_SCHOOL_BASE}/reports/cash-book/?from=${from}&to=${to}`,
        ),
    bankBook: (from: string, to: string) =>
        apiRequest<{ from: string; to: string; rows: BankRow[]; total: string }>(
            `${BILLING_SCHOOL_BASE}/reports/bank-book/?from=${from}&to=${to}`,
        ),
    studentLedger: (studentId: string) =>
        apiRequest<{ student: { id: string; name: string; class: string }; rows: LedgerRow[]; totals: { debit: string; credit: string; balance: string } }>(
            `${BILLING_SCHOOL_BASE}/reports/student-ledger/?student=${studentId}`,
        ),
    aging: (asOf?: string) =>
        apiRequest<AgingReport>(
            `${BILLING_SCHOOL_BASE}/reports/aging/${asOf ? `?to=${asOf}` : ''}`,
        ),
    trialBalance: (asOf?: string) =>
        apiRequest<TrialBalance>(
            `${BILLING_SCHOOL_BASE}/reports/trial-balance/${asOf ? `?to=${asOf}` : ''}`,
        ),
    scholarshipRegister: (fy?: string) =>
        apiRequest<ScholarshipRegister>(
            `${BILLING_SCHOOL_BASE}/reports/scholarship-register/${fy ? `?fy=${encodeURIComponent(fy)}` : ''}`,
        ),
    scholarshipRegisterPdf: (fy?: string) =>
        downloadReport(
            `${BILLING_SCHOOL_BASE}/reports/scholarship-register-pdf/${fy ? `?fy=${encodeURIComponent(fy)}` : ''}`,
            `scholarship_register_${fy || 'all'}.pdf`,
        ),
    createExpense: (data: Partial<Expense>) => apiRequest<Expense>(`${BILLING_SCHOOL_BASE}/expenses/`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExpense: (id: string, data: Partial<Expense>) => apiRequest<Expense>(`${BILLING_SCHOOL_BASE}/expenses/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteExpense: (id: string) => apiRequest<void>(`${BILLING_SCHOOL_BASE}/expenses/${id}/`, {
        method: 'DELETE'
    }),

    getFinanceDashboard: (startDate?: string, endDate?: string) => {
        const q = new URLSearchParams();
        if (startDate) q.append('start_date', startDate);
        if (endDate) q.append('end_date', endDate);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return apiRequest<FinanceDashboard>(`${BILLING_SCHOOL_BASE}/dashboard/${qs}`);
    },

    getFinancialAnalytics: () => apiRequest<FinancialAnalytics>(`${BILLING_SCHOOL_BASE}/dashboard/analytics/`),

    downloadReceipt: (paymentId: string) =>
        downloadReport(
            `${BILLING_SCHOOL_BASE}/payments/${paymentId}/generate_receipt/`,
            `receipt_${paymentId.slice(0, 8)}.pdf`,
        ),
};


// Library API
export const libraryAPI = {
    // Books
    getBooks: async () => {
        return fetchAllPages<Book>('/library/books/');
    },
    getBook: (id: string) => apiRequest<Book>(`/library/books/${id}/`),
    createBook: (data: Partial<Book>) => apiRequest<Book>('/library/books/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateBook: (id: string, data: Partial<Book>) => apiRequest<Book>(`/library/books/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteBook: (id: string) => apiRequest<void>(`/library/books/${id}/`, {
        method: 'DELETE'
    }),

    // Book Issues
    getBookIssues: async () => {
        return fetchAllPages<BookIssue>('/library/issues/');
    },
    getBookIssue: (id: string) => apiRequest<BookIssue>(`/library/issues/${id}/`),
    issueBook: (data: { book: string; student: string }) => apiRequest<BookIssue>('/library/issues/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    returnBook: (id: string) => apiRequest<BookIssue>(`/library/issues/${id}/return_book/`, {
        method: 'POST'
    }),
};

// AI Engine API
export const aiAPI = {
    chat: async (
        message: string,
        studentId: string,
        conversationHistory: ChatMessage[],
        context?: { lesson_id?: string | number; chapter_id?: string | number }
    ) => {
        const payload = await apiRequest<{
            answer?: string;
            response?: string;
            sources?: TutorChatSource[];
            usage?: Partial<TutorChatUsage>;
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
            })
        });

        const answer = String(payload.answer ?? payload.response ?? '');
        const sources = Array.isArray(payload.sources) ? payload.sources : [];
        const promptTokens = Number(payload.usage?.prompt_tokens ?? 0);
        const completionTokens = Number(payload.usage?.completion_tokens ?? 0);
        const model = String(payload.usage?.model ?? 'fallback');
        const totalTokens = Number(payload.tokens_used ?? (promptTokens + completionTokens));
        const isDemo = Boolean(payload.is_demo);

        return {
            answer,
            sources,
            usage: {
                model,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
            },
            // Backward-compatible fields:
            response: answer,
            tokens_used: totalTokens,
            is_demo: isDemo,
            error: payload.error,
            fallback_reason: payload.fallback_reason,
        } as TutorChatResponse;
    },
    summarizeLesson: (lessonId: number, lang: 'en' | 'ne' = 'en') =>
        apiRequest<LessonAiArtifact>(`/ai/lessons/${lessonId}/summarize/?lang=${lang}`, {
            method: 'POST',
        }),
    lessonExamNotes: (lessonId: number, lang: 'en' | 'ne' = 'en') =>
        apiRequest<LessonAiArtifact>(`/ai/lessons/${lessonId}/exam_notes/?lang=${lang}`, {
            method: 'POST',
        }),
    generateQuiz: (data: {
        source_type: 'lesson' | 'chapter';
        source_id: string | number;
        difficulty: 'easy' | 'medium' | 'hard';
        count: number;
    }) =>
        apiRequest<GeneratedQuizResponse>('/ai/quizzes/generate/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    generateExamPaper: (data: {
        class_id: string | number;
        subject_id: string | number;
        units: Array<string | number>;
        marks: number;
        difficulty_mix: {
            easy: number;
            medium: number;
            hard: number;
        };
    }) =>
        apiRequest<GeneratedExamPaperResponse>('/ai/exams/generate/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getArtifacts: (params?: {
        artifact_type?: string;
        source_type?: string;
        source_id?: string | number;
        limit?: number;
    }) => {
        const query = new URLSearchParams();
        if (params?.artifact_type) query.set('artifact_type', params.artifact_type);
        if (params?.source_type) query.set('source_type', params.source_type);
        if (params?.source_id !== undefined && params.source_id !== null) query.set('source_id', String(params.source_id));
        if (params?.limit !== undefined) query.set('limit', String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiRequest<AiGeneratedArtifactRecord[]>(`/ai/artifacts/${suffix}`);
    },
    getAtRiskStudents: async (classId: string | number, notify: boolean = true) => {
        try {
            return await apiRequest<AtRiskStudent[]>(
                `/ai/analytics/at_risk_students/?class_id=${encodeURIComponent(String(classId))}&notify=${notify ? '1' : '0'}`,
                { suppressErrorStatuses: [403] }
            );
        } catch (error: unknown) {
            const status = error && typeof error === 'object' && 'status' in error
                ? Number(error.status)
                : undefined;
            if (status === 403) return [];
            throw error;
        }
    },
    listGradingRubrics: () => apiRequest<GradingRubric[]>('/ai/grading/rubrics/'),
    createGradingRubric: (data: {
        title: string;
        criteria: any;
        total_points: number;
    }) =>
        apiRequest<GradingRubric>('/ai/grading/rubrics/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    gradeSubmissionWithRubric: (data: {
        submission_id: string;
        rubric_id: string;
    }) =>
        apiRequest<{
            draft_id: string;
            score: number;
            feedback: string;
            criteria_breakdown: Array<{
                criterion: string;
                points_awarded: number;
                max_points: number;
                feedback?: string;
            }>;
            status: string;
        }>('/ai/grading/grade_submission/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    listGradingDrafts: (submissionId?: string) => {
        const query = submissionId ? `?submission_id=${encodeURIComponent(submissionId)}` : '';
        return apiRequest<AIGradingDraft[]>(`/ai/grading/drafts/${query}`);
    },
    approveGradingDraft: (draftId: string) =>
        apiRequest<{
            status: string;
            draft_id: string;
            score: number;
            approved_at?: string | null;
        }>('/ai/grading/approve_draft/', {
            method: 'POST',
            body: JSON.stringify({ draft_id: draftId }),
        }),
    getAILogs: async () => {
        const firstPage = await apiRequest<any[] | PaginatedResponse<any>>('/ai/logs/');
        if (Array.isArray(firstPage)) return firstPage;
        if (!firstPage || !Array.isArray(firstPage.results)) return [];

        const all = [...firstPage.results];
        const totalCount = typeof firstPage.count === 'number' ? firstPage.count : all.length;
        let page = 2;
        let hasMore = Boolean(firstPage.next);

        while (hasMore && all.length < totalCount) {
            const nextPage = await apiRequest<any[] | PaginatedResponse<any>>(`/ai/logs/?page=${page}`);
            if (Array.isArray(nextPage)) {
                all.push(...nextPage);
                break;
            }
            const batch = Array.isArray(nextPage?.results) ? nextPage.results : [];
            if (batch.length === 0) break;
            all.push(...batch);
            hasMore = Boolean(nextPage?.next);
            page += 1;
        }

        return all;
    },
    getRecommendations: () => apiRequest<{
        recommendations: Array<{
            id: number;
            title: string;
            subject: string;
            subject_id: number;
            reason: string;
        }>;
        learning_style_advice: string;
    }>('/ai/personalization/recommendations/'),
    getTeacherAnalytics: () => apiRequest<{
        at_risk_count: number;
        at_risk_students: Array<{
            id: string;
            name: string;
            risk_level: string;
            reasons: string[];
            score: number;
        }>;
        performance_trends: Array<{
            week: string;
            avgScore: number;
            classAvg: number;
        }>;
        topic_mastery: Array<{
            topic: string;
            score: number;
        }>;
        ai_insights: string[];
    }>('/ai/analytics/teacher/'),
    getStudentReport: (studentId: string) => apiRequest<any>(`/ai/reports/student/${studentId}/`),
    generateStudentReport: (studentId: string) =>
        apiRequest<any>(`/ai/reports/student/${studentId}/`, { method: 'POST' }),
    getActivePath: () => apiRequest<LearningPath>('/ai/learning-paths/active/'),
};

// Notifications API
export const notificationsAPI = {
    getNotifications: async () => {
        return fetchAllPages<Notification>('/notifications/notifications/', {
            skipAuthRedirectOn401: true,
        });
    },
    getUnreadCount: () =>
        apiRequest<{ count: number }>('/notifications/notifications/unread_count/', {
            skipAuthRedirectOn401: true,
        }),
    markAsRead: (id: number) => apiRequest<{ status: string }>(`/notifications/notifications/${id}/mark_as_read/`, {
        method: 'POST',
        skipAuthRedirectOn401: true,
    }),
    markAllAsRead: () => apiRequest<{ status: string }>('/notifications/notifications/mark_all_as_read/', {
        method: 'POST',
        skipAuthRedirectOn401: true,
    }),
};

// Conversations API
export const conversationsAPI = {
    getConversations: async () => {
        return fetchAllPages<Conversation>('/conversations/conversations/');
    },
    getConversation: (id: string) => apiRequest<Conversation>(`/conversations/conversations/${id}/`),
    markAsRead: (id: string) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/mark_as_read/`, {
        method: 'POST'
    }),
    startDirectMessage: (userId: string) => apiRequest<Conversation>('/conversations/conversations/start_direct_message/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    }),
    getMessages: async (conversationId: string) => {
        return fetchAllPages<Message>(`/conversations/messages/?conversation=${conversationId}`);
    },
    sendMessage: (conversationId: string, content: string) => apiRequest<Message>('/conversations/messages/', {
        method: 'POST',
        body: JSON.stringify({ conversation: conversationId, content })
    }),
    createGroup: (title: string, participantIds: string[]) => apiRequest<Conversation>('/conversations/conversations/create_group/', {
        method: 'POST',
        body: JSON.stringify({ title, participant_ids: participantIds })
    }),
    addParticipants: (id: string, participantIds: string[]) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/add_participants/`, {
        method: 'POST',
        body: JSON.stringify({ participant_ids: participantIds })
    }),
    removeParticipant: (id: string, userId: string) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/remove_participant/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    }),
};

// Helper functions for common operations
// Helper functions for common operations
export const helpers = {
    // Get subjects for a student's class
    getStudentSubjects: async (studentId?: string): Promise<Subject[]> => {
        try {
            let student;

            // If no studentId provided, fetch the current user's student profile
            if (!studentId) {
                student = await academicAPI.getMyStudent();
            } else {
                student = await academicAPI.getStudent(studentId);
            }

            if (!student.academic_class) return [];

            const subjects = await academicAPI.getSubjects();
            // Filter subjects by class match
            return subjects.filter((subject) => subject.academic_class === student.academic_class);
        } catch (e) {
            console.error("Error fetching student subjects", e);
            return [];
        }
    },

    getTeacherSubjects: async (teacherId: string): Promise<Subject[]> => {
        try {
            // Fetch all subjects and filter? Ideally backend endpoint S3-4
            const subjects = await academicAPI.getSubjects();
            // Include both lead teacher and co-teacher assignments.
            return subjects.filter((subject) => {
                if (String(subject.teacher || '') === String(teacherId)) return true;
                return Array.isArray(subject.additional_teachers)
                    ? subject.additional_teachers.some((assignedId) => String(assignedId) === String(teacherId))
                    : false;
            });
        } catch (e) {
            console.error("Error fetching teacher subjects", e);
            return [];
        }
    },

    getLessonsBySubject: async (subjectId: string | number): Promise<Lesson[]> => {
        try {
            return await academicAPI.getLessons(undefined, typeof subjectId === 'string' ? parseInt(subjectId) : subjectId);
        } catch (e) {
            console.error("Error fetching lessons", e);
            return [];
        }
    },

    getStudentResultsWithDetails: async (studentId: string) => {
        try {
            const [results, assessments, subjects] = await Promise.all([
                academicAPI.getResults(studentId),
                academicAPI.getAssessments(),
                academicAPI.getSubjects()
            ]);

            return results.map(result => {
                const assessment = assessments.find(a => a.assessment_id === result.assessment);
                const subject = assessment
                    ? subjects.find(s => s.id.toString() === assessment.subject?.toString())
                    : undefined;

                return {
                    ...result,
                    assessmentDetails: assessment,
                    subjectDetails: subject,
                    courseDetails: subject ? { ...subject, subject: subject.name, course_id: subject.id.toString() } : undefined
                };
            });
        } catch (e) {
            console.error("Error fetching results with details", e);
            return [];
        }
    },

    downloadFile: async (url: string, filename: string) => {
        const downloadTenantId = getResolvedTenantId();
        const response = await fetch(url, {
            headers: {
                'x-tenant-id': downloadTenantId
            }
        });
        if (!response.ok) {
            // Don't save an HTML/JSON error body as if it were the file.
            throw new Error(`Download failed (${response.status})`);
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Release the blob URL so the browser can reclaim memory.
        window.URL.revokeObjectURL(downloadUrl);
    }
};

export interface AdminPasswordResetRequestItem {
    request_id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: 'pending' | 'resolved';
    requested_at: string;
    resolved_at: string | null;
}

// This app is single-tenant now (see core.mixins.TenantScopedQuerysetMixin) —
// saasApi only covers what a platform Super Admin needs for that one school:
// platform settings/AI config, AI usage & cost, the audit log, admin password
// reset requests, and their own profile. getPublicPlans stays because the
// public marketing site still shows pricing tiers independent of the
// (removed) per-tenant billing model.
export const saasApi = {
    getPendingPasswordResetRequests: () =>
        apiRequest<AdminPasswordResetRequestItem[]>('/users/admin-password-reset-requests/'),
    resolvePasswordResetRequest: (requestId: string, newPassword: string) =>
        apiRequest<{ message: string }>(`/users/admin-password-reset-requests/${requestId}/resolve/`, {
            method: 'POST',
            body: JSON.stringify({ new_password: newPassword }),
        }),
    getSchoolAdmins: () =>
        apiRequest<Array<{ user_id: string; email: string; first_name: string; last_name: string; is_active: boolean }>>(
            '/users/admin-password-reset-requests/admins/'
        ),
    directResetAdminPassword: (userId: string, newPassword: string) =>
        apiRequest<{ message: string }>('/users/admin-password-reset-requests/direct-reset/', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, new_password: newPassword }),
        }),
    getPublicPlans: async () => {
        const response = await fetch(`${API_BASE_URL}${BILLING_SAAS_BASE}/plans/public/`, {
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'public',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load public plans (${response.status})`);
        }

        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results as SubscriptionPlan[];
        return [];
    },
    getSettings: () => apiRequest<GlobalSettings>('/core/settings/'),
    updateSettings: (data: Partial<GlobalSettings>) =>
        apiRequest<GlobalSettings>('/core/settings/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    testAIConnection: (overrides?: { api_key?: string; base_url?: string; provider_name?: string; model?: string }) =>
        apiRequest<{
            ok: boolean;
            provider?: string;
            model?: string;
            base_url?: string;
            latency_ms?: number;
            prompt_tokens?: number;
            completion_tokens?: number;
            error?: string;
        }>('/core/settings/test-ai-connection/', {
            method: 'POST',
            body: JSON.stringify(overrides || {}),
        }),
    getAuditLogs: () => coreAPI.getAuditLogs(),
    getSystemStatus: () => coreAPI.getSystemStatus(),
    getAIUsage: () => apiRequest<SaasAIUsageResponse>('/core/saas-ai-usage/'),
    helpers: helpers,
};

export type SaasStaffRole = '' | 'support' | 'billing' | 'schools_manager' | 'reports';

export interface SaasStaffMember {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    saas_staff_role: SaasStaffRole;
    is_active: boolean;
    date_joined: string;
    last_login: string | null;
}

export const saasStaffApi = {
    list: () => apiRequest<SaasStaffMember[]>('/users/saas-staff/'),
    create: (data: { email: string; first_name: string; last_name: string; password: string; saas_staff_role?: SaasStaffRole }) =>
        apiRequest<SaasStaffMember>('/users/saas-staff/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ is_active: boolean; first_name: string; last_name: string; saas_staff_role: SaasStaffRole }>) =>
        apiRequest<SaasStaffMember>(`/users/saas-staff/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
        apiRequest<void>(`/users/saas-staff/${id}/`, { method: 'DELETE' }),
};

export const api = {
    core: coreAPI,
    users: usersAPI,
    academic: academicAPI,
    billing: billingAPI,
    library: libraryAPI,
    ai: {
        getTeacherAnalytics: () => apiRequest<any>('/ai/analytics/teacher/'),
        tutorChat: (data: { message: string; history: any[]; context?: { lesson_id?: string | number; chapter_id?: string | number } }) =>
            aiAPI.chat(data.message, '', (data.history || []) as ChatMessage[], data.context),
        summarizeLesson: (lessonId: number, lang: 'en' | 'ne' = 'en') => aiAPI.summarizeLesson(lessonId, lang),
        lessonExamNotes: (lessonId: number, lang: 'en' | 'ne' = 'en') => aiAPI.lessonExamNotes(lessonId, lang),
        generateQuiz: (data: {
            source_type: 'lesson' | 'chapter';
            source_id: string | number;
            difficulty: 'easy' | 'medium' | 'hard';
            count: number;
        }) => aiAPI.generateQuiz(data),
        generateExamPaper: (data: {
            class_id: string | number;
            subject_id: string | number;
            units: Array<string | number>;
            marks: number;
            difficulty_mix: {
                easy: number;
                medium: number;
                hard: number;
            };
        }) => aiAPI.generateExamPaper(data),
        getArtifacts: (params?: {
            artifact_type?: string;
            source_type?: string;
            source_id?: string | number;
            limit?: number;
        }) => aiAPI.getArtifacts(params),
        getAtRiskStudents: (classId: string | number, notify: boolean = true) => aiAPI.getAtRiskStudents(classId, notify),
        listGradingRubrics: () => aiAPI.listGradingRubrics(),
        createGradingRubric: (data: {
            title: string;
            criteria: any;
            total_points: number;
        }) => aiAPI.createGradingRubric(data),
        gradeSubmissionWithRubric: (data: {
            submission_id: string;
            rubric_id: string;
        }) => aiAPI.gradeSubmissionWithRubric(data),
        listGradingDrafts: (submissionId?: string) => aiAPI.listGradingDrafts(submissionId),
        approveGradingDraft: (draftId: string) => aiAPI.approveGradingDraft(draftId),
        getStudySchedule: (params?: { from?: string; to?: string }) => {
            const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
            return apiRequest<any[]>(`/ai/study-schedule/${qs}`);
        },
        generateStudySchedule: (days = 7, replaceExisting = true) =>
            apiRequest<{ count: number; days: number; events: any[] }>('/ai/study-schedule/generate/', {
                method: 'POST',
                body: JSON.stringify({ days, replace_existing: replaceExisting }),
            }),
        getStudyPlanSummary: (days = 7) =>
            apiRequest<{
                due_reviews: number;
                skill_gaps: Array<{ skill: string; p_mastery: number; subject: string | null }>;
                upcoming_exams: Array<{ title: string; scheduled_at: string; subject: string | null }>;
                new_content_nodes: number;
                daily_goal_minutes: number;
            }>(`/ai/study-schedule/summary/?days=${days}`),
        markStudyEventComplete: (id: string) =>
            apiRequest<any>(`/ai/study-schedule/${id}/complete/`, { method: 'PATCH' }),
        updateStudyEvent: (id: string, updates: any) =>
            apiRequest<any>(`/ai/study-schedule/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }),
        generateStudentReport: (studentId: string) =>
            apiRequest<any>(`/ai/reports/student/${studentId}/`, {
                method: 'POST'
            }),
        // Phase 9 – Progress Reports
        getMyProgressReport: (type: 'student' | 'parent' | 'teacher' = 'student') =>
            apiRequest<ProgressReport>(`/ai/reports/me/?type=${type}`),
        generateMyProgressReport: (type: 'student' | 'parent' | 'teacher' = 'student') =>
            apiRequest<ProgressReport>(`/ai/reports/me/generate/`, {
                method: 'POST',
                body: JSON.stringify({ type }),
            }),
        getMyReportHistory: (type: 'student' | 'parent' | 'teacher' = 'student', limit = 10) =>
            apiRequest<ProgressReportHistoryItem[]>(`/ai/reports/me/history/?type=${type}&limit=${limit}`),
        getClassProgressReport: (classId: number, type: 'student' | 'parent' | 'teacher' = 'teacher') =>
            apiRequest<{ class_id: number; report_type: string; reports: ProgressReport[] }>(
                `/ai/reports/class/${classId}/?type=${type}`
            ),
    },
    notifications: notificationsAPI,
    conversations: conversationsAPI,
    learningPaths: {
        getPaths: () => apiRequest<LearningPath[]>('/ai/learning-paths/'),
        generatePath: (data: { student_id: string; subject_id?: number; topic_focus?: string }) =>
            apiRequest<LearningPath>('/ai/learning-paths/generate/', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        updateNodeStatus: (nodeId: string, status: string) =>
            apiRequest<{ status: string; next_node_unlocked: boolean }>(`/ai/learning-nodes/${nodeId}/complete/`, {
                method: 'POST'
            }),
    },
    reports: {
        // These return paths (no API_BASE_URL). Pass them to downloadReport()
        // to fetch with the auth header and trigger a save. Do NOT use
        // window.open() — that produces a bare GET without the Bearer token
        // and the backend returns 401.
        getStudentPerformancePDF: (studentId: string) => `/academic/reports/student-performance/${studentId}/`,
        getStudentPerformanceExcel: (studentId: string) => `/academic/reports/student-performance-excel/${studentId}/`,
        getAttendanceSummaryPDF: (sectionId: string | number) => `/academic/reports/attendance-summary/${sectionId}/`,
        getAttendanceSummaryExcel: (sectionId: string | number) => `/academic/reports/attendance-summary-excel/${sectionId}/`,
        getFeeCollectionPDF: (start?: string, end?: string) => {
            const query = new URLSearchParams();
            if (start) query.append('start_date', start);
            if (end) query.append('end_date', end);
            const qs = query.toString();
            return `${BILLING_SCHOOL_BASE}/reports/fee-collection/${qs ? `?${qs}` : ''}`;
        },
        getFeeCollectionExcel: (start?: string, end?: string) => {
            const query = new URLSearchParams();
            if (start) query.append('start_date', start);
            if (end) query.append('end_date', end);
            const qs = query.toString();
            return `${BILLING_SCHOOL_BASE}/reports/fee-collection-excel/${qs ? `?${qs}` : ''}`;
        },
        getPendingFeesPDF: () => `${BILLING_SCHOOL_BASE}/reports/pending-fees/`,
        getPendingFeesExcel: () => `${BILLING_SCHOOL_BASE}/reports/pending-fees-excel/`,
        getResultCardPDF: (studentId: string, resultId: string) => `/academic/reports/result-card/${studentId}/${resultId}/`,
        getHallTicketPDF: (seatingId: string) => `/academic/reports/hall-ticket/${seatingId}/`,
        getBulkHallTicketsZIP: (examId: string) => `/academic/reports/bulk-hall-tickets/${examId}/`,
    },
    settings: {
        get: () => apiRequest('/core/settings/'),
        update: (data: any) => apiRequest('/core/settings/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    schoolProfile: {
        get: () => apiRequest<SchoolProfile>('/core/school-profile/'),
        update: (data: Partial<SchoolProfile>) => apiRequest<SchoolProfile>('/core/school-profile/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        uploadLogo: (file: File) => {
            const formData = new FormData();
            formData.append('logo', file);
            return apiRequest<SchoolProfile>('/core/school-profile/', {
                method: 'PATCH',
                body: formData,
            });
        },
        uploadHeroImage: (file: File) => {
            const formData = new FormData();
            formData.append('hero_image', file);
            return apiRequest<SchoolProfile>('/core/school-profile/', {
                method: 'PATCH',
                body: formData,
            });
        },
        uploadPrincipalPhoto: (file: File) => {
            const formData = new FormData();
            formData.append('principal_photo', file);
            return apiRequest<SchoolProfile>('/core/school-profile/', {
                method: 'PATCH',
                body: formData,
            });
        },
    },
    backups: {
        list: () => apiRequest('/core/backups/'),
        create: (data?: any) => apiRequest('/core/backups/', {
            method: 'POST',
            body: JSON.stringify(data || {})
        }),
        downloadUrl: (filename: string) => `${API_BASE_URL}/core/backups/download/${encodeURIComponent(filename)}/`,
    },
    auditLogs: {
        list: () => apiRequest('/core/audit-logs/'),
    },
    gamification: {
        getBadges: async () => {
            return fetchAllPages<Badge>('/gamification/available-badges/');
        },
        getMyBadges: async () => {
            return fetchAllPages<StudentBadge>('/gamification/student-badges/');
        },
        getStudentBadges: async () => {
            return fetchAllPages<StudentBadge>('/gamification/student-badges/');
        },
        getLeaderboard: async (scope: 'class' | 'school' = 'class') => {
            return apiRequest<{ scope: string; total_participants: number; my_rank: number | null; entries: any[] }>(`/gamification/leaderboard/?scope=${scope}`);
        },
        createBadge: (data: any) => apiRequest<any>('/gamification/available-badges/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        updateBadge: (id: string, data: any) => apiRequest<any>(`/gamification/available-badges/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        deleteBadge: (id: string) => apiRequest<void>(`/gamification/available-badges/${id}/`, {
            method: 'DELETE',
        }),
        getMyStats: () => apiRequest<any>('/gamification/profile/my_stats/'),
        updateProfile: (id: string, data: any) => apiRequest<any>(`/gamification/profile/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
    },
    helpers: helpers,
};

export const learningPathsAPI = api.learningPaths;
export const gamificationAPI = api.gamification;
export const reportsAPI = api.reports;

// ─── HR & Payroll API ────────────────────────────────────────────────────────

export interface HREmployee {
    employee_id: string;
    employee_code: string;
    full_name: string;
    email: string;
    designation: string;
    department_name: string | null;
    contract_type: string;
    join_date: string;
    basic_salary: number;
    is_active: boolean;
    user?: string;
    department?: string;
    salary_grade?: string;
    pan_number?: string;
    marital_status?: 'single' | 'couple';
    social_security_scheme?: 'none' | 'pf' | 'ssf';
    pf_number?: string;
    ssf_number?: string;
    cit_number?: string;
    recurring_cit_monthly?: number;
    insurance_monthly?: number;
    bank_account_number?: string;
    bank_name?: string;
    bank_ifsc?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

export interface HRDepartment {
    dept_id: string;
    name: string;
    code: string;
    description: string;
    head: string | null;
    head_name: string | null;
    employee_count: number;
    tenant?: string;
}

export interface HRLeaveType {
    leave_type_id: string;
    name: string;
    code: string;
    max_days_per_year: number;
    is_paid: boolean;
    carry_forward: boolean;
    carry_forward_max_days: number;
}

export interface HRLeaveApplication {
    leave_id: string;
    employee: string;
    employee_name: string;
    leave_type: string;
    leave_type_name: string;
    leave_type_code: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    applied_at: string;
    reviewed_by: string | null;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    review_remarks: string;
}

export interface HRPayrollPeriod {
    period_id: string;
    name: string;
    month: number;
    year: number;
    start_date: string;
    end_date: string;
    working_days: number;
    status: 'draft' | 'processing' | 'finalized' | 'paid';
    finalized_at: string | null;
    finalized_by: string | null;
    finalized_by_name: string | null;
    slip_count: number;
    notes: string;
}

export interface HRSalarySlip {
    slip_id: string;
    employee: string;
    employee_name: string;
    employee_code: string;
    department_name: string | null;
    payroll_period: string;
    period_name: string;
    working_days: number;
    paid_days: number;
    absent_days: number;
    lop_days: number;
    basic_salary: number;
    hra: number;
    da: number;
    transport_allowance: number;
    medical_allowance: number;
    other_allowance: number;
    gross_salary: number;
    pf_employee: number;
    pf_employer: number;
    ssf_employee: number;
    ssf_employer: number;
    cit_deduction: number;
    insurance_deduction: number;
    esi_employee: number;
    tds: number;
    professional_tax: number;
    other_deduction: number;
    total_deductions: number;
    net_salary: number;
    taxable_income_annual: number;
    annual_tax_liability: number;
    employer_cost: number;
    fiscal_year_bs: string;
    status: 'draft' | 'finalized' | 'paid';
    payment_date: string | null;
    payment_method: string;
    transaction_reference: string;
}

export interface HRDashboardStats {
    total_employees: number;
    total_departments: number;
    pending_leave_requests: number;
    open_payroll_periods: number;
    contract_breakdown: Array<{ contract_type: string; count: number }>;
    department_headcount: Array<{ department__name: string; count: number }>;
}

export const hrAPI = {
    // Dashboard
    getDashboardStats: () => apiRequest<HRDashboardStats>('/hr/dashboard/stats/'),

    // Departments
    getDepartments: () => apiRequest<HRDepartment[]>('/hr/departments/'),
    createDepartment: (data: Partial<HRDepartment>) =>
        apiRequest<HRDepartment>('/hr/departments/', { method: 'POST', body: JSON.stringify(data) }),
    updateDepartment: (id: string, data: Partial<HRDepartment>) =>
        apiRequest<HRDepartment>(`/hr/departments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteDepartment: (id: string) =>
        apiRequest<void>(`/hr/departments/${id}/`, { method: 'DELETE' }),

    // Employees
    getEmployees: (params?: { department?: string; contract_type?: string; is_active?: boolean }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return apiRequest<HREmployee[]>(`/hr/employees/${q}`);
    },
    getEmployee: (id: string) => apiRequest<HREmployee>(`/hr/employees/${id}/`),
    createEmployee: (data: Partial<HREmployee>) =>
        apiRequest<HREmployee>('/hr/employees/', { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id: string, data: Partial<HREmployee>) =>
        apiRequest<HREmployee>(`/hr/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteEmployee: (id: string) =>
        apiRequest<void>(`/hr/employees/${id}/`, { method: 'DELETE' }),
    deactivateEmployee: (id: string) =>
        apiRequest<{ message: string }>(`/hr/employees/${id}/deactivate/`, { method: 'POST' }),
    reactivateEmployee: (id: string) =>
        apiRequest<{ message: string }>(`/hr/employees/${id}/reactivate/`, { method: 'POST' }),

    // Leave Types
    getLeaveTypes: () => apiRequest<HRLeaveType[]>('/hr/leave-types/'),
    createLeaveType: (data: Partial<HRLeaveType>) =>
        apiRequest<HRLeaveType>('/hr/leave-types/', { method: 'POST', body: JSON.stringify(data) }),

    // Leave Applications
    getLeaves: (params?: { status?: string; employee?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<HRLeaveApplication[]>(`/hr/leaves/${q}`);
    },
    applyLeave: (data: { employee: string; leave_type: string; start_date: string; end_date: string; total_days: number; reason: string }) =>
        apiRequest<HRLeaveApplication>('/hr/leaves/', { method: 'POST', body: JSON.stringify(data) }),
    approveLeave: (id: string, remarks?: string) =>
        apiRequest<HRLeaveApplication>(`/hr/leaves/${id}/approve/`, { method: 'POST', body: JSON.stringify({ remarks: remarks ?? '' }) }),
    rejectLeave: (id: string, remarks: string) =>
        apiRequest<HRLeaveApplication>(`/hr/leaves/${id}/reject/`, { method: 'POST', body: JSON.stringify({ remarks }) }),
    cancelLeave: (id: string) =>
        apiRequest<HRLeaveApplication>(`/hr/leaves/${id}/cancel/`, { method: 'POST' }),

    // Staff Attendance
    getAttendance: (params?: { date?: string; employee?: string; month?: number; year?: number }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return apiRequest<any[]>(`/hr/attendance/${q}`);
    },
    bulkMarkAttendance: (date: string, records: Array<{ employee_id: string; status: string; check_in_time?: string; check_out_time?: string; remarks?: string }>) =>
        apiRequest<{ message: string; created: number; updated: number }>('/hr/attendance/bulk-mark/', { method: 'POST', body: JSON.stringify({ date, records }) }),

    // Payroll Periods
    getPayrollPeriods: () => apiRequest<HRPayrollPeriod[]>('/hr/payroll-periods/'),
    createPayrollPeriod: (data: Partial<HRPayrollPeriod>) =>
        apiRequest<HRPayrollPeriod>('/hr/payroll-periods/', { method: 'POST', body: JSON.stringify(data) }),
    finalizePayrollPeriod: (id: string) =>
        apiRequest<HRPayrollPeriod>(`/hr/payroll-periods/${id}/finalize/`, { method: 'POST' }),
    generateSlips: (id: string) =>
        apiRequest<{ message: string; created: number; skipped: number }>(`/hr/payroll-periods/${id}/generate-slips/`, { method: 'POST' }),

    // Salary Slips
    getSalarySlips: (params?: { payroll_period?: string; employee?: string; status?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<HRSalarySlip[]>(`/hr/salary-slips/${q}`);
    },
    updateSalarySlip: (id: string, data: Partial<HRSalarySlip>) =>
        apiRequest<HRSalarySlip>(`/hr/salary-slips/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    markSlipPaid: (id: string, data: { payment_date: string; payment_method?: string; transaction_reference?: string }) =>
        apiRequest<HRSalarySlip>(`/hr/salary-slips/${id}/mark-paid/`, { method: 'POST', body: JSON.stringify(data) }),
    downloadPayslip: async (slipId: string, filename?: string) => {
        const res = await fetch(`/api/hr/salary-slips/${slipId}/payslip-pdf/`, {
            headers: { 'x-tenant-id': getResolvedTenantId() }
        });
        if (!res.ok) throw new Error('Failed to download payslip');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `payslip_${slipId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    },
};

// ─── SIS API ─────────────────────────────────────────────────────────────────

export interface SISDashboardStats {
    health_records: number;
    open_incidents: number;
    total_incidents: number;
    documents_issued: number;
    transfer_certificates: number;
    incident_by_type: Array<{ incident_type: string; count: number }>;
    incident_by_severity: Array<{ severity: string; count: number }>;
}

export interface StudentHealthRecord {
    health_id: string;
    student: string;
    student_name: string;
    blood_group: string;
    height_cm: number | null;
    weight_kg: number | null;
    allergies: string;
    chronic_conditions: string;
    current_medications: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relation: string;
    doctor_name: string;
    doctor_phone: string;
    insurance_provider: string;
    insurance_number: string;
    notes: string;
    immunizations: Array<{
        immunization_id: string;
        vaccine_name: string;
        date_administered: string | null;
        next_due_date: string | null;
        administered_by: string;
        remarks: string;
    }>;
}

export interface DisciplinaryIncident {
    incident_id: string;
    student: string;
    student_name: string;
    reported_by_name: string | null;
    incident_date: string;
    incident_type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    action_taken: string;
    status: 'open' | 'resolved' | 'escalated';
    parent_notified: boolean;
    parent_notified_at: string | null;
    follow_up_date: string | null;
    follow_up_notes: string;
    created_at: string;
}

export interface StudentDocument {
    document_id: string;
    student: string;
    student_name: string;
    issued_by_name: string | null;
    document_type: string;
    document_type_display: string;
    document_number: string;
    issued_date: string;
    reason: string;
    remarks: string;
    marks_as_transferred: boolean;
    metadata: Record<string, any>;
    is_cancelled: boolean;
    created_at: string;
}

// ─── Inventory API ───────────────────────────────────────────────────────────

export interface InventoryAsset {
    asset_id: string;
    name: string;
    asset_tag: string;
    category: string;
    category_display: string;
    description: string;
    serial_number: string;
    brand: string;
    model_number: string;
    purchase_date: string | null;
    purchase_price: number | null;
    warranty_expiry: string | null;
    location: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired' | 'lost';
    status_display: string;
    condition: 'new' | 'good' | 'fair' | 'poor';
    condition_display: string;
    notes: string;
    active_assignment: {
        assignment_id: string;
        assigned_to_name: string | null;
        assigned_to_location: string;
        assigned_date: string;
        expected_return_date: string | null;
    } | null;
    open_maintenance_count: number;
    created_at: string;
    updated_at: string;
}

export interface MaintenanceRequest {
    request_id: string;
    asset: string;
    asset_name: string;
    asset_tag: string;
    reported_by_name: string | null;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'cancelled';
    status_display: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    priority_display: string;
    estimated_cost: number | null;
    actual_cost: number | null;
    resolution_notes: string;
    reported_date: string;
    resolved_date: string | null;
    created_at: string;
}

export interface ConsumableStock {
    stock_id: string;
    name: string;
    category: string;
    category_display: string;
    unit: string;
    unit_display: string;
    current_quantity: number;
    minimum_quantity: number;
    location: string;
    notes: string;
    last_restocked: string | null;
    is_low: boolean;
    created_at: string;
    updated_at: string;
}

export interface InventoryDashboard {
    total_assets: number;
    by_status: Array<{ status: string; count: number }>;
    by_category: Array<{ category: string; count: number }>;
    open_maintenance: number;
    low_stock_count: number;
    low_stock_items: ConsumableStock[];
}

export const inventoryAPI = {
    // Assets
    getAssets: (params?: { category?: string; status?: string; search?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<InventoryAsset[]>(`/academic/inventory/assets/${q}`);
    },
    createAsset: (data: Partial<InventoryAsset>) =>
        apiRequest<InventoryAsset>('/academic/inventory/assets/', { method: 'POST', body: JSON.stringify(data) }),
    updateAsset: (id: string, data: Partial<InventoryAsset>) =>
        apiRequest<InventoryAsset>(`/academic/inventory/assets/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAsset: (id: string) =>
        apiRequest<void>(`/academic/inventory/assets/${id}/`, { method: 'DELETE' }),
    assignAsset: (id: string, data: { assigned_to_location?: string; assigned_to_user?: string; assigned_date: string; expected_return_date?: string; notes?: string }) =>
        apiRequest<any>(`/academic/inventory/assets/${id}/assign/`, { method: 'POST', body: JSON.stringify(data) }),
    returnAsset: (id: string) =>
        apiRequest<any>(`/academic/inventory/assets/${id}/return/`, { method: 'POST', body: '{}' }),
    getDashboard: () => apiRequest<InventoryDashboard>('/academic/inventory/assets/dashboard/'),

    // Maintenance
    getMaintenanceRequests: (params?: { status?: string; priority?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<MaintenanceRequest[]>(`/academic/inventory/maintenance/${q}`);
    },
    createMaintenanceRequest: (data: Partial<MaintenanceRequest>) =>
        apiRequest<MaintenanceRequest>('/academic/inventory/maintenance/', { method: 'POST', body: JSON.stringify(data) }),
    resolveMaintenanceRequest: (id: string, data: { resolution_notes?: string; actual_cost?: number }) =>
        apiRequest<MaintenanceRequest>(`/academic/inventory/maintenance/${id}/resolve/`, { method: 'POST', body: JSON.stringify(data) }),

    // Consumables
    getStock: (lowOnly?: boolean) => {
        const q = lowOnly ? '?low_stock=1' : '';
        return apiRequest<ConsumableStock[]>(`/academic/inventory/stock/${q}`);
    },
    createStock: (data: Partial<ConsumableStock>) =>
        apiRequest<ConsumableStock>('/academic/inventory/stock/', { method: 'POST', body: JSON.stringify(data) }),
    updateStock: (id: string, data: Partial<ConsumableStock>) =>
        apiRequest<ConsumableStock>(`/academic/inventory/stock/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    restock: (id: string, quantity: number) =>
        apiRequest<ConsumableStock>(`/academic/inventory/stock/${id}/restock/`, { method: 'POST', body: JSON.stringify({ quantity }) }),
    consume: (id: string, quantity: number) =>
        apiRequest<ConsumableStock>(`/academic/inventory/stock/${id}/consume/`, { method: 'POST', body: JSON.stringify({ quantity }) }),
};

// ─── Events / Calendar API ────────────────────────────────────────────────────

export interface SchoolEvent {
    event_id: string;
    title: string;
    description: string;
    event_type: 'holiday' | 'exam' | 'sports' | 'cultural' | 'ptm' | 'academic' | 'meeting' | 'other';
    event_type_display: string;
    audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
    audience_display: string;
    start_date: string;
    end_date: string;
    start_time: string | null;
    end_time: string | null;
    is_all_day: boolean;
    location: string;
    is_holiday: boolean;
    color: string;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Analytics API ───────────────────────────────────────────────────────────

export interface AnalyticsDashboard {
    snapshot: {
        students: number;
        teachers: number;
        classes: number;
        subjects: number;
        overall_attendance_rate: number;
        pass_rate: number;
        total_results: number;
    };
    attendance_trend: Array<{ date: string; present: number; absent: number; late: number; total: number; rate: number }>;
    grade_distribution: Array<{ grade: string; count: number }>;
    subject_performance: Array<{ subject: string; avg_pct: number; count: number }>;
    class_performance: Array<{ class: string; avg_pct: number; students: number }>;
    class_distribution: Array<{ class: string; students: number }>;
    assessment_activity: Array<{ month: string; label: string; count: number }>;
    top_students: Array<{ student_id: string; name: string; avg_pct: number; assessments: number }>;
}

export const analyticsAPI = {
    getDashboard: (params?: { days?: number; class_id?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return apiRequest<AnalyticsDashboard>(`/academic/analytics/dashboard/${q}`);
    },
};

export const eventsAPI = {
    getEvents: (params?: { event_type?: string; month?: string; year?: string; audience?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<SchoolEvent[]>(`/academic/events/${q}`);
    },
    getUpcoming: () => apiRequest<SchoolEvent[]>('/academic/events/upcoming/'),
    getHolidays: () => apiRequest<SchoolEvent[]>('/academic/events/holidays/'),
    createEvent: (data: Partial<SchoolEvent>) =>
        apiRequest<SchoolEvent>('/academic/events/', { method: 'POST', body: JSON.stringify(data) }),
    updateEvent: (id: string, data: Partial<SchoolEvent>) =>
        apiRequest<SchoolEvent>(`/academic/events/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteEvent: (id: string) =>
        apiRequest<void>(`/academic/events/${id}/`, { method: 'DELETE' }),
};

export const sisAPI = {
    // Dashboard
    getStats: () => apiRequest<SISDashboardStats>('/academic/sis/dashboard/stats/'),

    // Health Records
    getHealthRecords: (studentId?: string) => {
        const q = studentId ? `?student=${studentId}` : '';
        return apiRequest<StudentHealthRecord[]>(`/academic/sis/health/${q}`);
    },
    getHealthRecord: (id: string) => apiRequest<StudentHealthRecord>(`/academic/sis/health/${id}/`),
    createHealthRecord: (data: Partial<StudentHealthRecord>) =>
        apiRequest<StudentHealthRecord>('/academic/sis/health/', { method: 'POST', body: JSON.stringify(data) }),
    updateHealthRecord: (id: string, data: Partial<StudentHealthRecord>) =>
        apiRequest<StudentHealthRecord>(`/academic/sis/health/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    addImmunization: (healthId: string, data: any) =>
        apiRequest<any>(`/academic/sis/health/${healthId}/immunizations/`, { method: 'POST', body: JSON.stringify(data) }),
    deleteImmunization: (healthId: string, immId: string) =>
        apiRequest<void>(`/academic/sis/health/${healthId}/immunizations/${immId}/`, { method: 'DELETE' }),

    // Disciplinary Incidents
    getIncidents: (params?: { student?: string; status?: string; severity?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<DisciplinaryIncident[]>(`/academic/sis/incidents/${q}`);
    },
    createIncident: (data: Partial<DisciplinaryIncident>) =>
        apiRequest<DisciplinaryIncident>('/academic/sis/incidents/', { method: 'POST', body: JSON.stringify(data) }),
    updateIncident: (id: string, data: Partial<DisciplinaryIncident>) =>
        apiRequest<DisciplinaryIncident>(`/academic/sis/incidents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    resolveIncident: (id: string, data: { action_taken?: string; follow_up_notes?: string }) =>
        apiRequest<DisciplinaryIncident>(`/academic/sis/incidents/${id}/resolve/`, { method: 'POST', body: JSON.stringify(data) }),
    notifyParent: (id: string) =>
        apiRequest<{ message: string }>(`/academic/sis/incidents/${id}/notify-parent/`, { method: 'POST' }),

    // Documents
    getDocuments: (params?: { student?: string; document_type?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<StudentDocument[]>(`/academic/sis/documents/${q}`);
    },
    issueDocument: (data: Partial<StudentDocument>) =>
        apiRequest<StudentDocument>('/academic/sis/documents/', { method: 'POST', body: JSON.stringify(data) }),
    previewDocument: (id: string) =>
        apiRequest<any>(`/academic/sis/documents/${id}/preview/`),
    cancelDocument: (id: string, reason?: string) =>
        apiRequest<StudentDocument>(`/academic/sis/documents/${id}/cancel/`, { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) }),
};

// ── Communication / Notification interfaces ──────────────────────────────────

export interface NotificationItem {
    id: number;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export interface NotificationTemplate {
    id: number;
    name: string;
    subject_template: string;
    body_template: string;
    type: 'email' | 'sms' | 'app';
    is_active: boolean;
    created_at: string;
}

export interface BroadcastPayload {
    title: string;
    message: string;
    target: 'all' | 'role' | 'class';
    role?: string;
    class_id?: string;
    link?: string;
}

export const communicationAPI = {
    // In-app notifications for the logged-in user
    getMyNotifications: () => apiRequest<NotificationItem[]>('/notifications/notifications/'),
    getUnreadCount: () => apiRequest<{ count: number }>('/notifications/notifications/unread_count/'),
    markRead: (id: number) =>
        apiRequest<void>(`/notifications/notifications/${id}/mark_as_read/`, { method: 'POST' }),
    markAllRead: () =>
        apiRequest<void>('/notifications/notifications/mark_all_as_read/', { method: 'POST' }),

    // Broadcast bulk notification
    broadcast: (payload: BroadcastPayload) =>
        apiRequest<{ sent_count: number }>('/notifications/notifications/broadcast/', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    // Notification templates
    getTemplates: async () => fetchAllPages<NotificationTemplate>('/notifications/templates/'),
    createTemplate: (data: Partial<NotificationTemplate>) =>
        apiRequest<NotificationTemplate>('/notifications/templates/', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (id: number, data: Partial<NotificationTemplate>) =>
        apiRequest<NotificationTemplate>(`/notifications/templates/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteTemplate: (id: number) =>
        apiRequest<void>(`/notifications/templates/${id}/`, { method: 'DELETE' }),
};

// ── Hostel ────────────────────────────────────────────────────────────────────

export interface HostelBlock {
    block_id: string;
    name: string;
    gender: 'male' | 'female' | 'mixed';
    warden_name: string;
    warden_phone: string;
    total_rooms: number;
    is_active: boolean;
    occupied_rooms: number;
    available_rooms: number;
    created_at: string;
}

export interface HostelRoom {
    room_id: string;
    block: string;
    room_number: string;
    room_type: 'single' | 'double' | 'dormitory';
    capacity: number;
    monthly_fee: number;
    floor: number;
    is_active: boolean;
    occupied_beds: number;
    available_beds: number;
    is_full: boolean;
}

export interface HostelAllotment {
    allotment_id: string;
    student: string;
    student_name?: string;
    room: string;
    room_number?: string;
    block_name?: string;
    check_in_date: string;
    check_out_date: string | null;
    is_active: boolean;
    remarks: string;
    created_at: string;
}

export interface HostelDashboard {
    total_blocks: number;
    total_capacity: number;
    total_occupied: number;
    available_beds: number;
    occupancy_rate: number;
}

export const hostelAPI = {
    // Dashboard
    getDashboard: () => apiRequest<HostelDashboard>('/hostel/blocks/dashboard/'),

    // Blocks
    getBlocks: async () => {
        return fetchAllPages<HostelBlock>('/hostel/blocks/');
    },
    createBlock: (data: Partial<HostelBlock>) =>
        apiRequest<HostelBlock>('/hostel/blocks/', { method: 'POST', body: JSON.stringify(data) }),
    updateBlock: (id: string, data: Partial<HostelBlock>) =>
        apiRequest<HostelBlock>(`/hostel/blocks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteBlock: (id: string) => apiRequest<void>(`/hostel/blocks/${id}/`, { method: 'DELETE' }),

    // Rooms
    getRooms: async (params?: { block?: string; is_active?: boolean }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return fetchAllPages<HostelRoom>(`/hostel/rooms/${q}`);
    },
    createRoom: (data: Partial<HostelRoom>) =>
        apiRequest<HostelRoom>('/hostel/rooms/', { method: 'POST', body: JSON.stringify(data) }),
    updateRoom: (id: string, data: Partial<HostelRoom>) =>
        apiRequest<HostelRoom>(`/hostel/rooms/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteRoom: (id: string) => apiRequest<void>(`/hostel/rooms/${id}/`, { method: 'DELETE' }),

    // Allotments
    getAllotments: async (params?: { is_active?: boolean }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return fetchAllPages<HostelAllotment>(`/hostel/allotments/${q}`);
    },
    createAllotment: (data: Partial<HostelAllotment>) =>
        apiRequest<HostelAllotment>('/hostel/allotments/', { method: 'POST', body: JSON.stringify(data) }),
    updateAllotment: (id: string, data: Partial<HostelAllotment>) =>
        apiRequest<HostelAllotment>(`/hostel/allotments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    checkOut: (id: string, date: string) =>
        apiRequest<HostelAllotment>(`/hostel/allotments/${id}/`, { method: 'PATCH', body: JSON.stringify({ is_active: false, check_out_date: date }) }),
};

// ── Transport ─────────────────────────────────────────────────────────────────

export interface TransportRoute {
    route_id: string;
    name: string;
    description: string;
    stops: { name: string; order: number; pickup_time: string }[];
    is_active: boolean;
    created_at: string;
}

export interface TransportVehicle {
    vehicle_id: string;
    plate_number: string;
    model: string;
    capacity: number;
    driver_name: string;
    driver_phone: string;
    route: string | null;
    is_active: boolean;
}

export interface TransportAssignment {
    assignment_id: string;
    student: string;
    student_name?: string;
    route: string;
    route_name?: string;
    vehicle: string | null;
    pickup_stop: string;
    monthly_fee: number;
    active_from: string;
    active_until: string | null;
    is_active: boolean;
    created_at: string;
}

export interface TransportSummary {
    total_routes: number;
    active_routes: number;
}

export const transportAPI = {
    getSummary: () => apiRequest<TransportSummary>('/transport/routes/summary/'),

    // Routes
    getRoutes: async () => {
        return fetchAllPages<TransportRoute>('/transport/routes/');
    },
    createRoute: (data: Partial<TransportRoute>) =>
        apiRequest<TransportRoute>('/transport/routes/', { method: 'POST', body: JSON.stringify(data) }),
    updateRoute: (id: string, data: Partial<TransportRoute>) =>
        apiRequest<TransportRoute>(`/transport/routes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteRoute: (id: string) => apiRequest<void>(`/transport/routes/${id}/`, { method: 'DELETE' }),

    // Vehicles
    getVehicles: async () => {
        return fetchAllPages<TransportVehicle>('/transport/vehicles/');
    },
    createVehicle: (data: Partial<TransportVehicle>) =>
        apiRequest<TransportVehicle>('/transport/vehicles/', { method: 'POST', body: JSON.stringify(data) }),
    updateVehicle: (id: string, data: Partial<TransportVehicle>) =>
        apiRequest<TransportVehicle>(`/transport/vehicles/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteVehicle: (id: string) => apiRequest<void>(`/transport/vehicles/${id}/`, { method: 'DELETE' }),

    // Assignments
    getAssignments: async (params?: { is_active?: boolean }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return fetchAllPages<TransportAssignment>(`/transport/assignments/${q}`);
    },
    createAssignment: (data: Partial<TransportAssignment>) =>
        apiRequest<TransportAssignment>('/transport/assignments/', { method: 'POST', body: JSON.stringify(data) }),
    updateAssignment: (id: string, data: Partial<TransportAssignment>) =>
        apiRequest<TransportAssignment>(`/transport/assignments/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Student Leaves ────────────────────────────────────────────────────────────

export interface StudentLeave {
    leave_id: string;
    student: string;
    student_name?: string;
    class_name?: string;
    applied_by: string;
    leave_type: 'sick' | 'personal' | 'family' | 'event' | 'other';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    supporting_document_url?: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reviewed_by?: string;
    reviewed_by_name?: string;
    reviewed_at?: string;
    review_remarks?: string;
    created_at: string;
}

export const studentLeaveAPI = {
    getLeaves: (params?: { status?: string; student?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return fetchAllPages<StudentLeave>(`/academic/student-leaves/${q}`);
    },
    getPendingLeaves: () => apiRequest<StudentLeave[]>('/academic/student-leaves/pending/'),
    applyLeave: (data: { student: string; leave_type: string; start_date: string; end_date: string; reason: string; supporting_document_url?: string }) =>
        apiRequest<StudentLeave>('/academic/student-leaves/', { method: 'POST', body: JSON.stringify(data) }),
    approveLeave: (id: string, remarks?: string) =>
        apiRequest<StudentLeave>(`/academic/student-leaves/${id}/approve/`, { method: 'POST', body: JSON.stringify({ remarks: remarks ?? '' }) }),
    rejectLeave: (id: string, remarks?: string) =>
        apiRequest<StudentLeave>(`/academic/student-leaves/${id}/reject/`, { method: 'POST', body: JSON.stringify({ remarks: remarks ?? 'Rejected.' }) }),
    cancelLeave: (id: string) =>
        apiRequest<{ status: string }>(`/academic/student-leaves/${id}/cancel/`, { method: 'POST' }),
};

// ── Complaints ────────────────────────────────────────────────────────────────

export interface Complaint {
    complaint_id: string;
    category: 'academic' | 'facility' | 'staff' | 'billing' | 'bullying' | 'safety' | 'other';
    title: string;
    description: string;
    anonymous: boolean;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    submitted_by?: string;
    submitted_by_name?: string;
    assigned_to?: string;
    assigned_to_name?: string;
    resolution_note?: string;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
}

export const complaintAPI = {
    getComplaints: (params?: { status?: string; category?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<Complaint[]>(`/academic/complaints/${q}`);
    },
    submitComplaint: (data: { category: string; title: string; description: string; anonymous?: boolean; priority?: string }) =>
        apiRequest<Complaint>('/academic/complaints/', { method: 'POST', body: JSON.stringify(data) }),
    resolveComplaint: (id: string, resolution_note: string) =>
        apiRequest<Complaint>(`/academic/complaints/${id}/resolve/`, { method: 'POST', body: JSON.stringify({ resolution_note }) }),
    assignComplaint: (id: string, assigned_to: string) =>
        apiRequest<Complaint>(`/academic/complaints/${id}/assign/`, { method: 'POST', body: JSON.stringify({ assigned_to }) }),
    updateComplaint: (id: string, data: Partial<Complaint>) =>
        apiRequest<Complaint>(`/academic/complaints/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── HR Appraisal ──────────────────────────────────────────────────────────────

export interface AppraisalCycle {
    cycle_id: string;
    name: string;
    period_start: string;
    period_end: string;
    status: 'draft' | 'active' | 'closed';
    form_count: number;
    created_at: string;
}

export interface AppraisalForm {
    form_id: string;
    cycle: string;
    cycle_name?: string;
    employee: string;
    employee_name?: string;
    reviewer?: string;
    reviewer_name?: string;
    punctuality?: number;
    subject_knowledge?: number;
    student_engagement?: number;
    communication?: number;
    teamwork?: number;
    overall_score?: number;
    employee_comments?: string;
    reviewer_comments?: string;
    goals_next_period?: string;
    status: 'pending' | 'self_reviewed' | 'completed';
    submitted_at?: string;
    completed_at?: string;
}

export const appraisalAPI = {
    // Cycles
    getCycles: () => apiRequest<AppraisalCycle[]>('/hr/appraisal-cycles/'),
    createCycle: (data: { name: string; period_start: string; period_end: string }) =>
        apiRequest<AppraisalCycle>('/hr/appraisal-cycles/', { method: 'POST', body: JSON.stringify(data) }),
    activateCycle: (id: string) =>
        apiRequest<{ status: string }>(`/hr/appraisal-cycles/${id}/activate/`, { method: 'POST' }),
    closeCycle: (id: string) =>
        apiRequest<{ status: string }>(`/hr/appraisal-cycles/${id}/close/`, { method: 'POST' }),

    // Forms
    getForms: (params?: { cycle?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<AppraisalForm[]>(`/hr/appraisals/${q}`);
    },
    createForm: (data: { cycle: string; employee: string }) =>
        apiRequest<AppraisalForm>('/hr/appraisals/', { method: 'POST', body: JSON.stringify(data) }),
    submitSelfReview: (id: string, employee_comments: string) =>
        apiRequest<AppraisalForm>(`/hr/appraisals/${id}/submit_self_review/`, { method: 'POST', body: JSON.stringify({ employee_comments }) }),
    completeAppraisal: (id: string, data: Partial<AppraisalForm>) =>
        apiRequest<AppraisalForm>(`/hr/appraisals/${id}/complete/`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Fee Discounts ─────────────────────────────────────────────────────────────

export type ScholarshipCategory =
    '' | 'dalit' | 'janajati' | 'madhesi' | 'muslim' | 'karnali'
    | 'differently_abled' | 'female_remote' | 'orphan' | 'martyr_family'
    | 'free_books' | 'staff_child' | 'sibling' | 'merit' | 'other';

export type ScholarshipSource =
    '' | 'school_own' | 'govt_ssdp' | 'govt_egrp' | 'govt_local'
    | 'donor_private' | 'donor_ngo' | 'other';

export const SCHOLARSHIP_CATEGORY_LABELS: Record<ScholarshipCategory, string> = {
    '': 'Not a Scholarship',
    dalit: 'Dalit',
    janajati: 'Janajati',
    madhesi: 'Madhesi',
    muslim: 'Muslim',
    karnali: 'Karnali Province',
    differently_abled: 'Differently-abled',
    female_remote: 'Girl Student (Remote Area)',
    orphan: 'Orphan / Single-parent',
    martyr_family: 'Martyr / Conflict-victim Family',
    free_books: 'Free Books Scheme',
    staff_child: 'Staff Child Concession',
    sibling: 'Sibling Discount',
    merit: 'Merit / Top Performer',
    other: 'Other',
};

export const SCHOLARSHIP_SOURCE_LABELS: Record<ScholarshipSource, string> = {
    '': 'Not a Scholarship',
    school_own: 'School-funded',
    govt_ssdp: 'Govt SSDP',
    govt_egrp: 'Govt EGRP',
    govt_local: 'Local Govt / Palika',
    donor_private: 'Private Donor',
    donor_ngo: 'NGO / INGO',
    other: 'Other',
};

export interface FeeDiscount {
    discount_id: string;
    name: string;
    discount_type: 'percentage' | 'flat';
    value: number;
    max_cap?: number;
    reason?: string;
    is_active: boolean;
    scholarship_category?: ScholarshipCategory;
    scholarship_source?: ScholarshipSource;
    created_at: string;
}

export interface ScholarshipRegisterRow {
    category_key: string;
    category_label: string;
    source_key: string;
    source_label: string;
    count: number;
    amount: string;
    awards: {
        student_id: string;
        student_name: string;
        class: string;
        fee_name: string;
        discount_name: string;
        amount: string;
        due_date: string;
    }[];
}
export interface ScholarshipRegister {
    fiscal_year_bs: string;
    grand_count: number;
    grand_amount: string;
    groups: ScholarshipRegisterRow[];
}

export const feeDiscountAPI = {
    getDiscounts: (active?: boolean) => {
        const q = active !== undefined ? `?active=${active}` : '';
        return fetchAllPages<FeeDiscount>(`/billing/school/discounts/${q}`);
    },
    createDiscount: (data: Partial<FeeDiscount>) =>
        apiRequest<FeeDiscount>('/billing/school/discounts/', { method: 'POST', body: JSON.stringify(data) }),
    updateDiscount: (id: string, data: Partial<FeeDiscount>) =>
        apiRequest<FeeDiscount>(`/billing/school/discounts/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteDiscount: (id: string) =>
        apiRequest<void>(`/billing/school/discounts/${id}/`, { method: 'DELETE' }),
    applyDiscount: (discountId: string, studentFeeId: string) =>
        apiRequest<{ fee_id: string; discount_applied: number; new_amount_due: number }>(
            `/billing/school/discounts/${discountId}/apply/${studentFeeId}/`, { method: 'POST' }
        ),
};

// ── Ledger ────────────────────────────────────────────────────────────────────

export interface LedgerAccount {
    account_id: string;
    name: string;
    account_type: 'cash' | 'bank' | 'mobile_banking' | 'other';
    bank_name?: string;
    account_number?: string;
    opening_balance: number;
    current_balance: number;
    is_active: boolean;
    created_at: string;
}

export interface LedgerEntry {
    entry_id: string;
    account: string;
    date: string;
    entry_type: 'credit' | 'debit';
    amount: number;
    description: string;
    reference?: string;
    recorded_by?: string;
    recorded_by_name?: string;
    created_at: string;
}

export interface LedgerStatement {
    account: LedgerAccount;
    entries: {
        entry_id: string;
        date: string;
        description: string;
        reference: string;
        debit: number | null;
        credit: number | null;
        balance: number;
    }[];
    closing_balance: number;
}

export const ledgerAPI = {
    getAccounts: async () => {
        return fetchAllPages<LedgerAccount>('/billing/school/ledger-accounts/');
    },
    createAccount: (data: Partial<LedgerAccount>) =>
        apiRequest<LedgerAccount>('/billing/school/ledger-accounts/', { method: 'POST', body: JSON.stringify(data) }),
    updateAccount: (id: string, data: Partial<LedgerAccount>) =>
        apiRequest<LedgerAccount>(`/billing/school/ledger-accounts/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    getStatement: (id: string, params?: { from?: string; to?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<LedgerStatement>(`/billing/school/ledger-accounts/${id}/statement/${q}`);
    },

    getEntries: (params?: { account?: string; from?: string; to?: string }) => {
        const q = params ? '?' + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString() : '';
        return apiRequest<LedgerEntry[]>(`/billing/school/ledger-entries/${q}`);
    },
    createEntry: (data: Partial<LedgerEntry>) =>
        apiRequest<LedgerEntry>('/billing/school/ledger-entries/', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Payment Gateways (eSewa / Khalti) ─────────────────────────────────────────

export interface EsewaFormFields {
    [key: string]: string;
}

export interface KhaltiInitResponse {
    pidx: string;
    payment_url: string;
    expires_at: string;
}

export const paymentGatewayAPI = {
    esewaInitiate: (student_fee_id: string) =>
        apiRequest<EsewaFormFields>('/billing/school/esewa/initiate/', { method: 'POST', body: JSON.stringify({ student_fee_id }) }),
    khaltiInitiate: (student_fee_id: string) =>
        apiRequest<KhaltiInitResponse>('/billing/school/khalti/initiate/', { method: 'POST', body: JSON.stringify({ student_fee_id }) }),
};

// ── Live Sessions (Online Classes via Jitsi) ──────────────────────────────────

export interface LiveSession {
    session_id: string;
    timetable: number;
    jitsi_room: string;
    jitsi_url: string;
    status: 'live' | 'ended';
    started_at: string;
    ended_at: string | null;
    subject_name: string;
    class_name: string;
    teacher_name: string | null;
}

export const liveSessionAPI = {
    /** Get all currently live sessions visible to the current user */
    getActive: () => apiRequest<LiveSession[]>('/academic/live-sessions/active/'),
    /** Teacher starts a live class for a timetable slot */
    start: (timetable_id: number) =>
        apiRequest<LiveSession>('/academic/live-sessions/start/', {
            method: 'POST',
            body: JSON.stringify({ timetable_id }),
        }),
    /** Teacher ends an active session */
    end: (session_id: string) =>
        apiRequest<LiveSession>(`/academic/live-sessions/${session_id}/end/`, { method: 'POST' }),
};

export default api;
