// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { FolderKanban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { useProjects, type ProjectStatus } from '@/services/projects';
import { useTranslation } from '@/lib/localization';
import { formatDate, formatNumber } from '@/lib/i18n/format';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function StudentProjectsPage() {
    const { t, locale } = useTranslation();
    // Backend's project_visibility_q already filters to projects the student
    // is a member of or leader of, so the regular list is sufficient.
    const projectsQ = useProjects('all');

    return (
        <div className="space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">{t('student.projectsList.pageTitle')}</h1>
                <p className="text-sm text-slate-500">
                    {t('student.projectsList.subtitle')}
                </p>
            </header>

            {projectsQ.isLoading && <p className="text-sm text-slate-500">{t('student.projectsList.loading')}</p>}
            {projectsQ.error && (
                <p className="text-sm text-rose-600">{t('student.projectsList.errorLoad')}</p>
            )}
            {projectsQ.data && projectsQ.data.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 p-10 text-center">
                    <FolderKanban className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                        {t('student.projectsList.empty')}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(projectsQ.data || []).map((p) => (
                    <Link key={p.project_id} href={`/student/projects/${p.project_id}`} className="block">
                        <Card className="h-full transition-shadow hover:shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base">{p.title}</CardTitle>
                                    <Badge className={STATUS_TONE[p.status]}>{p.status}</Badge>
                                </div>
                                {p.mentor_detail && (
                                    <p className="text-xs text-slate-500">
                                        {t('student.projectsList.labelMentor', { name: p.mentor_detail.full_name })}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ProjectProgressBar value={p.progress_percent} label={p.progress_label} />
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        {p.task_count === 1
                                            ? t('student.projectsList.taskCountSingular', { count: formatNumber(p.task_count, locale) })
                                            : t('student.projectsList.taskCountPlural', { count: formatNumber(p.task_count, locale) })}
                                    </span>
                                    {p.due_date && (
                                        <span>{t('student.projectsList.labelDue', { date: formatDate(new Date(p.due_date), locale) })}</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
