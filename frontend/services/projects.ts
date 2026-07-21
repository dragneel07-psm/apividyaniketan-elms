// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from './api';

// --- Types ---

export type ProjectStatus = 'draft' | 'active' | 'submitted' | 'graded' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type UpdateKind =
    | 'comment'
    | 'status_change'
    | 'task_added'
    | 'task_completed'
    | 'submission'
    | 'grade';

export interface UserBrief {
    user_id: string;
    username: string;
    full_name: string;
    role: string;
}

export interface StudentBrief {
    student_id: string;
    name: string;
}

export interface SectionBrief {
    id: number;
    name: string;
    academic_class_name: string;
}

export interface Project {
    project_id: string;
    title: string;
    description: string;
    subject: number | null;
    section: number | null;
    section_detail?: SectionBrief | null;
    mentor: string;
    mentor_detail?: UserBrief | null;
    leader: string | null;
    leader_detail?: StudentBrief | null;
    is_group: boolean;
    min_group_size: number | null;
    max_group_size: number | null;
    start_date: string | null;
    due_date: string | null;
    status: ProjectStatus;
    final_grade: number | null;
    rubric_json: Record<string, unknown> | null;
    progress_percent: number;
    progress_label: string;
    member_count: number;
    task_count: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectMember {
    membership_id: string;
    project: string;
    student: string;
    student_detail?: StudentBrief | null;
    role: 'leader' | 'member';
    joined_at: string;
}

export interface ProjectTask {
    task_id: string;
    project: string;
    title: string;
    description: string;
    assignee: string | null;
    assignee_detail?: StudentBrief | null;
    weight: number;
    status: TaskStatus;
    order: number;
    due_date: string | null;
    completed_at: string | null;
    is_overdue: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProjectUpdate {
    update_id: string;
    project: string;
    task: string | null;
    author: string | null;
    author_detail?: UserBrief | null;
    kind: UpdateKind;
    body: string;
    meta: Record<string, unknown> | null;
    created_at: string;
}

export interface RubricTemplateLine {
    criterion: string;
    max?: number;
}

export interface RubricTemplate {
    template_id: string;
    name: string;
    description: string;
    owner: string | null;
    owner_detail?: UserBrief | null;
    subject: number | null;
    criteria_json: RubricTemplateLine[];
    is_shared: boolean;
    created_at: string;
    updated_at: string;
}

export interface MentorDashboardEntry {
    project_id: string;
    title: string;
    status: ProjectStatus;
    progress_percent: number;
    progress_label: string;
    due_date: string | null;
    overdue_task_count: number;
    is_at_risk: boolean;
}

interface Paginated<T> {
    count?: number;
    next?: string | null;
    previous?: string | null;
    results: T[];
}

function unwrap<T>(data: T[] | Paginated<T>): T[] {
    if (Array.isArray(data)) return data;
    return data?.results || [];
}

// --- API ---

export const projectsAPI = {
    list: async (params?: Record<string, string | number | undefined>): Promise<Project[]> => {
        const res = await api.get<Project[] | Paginated<Project>>('/api/projects/projects/', { params });
        return unwrap(res.data);
    },
    get: async (id: string): Promise<Project> => {
        const res = await api.get<Project>(`/api/projects/projects/${id}/`);
        return res.data;
    },
    create: async (payload: Partial<Project>): Promise<Project> => {
        const res = await api.post<Project>('/api/projects/projects/', payload);
        return res.data;
    },
    update: async (id: string, payload: Partial<Project>): Promise<Project> => {
        const res = await api.patch<Project>(`/api/projects/projects/${id}/`, payload);
        return res.data;
    },
    addMember: async (id: string, studentId: string, role: 'leader' | 'member' = 'member') => {
        const res = await api.post<ProjectMember>(`/api/projects/projects/${id}/members/`, {
            student: studentId,
            role,
        });
        return res.data;
    },
    removeMember: async (id: string, studentId: string) => {
        await api.delete(`/api/projects/projects/${id}/members/${studentId}/`);
    },
    setLeader: async (id: string, studentId: string) => {
        const res = await api.post<Project>(`/api/projects/projects/${id}/leader/`, { student: studentId });
        return res.data;
    },
    activate: async (id: string) => {
        const res = await api.post<Project>(`/api/projects/projects/${id}/activate/`);
        return res.data;
    },
    submit: async (id: string, notes = '') => {
        const res = await api.post(`/api/projects/projects/${id}/submit/`, { notes });
        return res.data;
    },
    grade: async (
        id: string,
        payload: { final_grade: number; rubric_json?: Record<string, unknown>; note?: string },
    ) => {
        const res = await api.post<Project>(`/api/projects/projects/${id}/grade/`, payload);
        return res.data;
    },
    mine: async (): Promise<Project[]> => {
        const res = await api.get<Project[] | Paginated<Project>>('/api/projects/projects/mine/');
        return unwrap(res.data);
    },
    mentorDashboard: async (): Promise<MentorDashboardEntry[]> => {
        const res = await api.get<MentorDashboardEntry[]>('/api/projects/projects/dashboard/mentor/');
        return res.data;
    },
    listMembers: async (id: string): Promise<ProjectMember[]> => {
        const res = await api.get<ProjectMember[]>(`/api/projects/projects/${id}/members/`);
        return res.data;
    },
};

export const projectTasksAPI = {
    listForProject: async (projectId: string): Promise<ProjectTask[]> => {
        const res = await api.get<ProjectTask[] | Paginated<ProjectTask>>('/api/projects/tasks/', {
            params: { project: projectId },
        });
        return unwrap(res.data);
    },
    create: async (payload: Partial<ProjectTask>): Promise<ProjectTask> => {
        const res = await api.post<ProjectTask>('/api/projects/tasks/', payload);
        return res.data;
    },
    update: async (id: string, payload: Partial<ProjectTask>): Promise<ProjectTask> => {
        const res = await api.patch<ProjectTask>(`/api/projects/tasks/${id}/`, payload);
        return res.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/projects/tasks/${id}/`);
    },
};

export const rubricTemplatesAPI = {
    list: async (): Promise<RubricTemplate[]> => {
        const res = await api.get<RubricTemplate[] | Paginated<RubricTemplate>>(
            '/api/projects/rubric-templates/',
        );
        return unwrap(res.data);
    },
    create: async (payload: {
        name: string;
        description?: string;
        criteria_json: RubricTemplateLine[];
        subject?: number | null;
    }): Promise<RubricTemplate> => {
        const res = await api.post<RubricTemplate>('/api/projects/rubric-templates/', payload);
        return res.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/projects/rubric-templates/${id}/`);
    },
};

export const projectUpdatesAPI = {
    listForProject: async (projectId: string): Promise<ProjectUpdate[]> => {
        const res = await api.get<ProjectUpdate[] | Paginated<ProjectUpdate>>('/api/projects/updates/', {
            params: { project: projectId },
        });
        return unwrap(res.data);
    },
    comment: async (projectId: string, body: string): Promise<ProjectUpdate> => {
        const res = await api.post<ProjectUpdate>('/api/projects/updates/', {
            project: projectId,
            kind: 'comment',
            body,
        });
        return res.data;
    },
};

// --- React Query hooks ---

export const projectKeys = {
    all: ['projects'] as const,
    list: (filter?: string) => ['projects', 'list', filter ?? 'all'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    tasks: (id: string) => ['projects', 'tasks', id] as const,
    updates: (id: string) => ['projects', 'updates', id] as const,
    members: (id: string) => ['projects', 'members', id] as const,
    mentorDashboard: () => ['projects', 'mentor-dashboard'] as const,
    rubricTemplates: () => ['projects', 'rubric-templates'] as const,
};

export function useProjects(filter?: 'mine' | 'all') {
    return useQuery({
        queryKey: projectKeys.list(filter),
        queryFn: () => (filter === 'mine' ? projectsAPI.mine() : projectsAPI.list()),
    });
}

export function useProject(id: string | undefined) {
    return useQuery({
        queryKey: id ? projectKeys.detail(id) : ['projects', 'detail', 'none'],
        queryFn: () => projectsAPI.get(id as string),
        enabled: Boolean(id),
    });
}

export function useProjectTasks(id: string | undefined) {
    return useQuery({
        queryKey: id ? projectKeys.tasks(id) : ['projects', 'tasks', 'none'],
        queryFn: () => projectTasksAPI.listForProject(id as string),
        enabled: Boolean(id),
    });
}

export function useProjectUpdates(id: string | undefined) {
    return useQuery({
        queryKey: id ? projectKeys.updates(id) : ['projects', 'updates', 'none'],
        queryFn: () => projectUpdatesAPI.listForProject(id as string),
        enabled: Boolean(id),
    });
}

export function useProjectMembers(id: string | undefined) {
    return useQuery({
        queryKey: id ? projectKeys.members(id) : ['projects', 'members', 'none'],
        queryFn: () => projectsAPI.listMembers(id as string),
        enabled: Boolean(id),
    });
}

export function useRubricTemplates() {
    return useQuery({
        queryKey: projectKeys.rubricTemplates(),
        queryFn: rubricTemplatesAPI.list,
    });
}

export function useCreateRubricTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: rubricTemplatesAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.rubricTemplates() });
        },
    });
}

export function useMentorDashboard() {
    return useQuery({
        queryKey: projectKeys.mentorDashboard(),
        queryFn: projectsAPI.mentorDashboard,
    });
}

export function useCreateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: projectsAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}

export function useUpdateProject(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<Project>) => projectsAPI.update(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
            qc.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}

export function useCreateTask(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<ProjectTask>) =>
            projectTasksAPI.create({ ...payload, project: projectId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
            qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });
}

export function useUpdateTask(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<ProjectTask> }) =>
            projectTasksAPI.update(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) });
            qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });
}

export function useAddMember(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, role }: { studentId: string; role?: 'leader' | 'member' }) =>
            projectsAPI.addMember(projectId, studentId, role),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            qc.invalidateQueries({ queryKey: projectKeys.members(projectId) });
        },
    });
}

export function useActivateProject(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => projectsAPI.activate(projectId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });
}

export function useGradeProject(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: { final_grade: number; rubric_json?: Record<string, unknown>; note?: string }) =>
            projectsAPI.grade(projectId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            qc.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}

export function usePostComment(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: string) => projectUpdatesAPI.comment(projectId, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: projectKeys.updates(projectId) });
        },
    });
}
