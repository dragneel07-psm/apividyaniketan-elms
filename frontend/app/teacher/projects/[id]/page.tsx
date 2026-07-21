// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Plus, Send, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { ActivityFeed } from '@/components/projects/ActivityFeed';
import { MemberList } from '@/components/projects/MemberList';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { TaskKanban } from '@/components/projects/TaskKanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjectSocket } from '@/hooks/useProjectSocket';
import { toast } from '@/hooks/use-toast';
import { getUser } from '@/lib/auth';
import {
    projectKeys,
    projectsAPI,
    useActivateProject,
    useCreateTask,
    usePostComment,
    useProject,
    useProjectMembers,
    useProjectTasks,
    useProjectUpdates,
    useUpdateTask,
    type ProjectStatus,
    type TaskStatus,
} from '@/services/projects';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function TeacherProjectDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;
    const qc = useQueryClient();

    const projectQ = useProject(id);
    const tasksQ = useProjectTasks(id);
    const updatesQ = useProjectUpdates(id);
    const membersQ = useProjectMembers(id);
    const wsStatus = useProjectSocket(id).status;

    const updateTask = useUpdateTask(id || '');
    const createTask = useCreateTask(id || '');
    const activate = useActivateProject(id || '');
    const postComment = usePostComment(id || '');

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskWeight, setNewTaskWeight] = useState<string>('1');
    const [comment, setComment] = useState('');
    const me = getUser();

    if (projectQ.isLoading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
    if (projectQ.error || !projectQ.data) {
        return <p className="p-6 text-sm text-rose-600">Project not found or access denied.</p>;
    }

    const project = projectQ.data;
    const isMentor = me?.user_id === project.mentor;
    const isAdmin = me?.role === 'admin' || me?.role === 'staff';
    const canManage = isMentor || isAdmin;

    const handleMove = (taskId: string, newStatus: TaskStatus) => {
        updateTask.mutate(
            { id: taskId, payload: { status: newStatus } },
            {
                onError: () => toast({ title: 'Status update failed', variant: 'destructive' }),
            },
        );
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        const weight = Math.max(1, Math.floor(Number(newTaskWeight) || 1));
        try {
            await createTask.mutateAsync({ title: newTaskTitle.trim(), weight });
            setNewTaskTitle('');
            setNewTaskWeight('1');
            toast({ title: 'Task added' });
        } catch {
            toast({ title: 'Could not add task', variant: 'destructive' });
        }
    };

    const handleActivate = async () => {
        try {
            await activate.mutateAsync();
            toast({ title: 'Project is now active' });
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({ title: 'Activation failed', description: detail, variant: 'destructive' });
        }
    };

    const handleSubmit = async () => {
        try {
            await projectsAPI.submit(project.project_id);
            toast({ title: 'Project submitted' });
            qc.invalidateQueries({ queryKey: projectKeys.detail(project.project_id) });
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({ title: 'Submit failed', description: detail, variant: 'destructive' });
        }
    };

    const handlePostComment = async () => {
        if (!comment.trim()) return;
        try {
            await postComment.mutateAsync(comment.trim());
            setComment('');
        } catch {
            toast({ title: 'Comment failed', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
                            <Badge className={STATUS_TONE[project.status]}>{project.status}</Badge>
                            <span
                                className={`inline-flex items-center gap-1 text-xs ${
                                    wsStatus === 'open' ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                                title={`WebSocket ${wsStatus}`}
                            >
                                {wsStatus === 'open' ? (
                                    <Wifi className="h-3 w-3" />
                                ) : (
                                    <WifiOff className="h-3 w-3" />
                                )}
                                {wsStatus}
                            </span>
                        </div>
                        {project.section_detail && (
                            <p className="text-sm text-slate-500">
                                {project.section_detail.academic_class_name} · Section{' '}
                                {project.section_detail.name}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && project.status === 'draft' && (
                        <Button onClick={handleActivate} disabled={activate.isPending}>
                            Activate
                        </Button>
                    )}
                    {canManage && project.status === 'submitted' && (
                        <Button asChild>
                            <Link href={`/teacher/projects/${project.project_id}/grade`}>Grade project</Link>
                        </Button>
                    )}
                    {project.status === 'active' && (
                        <Button variant="outline" onClick={handleSubmit}>
                            <Send className="mr-1 h-4 w-4" /> Submit
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProjectProgressBar value={project.progress_percent} label={project.progress_label} />
                        {project.due_date && (
                            <p className="mt-3 text-xs text-slate-500">
                                Due {new Date(project.due_date).toLocaleString()}
                            </p>
                        )}
                        {project.final_grade != null && (
                            <p className="mt-2 text-sm text-slate-700">
                                Final grade: <span className="font-semibold">{project.final_grade}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MemberList
                            project={project}
                            members={membersQ.data || []}
                            canManage={canManage}
                            onChanged={() => {
                                qc.invalidateQueries({ queryKey: projectKeys.detail(project.project_id) });
                                qc.invalidateQueries({ queryKey: projectKeys.members(project.project_id) });
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Tasks</CardTitle>
                    {canManage && (
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="New task title"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                className="w-64"
                            />
                            <Input
                                type="number"
                                min={1}
                                step={1}
                                value={newTaskWeight}
                                onChange={(e) => setNewTaskWeight(e.target.value)}
                                title="Weight — how much this task contributes to overall progress"
                                aria-label="Task weight"
                                className="w-20"
                            />
                            <Button onClick={handleAddTask} disabled={createTask.isPending}>
                                <Plus className="mr-1 h-4 w-4" /> Add
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {tasksQ.isLoading ? (
                        <p className="text-sm text-slate-500">Loading tasks…</p>
                    ) : (
                        <TaskKanban
                            tasks={tasksQ.data || []}
                            canDrag={canManage}
                            onMove={handleMove}
                        />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                        <Textarea
                            placeholder="Leave a comment for the team…"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={2}
                        />
                        <Button onClick={handlePostComment} disabled={postComment.isPending || !comment.trim()}>
                            <MessageSquare className="mr-1 h-4 w-4" /> Post
                        </Button>
                    </div>
                    {updatesQ.isLoading ? (
                        <p className="text-sm text-slate-500">Loading activity…</p>
                    ) : (
                        <ActivityFeed updates={updatesQ.data || []} />
                    )}
                </CardContent>
            </Card>

            {project.description && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{project.description}</p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
