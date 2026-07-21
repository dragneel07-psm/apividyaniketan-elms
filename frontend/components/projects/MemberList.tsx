// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crown, Trash2, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { academicAPI, type Student } from '@/lib/api';
import { projectsAPI, type Project, type ProjectMember } from '@/services/projects';

interface MemberListProps {
    project: Project;
    members: ProjectMember[];
    canManage: boolean;
    onChanged: () => void;
}

export function MemberList({ project, members, canManage, onChanged }: MemberListProps) {
    const [pickedStudent, setPickedStudent] = useState('');
    const [busy, setBusy] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        if (!canManage || !project.is_group) return;
        let cancelled = false;
        setLoadingStudents(true);
        const params = project.section ? { section_id: String(project.section) } : undefined;
        academicAPI
            .getStudents(params)
            .then((data) => {
                if (!cancelled) setStudents(data || []);
            })
            .catch(() => {
                if (!cancelled) setStudents([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingStudents(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canManage, project.is_group, project.section]);

    const memberIds = useMemo(() => new Set(members.map((m) => m.student)), [members]);

    const selectableStudents = useMemo(
        () =>
            students
                .filter((s) => {
                    const sid = s.student_id || s.id;
                    return sid && !memberIds.has(sid);
                })
                .map((s) => {
                    const sid = s.student_id || s.id;
                    const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username || s.email || sid;
                    return { id: sid, name };
                })
                .sort((a, b) => a.name.localeCompare(b.name)),
        [students, memberIds],
    );

    const handleAdd = async () => {
        if (!pickedStudent) return;
        setBusy(true);
        try {
            await projectsAPI.addMember(project.project_id, pickedStudent);
            setPickedStudent('');
            toast({ title: 'Member added' });
            onChanged();
        } catch (err) {
            const data = (err as { response?: { data?: unknown } }).response?.data;
            const detail = extractErrorDetail(data);
            toast({
                title: 'Could not add member',
                description: detail || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (memberStudentId: string) => {
        if (!confirm('Remove this member from the project?')) return;
        setBusy(true);
        try {
            await projectsAPI.removeMember(project.project_id, memberStudentId);
            toast({ title: 'Member removed' });
            onChanged();
        } catch {
            toast({ title: 'Remove failed', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const handleSetLeader = async (memberStudentId: string) => {
        setBusy(true);
        try {
            await projectsAPI.setLeader(project.project_id, memberStudentId);
            toast({ title: 'Leader updated' });
            onChanged();
        } catch {
            toast({ title: 'Could not set leader', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            {project.is_group && (project.min_group_size || project.max_group_size) && (
                <p className="text-xs text-slate-500">
                    Group size: {project.min_group_size ?? 0} – {project.max_group_size ?? '∞'} students
                </p>
            )}
            <ul className="space-y-2">
                {members.map((m) => {
                    const isLeader = m.role === 'leader' || m.student === project.leader;
                    return (
                        <li
                            key={m.membership_id}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">
                                    {m.student_detail?.name || m.student}
                                </span>
                                {isLeader && (
                                    <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                        <Crown className="h-3 w-3" /> Leader
                                    </Badge>
                                )}
                            </div>
                            {canManage && (
                                <div className="flex items-center gap-2">
                                    {!isLeader && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={busy}
                                            onClick={() => handleSetLeader(m.student)}
                                        >
                                            Make leader
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => handleRemove(m.student)}
                                        aria-label="Remove member"
                                    >
                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {!members.length && (
                    <li className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                        No members yet.
                    </li>
                )}
            </ul>

            {canManage && project.is_group && (
                <div className="flex items-center gap-2">
                    <Select
                        value={pickedStudent}
                        onValueChange={setPickedStudent}
                        disabled={busy || loadingStudents || selectableStudents.length === 0}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue
                                placeholder={
                                    loadingStudents
                                        ? 'Loading students…'
                                        : selectableStudents.length === 0
                                          ? 'No students available to add'
                                          : 'Pick a student to add'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {selectableStudents.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleAdd} disabled={busy || !pickedStudent}>
                        <UserPlus className="mr-1 h-4 w-4" /> Add
                    </Button>
                </div>
            )}
        </div>
    );
}

function extractErrorDetail(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.student === 'string') return obj.student;
    if (Array.isArray(obj.student) && typeof obj.student[0] === 'string') return obj.student[0] as string;
    if (Array.isArray(obj.non_field_errors) && typeof obj.non_field_errors[0] === 'string')
        return obj.non_field_errors[0] as string;
    return null;
}
