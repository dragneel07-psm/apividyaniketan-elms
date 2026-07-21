// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { AlertTriangle, ListChecks, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { useMentorDigestSocket } from '@/hooks/useMentorDigestSocket';
import { useMentorDashboard, useProjects, type ProjectStatus } from '@/services/projects';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function TeacherProjectsPage() {
    const [filter, setFilter] = useState<'mine' | 'all'>('mine');
    const projectsQ = useProjects(filter);
    const dashboardQ = useMentorDashboard();
    // One WebSocket per mentor; auto-invalidates the dashboard query on
    // any project event for projects this teacher mentors.
    useMentorDigestSocket();

    const atRisk = useMemo(
        () => (dashboardQ.data || []).filter((p) => p.is_at_risk),
        [dashboardQ.data],
    );

    return (
        <div className="space-y-6 p-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
                    <p className="text-sm text-slate-500">
                        Mentor and track group + individual student projects.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/teacher/projects/new">
                        <Plus className="mr-1 h-4 w-4" /> New project
                    </Link>
                </Button>
            </header>

            {atRisk.length > 0 && (
                <Card className="border-rose-200 bg-rose-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base text-rose-700">
                            <AlertTriangle className="h-4 w-4" />
                            {atRisk.length} project{atRisk.length === 1 ? '' : 's'} at risk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {atRisk.map((p) => (
                                <li
                                    key={p.project_id}
                                    className="flex items-center justify-between rounded-md bg-white p-3 text-sm shadow-sm"
                                >
                                    <Link
                                        href={`/teacher/projects/${p.project_id}`}
                                        className="font-medium text-slate-800 hover:text-indigo-600"
                                    >
                                        {p.title}
                                    </Link>
                                    <span className="text-xs text-rose-600">
                                        {p.overdue_task_count} overdue task{p.overdue_task_count === 1 ? '' : 's'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'mine' | 'all')}>
                <TabsList>
                    <TabsTrigger value="mine">My projects</TabsTrigger>
                    <TabsTrigger value="all">All in tenant</TabsTrigger>
                </TabsList>
                <TabsContent value={filter} className="mt-4">
                    {projectsQ.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
                    {projectsQ.error && (
                        <p className="text-sm text-rose-600">Failed to load projects.</p>
                    )}
                    {projectsQ.data && projectsQ.data.length === 0 && (
                        <div className="rounded-md border border-dashed border-slate-200 p-10 text-center">
                            <ListChecks className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                            <p className="text-sm text-slate-500">No projects yet.</p>
                            <Button asChild className="mt-3">
                                <Link href="/teacher/projects/new">Create the first one</Link>
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {(projectsQ.data || []).map((p) => (
                            <Link
                                key={p.project_id}
                                href={`/teacher/projects/${p.project_id}`}
                                className="block"
                            >
                                <Card className="h-full transition-shadow hover:shadow-md">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base">{p.title}</CardTitle>
                                            <Badge className={STATUS_TONE[p.status]}>{p.status}</Badge>
                                        </div>
                                        {p.section_detail && (
                                            <p className="text-xs text-slate-500">
                                                {p.section_detail.academic_class_name} · Section {p.section_detail.name}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <ProjectProgressBar value={p.progress_percent} label={p.progress_label} />
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>
                                                {p.member_count} member{p.member_count === 1 ? '' : 's'} ·{' '}
                                                {p.task_count} task{p.task_count === 1 ? '' : 's'}
                                            </span>
                                            {p.due_date && (
                                                <span>Due {new Date(p.due_date).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
