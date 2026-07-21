// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useEffect, useRef, useState } from 'react';

import { apiRequest, getAuthToken } from './api';

// --- Types (mirror frontend/services/projects.ts) ---

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
    section: number | null;
    section_detail?: SectionBrief | null;
    mentor: string;
    mentor_detail?: UserBrief | null;
    leader: string | null;
    leader_detail?: StudentBrief | null;
    is_group: boolean;
    min_group_size: number | null;
    max_group_size: number | null;
    due_date: string | null;
    status: ProjectStatus;
    final_grade: number | null;
    progress_percent: number;
    progress_label: string;
    member_count: number;
    task_count: number;
    created_at: string;
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
    due_date: string | null;
    is_overdue: boolean;
}

export interface ProjectUpdate {
    update_id: string;
    project: string;
    author: string | null;
    author_detail?: UserBrief | null;
    kind: UpdateKind;
    body: string;
    created_at: string;
}

interface Paginated<T> {
    results: T[];
}

function unwrap<T>(payload: T[] | Paginated<T>): T[] {
    if (Array.isArray(payload)) return payload;
    return payload?.results || [];
}

// --- API ---

export const projectsAPI = {
    list: async (filter: 'mine' | 'all' = 'all'): Promise<Project[]> => {
        const path = filter === 'mine' ? '/projects/projects/mine/' : '/projects/projects/';
        const data = await apiRequest<Project[] | Paginated<Project>>(path);
        return unwrap(data);
    },
    get: (id: string) => apiRequest<Project>(`/projects/projects/${id}/`),
    listMembers: (id: string) => apiRequest<ProjectMember[]>(`/projects/projects/${id}/members/`),
    tasks: async (id: string): Promise<ProjectTask[]> => {
        const data = await apiRequest<ProjectTask[] | Paginated<ProjectTask>>(
            `/projects/tasks/?project=${id}`,
        );
        return unwrap(data);
    },
    updates: async (id: string): Promise<ProjectUpdate[]> => {
        const data = await apiRequest<ProjectUpdate[] | Paginated<ProjectUpdate>>(
            `/projects/updates/?project=${id}`,
        );
        return unwrap(data);
    },
    setTaskStatus: (taskId: string, status: TaskStatus) =>
        apiRequest<ProjectTask>(`/projects/tasks/${taskId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),
    comment: (projectId: string, body: string) =>
        apiRequest<ProjectUpdate>('/projects/updates/', {
            method: 'POST',
            body: JSON.stringify({ project: projectId, kind: 'comment', body }),
        }),
    submit: (projectId: string, notes = '') =>
        apiRequest(`/projects/projects/${projectId}/submit/`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),
};

// --- WebSocket hook ---

export type ProjectWsStatus = 'connecting' | 'open' | 'closed' | 'error';

export type ProjectEvent =
    | { type: 'project.task.created' }
    | { type: 'project.task.updated' }
    | { type: 'project.task.deleted' }
    | { type: 'project.update.created' }
    | { type: 'project.status.changed'; from: string; to: string }
    | { type: 'project.graded'; final_grade?: number }
    | { type: 'project.progress'; percent: number; label: string }
    | { type: 'pong' };

function buildWsUrl(projectId: string, token: string): string {
    // EXPO_PUBLIC_API_URL is e.g. http://192.168.1.10:8000/api — strip the
    // trailing /api and swap http(s) for ws(s) to address the channels endpoint.
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    const wsOrigin = origin.startsWith('https')
        ? origin.replace(/^https/, 'wss')
        : origin.replace(/^http/, 'ws');
    return `${wsOrigin}/ws/projects/${projectId}/?token=${token}`;
}

export function useProjectSocket(
    projectId: string | undefined,
    onEvent?: (e: ProjectEvent) => void,
) {
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [status, setStatus] = useState<ProjectWsStatus>('closed');

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;

        async function connect() {
            const token = await getAuthToken();
            if (cancelled || !token) return;

            try {
                const ws = new WebSocket(buildWsUrl(projectId!, token));
                wsRef.current = ws;
                setStatus('connecting');

                ws.onopen = () => {
                    setStatus('open');
                    pingTimerRef.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30_000);
                };
                ws.onmessage = (evt) => {
                    try {
                        const msg = JSON.parse(evt.data) as ProjectEvent;
                        onEventRef.current?.(msg);
                    } catch {
                        // ignore malformed
                    }
                };
                ws.onerror = () => setStatus('error');
                ws.onclose = (e) => {
                    setStatus('closed');
                    if (pingTimerRef.current) {
                        clearInterval(pingTimerRef.current);
                        pingTimerRef.current = null;
                    }
                    if (!cancelled && e.code !== 1000 && e.code !== 4001 && e.code !== 4403) {
                        reconnectTimerRef.current = setTimeout(connect, 5000);
                    }
                };
            } catch {
                setStatus('error');
            }
        }

        connect();
        return () => {
            cancelled = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (pingTimerRef.current) clearInterval(pingTimerRef.current);
            if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
                wsRef.current.close(1000);
            }
        };
    }, [projectId]);

    return { status };
}
