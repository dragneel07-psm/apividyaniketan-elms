// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, FileText, PlayCircle, HelpCircle, Pencil, Trash } from 'lucide-react';
import { Lesson } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SortableLessonItemProps {
    id: string; // Namespaced ID (e.g., "lesson-101")
    lesson: Lesson;
    onEdit?: (lesson: Lesson) => void;
    onDelete?: (lessonId: number) => void;
}

export function SortableLessonItem({ id, lesson, onEdit, onDelete }: SortableLessonItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const getIcon = () => {
        switch (lesson.content_type) {
            case 'video': return <PlayCircle className="h-4 w-4 text-rose-500" />;
            case 'quiz': return <HelpCircle className="h-4 w-4 text-amber-500" />;
            default: return <FileText className="h-4 w-4 text-indigo-500" />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-2 last:mb-0">
            <div
                className={cn(
                    "flex items-center gap-3 p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors group",
                    isDragging && "bg-indigo-50 border-indigo-200"
                )}
            >
                <div
                    className="cursor-grab text-slate-300 hover:text-slate-500"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </div>
                {getIcon()}
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{lesson.title}</span>
                {!lesson.is_published && (
                    <div className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">
                        Draft
                    </div>
                )}
                <div className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                    lesson.content_type === 'video' ? "bg-rose-50 text-rose-600" :
                        lesson.content_type === 'quiz' ? "bg-amber-50 text-amber-600" :
                            "bg-indigo-50 text-indigo-600"
                )}>
                    {lesson.content_type}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    {onEdit && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(lesson)}>
                            <Pencil className="h-3 w-3 text-slate-400 hover:text-indigo-600" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(lesson.id)}>
                            <Trash className="h-3 w-3 text-slate-400 hover:text-red-500" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
