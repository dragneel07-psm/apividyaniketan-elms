// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { Award, FolderKanban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects } from '@/services/projects';

interface ProjectGradesCardProps {
    /** Where the project links should point. Defaults to /student/projects. */
    detailHrefBase?: string;
    /** Hide entirely when there are no graded projects (default true). */
    hideWhenEmpty?: boolean;
}

/**
 * Read-time aggregation card that surfaces graded projects on the student
 * grades / parent grades report page. Pulls from useProjects() — backend
 * project_visibility_q already restricts to projects the requester can see,
 * so this is a simple client-side filter for status === 'graded'.
 *
 * Phase 9 #6 chose Option A (read-time aggregation, no Result rows). If
 * a future product call wants projects to count toward GPA/class-rank,
 * Option B/C (synthetic Result rows) is the migration path.
 */
export function ProjectGradesCard({
    detailHrefBase = '/student/projects',
    hideWhenEmpty = true,
}: ProjectGradesCardProps) {
    const projectsQ = useProjects('all');
    const graded = (projectsQ.data || []).filter((p) => p.status === 'graded' && p.final_grade != null);

    if (projectsQ.isLoading) {
        return null;
    }
    if (graded.length === 0) {
        if (hideWhenEmpty) return null;
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FolderKanban className="h-4 w-4 text-indigo-500" /> Project grades
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500">No graded projects yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4 text-indigo-500" /> Project grades
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="divide-y divide-slate-100">
                    {graded.map((p) => (
                        <li key={p.project_id} className="py-3">
                            <Link
                                href={`${detailHrefBase}/${p.project_id}`}
                                className="flex items-center justify-between gap-3 hover:text-indigo-600"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {p.title}
                                    </p>
                                    {p.mentor_detail && (
                                        <p className="text-xs text-slate-500">
                                            Mentor: {p.mentor_detail.full_name}
                                        </p>
                                    )}
                                </div>
                                <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                    <Award className="h-3 w-3" />
                                    {p.final_grade}
                                </Badge>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
