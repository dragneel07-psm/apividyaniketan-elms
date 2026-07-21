// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { formatDistanceToNow } from 'date-fns';
import {
    Award,
    CheckCircle2,
    GitBranch,
    MessageSquare,
    PlusCircle,
    Send,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ProjectUpdate, UpdateKind } from '@/services/projects';

interface ActivityFeedProps {
    updates: ProjectUpdate[];
}

const KIND_LABEL: Record<UpdateKind, string> = {
    comment: 'Comment',
    status_change: 'Status change',
    task_added: 'Task added',
    task_completed: 'Task completed',
    submission: 'Submitted',
    grade: 'Graded',
};

function iconFor(kind: UpdateKind) {
    switch (kind) {
        case 'comment':
            return <MessageSquare className="h-4 w-4 text-indigo-500" />;
        case 'status_change':
            return <GitBranch className="h-4 w-4 text-amber-500" />;
        case 'task_added':
            return <PlusCircle className="h-4 w-4 text-blue-500" />;
        case 'task_completed':
            return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case 'submission':
            return <Send className="h-4 w-4 text-sky-500" />;
        case 'grade':
            return <Award className="h-4 w-4 text-purple-500" />;
        default:
            return <MessageSquare className="h-4 w-4 text-slate-400" />;
    }
}

export function ActivityFeed({ updates }: ActivityFeedProps) {
    if (!updates.length) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No activity yet.
            </div>
        );
    }
    return (
        <ol className="space-y-3">
            {updates.map((u) => {
                const author = u.author_detail?.full_name || u.author_detail?.username || 'System';
                const when = u.created_at
                    ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true })
                    : '';
                return (
                    <li
                        key={u.update_id}
                        className="flex gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                    >
                        <div className="mt-0.5">{iconFor(u.kind)}</div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-800">{author}</span>
                                <Badge variant="outline" className="text-[10px]">
                                    {KIND_LABEL[u.kind]}
                                </Badge>
                                <span className="text-xs text-slate-400">{when}</span>
                            </div>
                            {u.body && <p className="mt-1 break-words text-sm text-slate-600">{u.body}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
