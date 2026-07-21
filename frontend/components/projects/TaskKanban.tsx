// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { AlertTriangle, Clock, GripVertical } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ProjectTask, TaskStatus } from '@/services/projects';

const COLUMNS: Array<{ id: TaskStatus; label: string; tone: string }> = [
    { id: 'todo', label: 'To Do', tone: 'border-slate-300 bg-slate-50' },
    { id: 'in_progress', label: 'In Progress', tone: 'border-blue-300 bg-blue-50' },
    { id: 'review', label: 'Review', tone: 'border-amber-300 bg-amber-50' },
    { id: 'done', label: 'Done', tone: 'border-emerald-300 bg-emerald-50' },
];

interface TaskKanbanProps {
    tasks: ProjectTask[];
    canDrag: boolean;
    onMove: (taskId: string, newStatus: TaskStatus) => void;
}

function TaskCard({ task, canDrag }: { task: ProjectTask; canDrag: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.task_id,
        disabled: !canDrag,
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm ${
                isDragging ? 'opacity-50' : ''
            } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
            {...listeners}
            {...attributes}
        >
            <div className="flex items-start gap-2">
                {canDrag && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-slate-800">{task.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {task.assignee_detail && (
                            <Badge variant="outline" className="font-normal">
                                {task.assignee_detail.name}
                            </Badge>
                        )}
                        {task.weight > 1 && (
                            <Badge
                                variant="outline"
                                className="border-indigo-200 bg-indigo-50 font-normal text-indigo-700"
                                title={`This task contributes ${task.weight}× to project progress`}
                            >
                                ×{task.weight}
                            </Badge>
                        )}
                        {task.due_date && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                            </span>
                        )}
                        {task.is_overdue && task.status !== 'done' && (
                            <span className="inline-flex items-center gap-1 text-rose-600">
                                <AlertTriangle className="h-3 w-3" />
                                Overdue
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Column({
    id,
    label,
    tone,
    tasks,
    canDrag,
}: {
    id: TaskStatus;
    label: string;
    tone: string;
    tasks: ProjectTask[];
    canDrag: boolean;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`flex min-h-[300px] flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-3 transition-colors ${tone} ${
                isOver ? 'ring-2 ring-indigo-400' : ''
            }`}
        >
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                    {label}
                </h3>
                <Badge variant="outline" className="text-xs">
                    {tasks.length}
                </Badge>
            </div>
            <div className="flex flex-col gap-2">
                {tasks.map((t) => (
                    <TaskCard key={t.task_id} task={t} canDrag={canDrag} />
                ))}
                {!tasks.length && (
                    <p className="rounded-md border border-dashed border-slate-200 bg-white/50 py-4 text-center text-xs text-slate-400">
                        Drop tasks here
                    </p>
                )}
            </div>
        </div>
    );
}

export function TaskKanban({ tasks, canDrag, onMove }: TaskKanbanProps) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const grouped: Record<TaskStatus, ProjectTask[]> = {
        todo: [],
        in_progress: [],
        review: [],
        done: [],
        blocked: [],
    };
    for (const t of tasks) grouped[t.status]?.push(t);

    const handleDragEnd = (event: DragEndEvent) => {
        const taskId = String(event.active.id);
        const dest = event.over?.id ? (String(event.over.id) as TaskStatus) : null;
        if (!dest) return;
        const moved = tasks.find((t) => t.task_id === taskId);
        if (!moved || moved.status === dest) return;
        onMove(taskId, dest);
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {COLUMNS.map((col) => (
                    <Column
                        key={col.id}
                        id={col.id}
                        label={col.label}
                        tone={col.tone}
                        tasks={grouped[col.id] || []}
                        canDrag={canDrag}
                    />
                ))}
            </div>
            {grouped.blocked.length > 0 && (
                <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3">
                    <h4 className="text-sm font-semibold text-rose-700">
                        Blocked ({grouped.blocked.length})
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-rose-600">
                        {grouped.blocked.map((t) => (
                            <li key={t.task_id}>• {t.title}</li>
                        ))}
                    </ul>
                </div>
            )}
        </DndContext>
    );
}
