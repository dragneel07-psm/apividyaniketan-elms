// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Pencil, Trash } from 'lucide-react';
import { Chapter, Lesson } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SortableLessonItem } from './sortable-lesson-item';

interface SortableChapterItemProps {
    id: string; // Namespaced ID (e.g., "chapter-1")
    chapter: Chapter;
    onEdit: (chapter: Chapter) => void;
    onDelete: (chapterId: number) => void;
    onAddLesson: (chapterId: number) => void;
    onEditLesson: (lesson: Lesson) => void;
    onDeleteLesson: (lessonId: number) => void;
}

export function SortableChapterItem({ id, chapter, onEdit, onDelete, onAddLesson, onEditLesson, onDeleteLesson }: SortableChapterItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id, data: { type: 'Chapter', chapter } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const lessonIds = chapter.lessons?.map(l => `lesson-${l.id}`) || [];

    return (
        <div ref={setNodeRef} style={style} className="mb-4">
            <Card className={cn("border-slate-200 transition-shadow", isDragging && "shadow-xl ring-2 ring-indigo-500 ring-offset-2")}>
                <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-100 group">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-grab text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-lg">{chapter.title}</h3>
                            {chapter.description && (
                                <p className="text-xs text-slate-500 line-clamp-1">{chapter.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => onEdit(chapter)}>
                                <Pencil className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(chapter.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="p-2 space-y-1 bg-white min-h-[50px]">
                        <div className="ml-10">
                            <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                                {chapter.lessons && chapter.lessons.length > 0 ? (
                                    chapter.lessons.map(lesson => (
                                        <SortableLessonItem
                                            key={lesson.id}
                                            id={`lesson-${lesson.id}`}
                                            lesson={lesson}
                                            onEdit={onEditLesson}
                                            onDelete={onDeleteLesson}
                                        />
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-sm text-slate-400 italic">
                                        No lessons in this chapter yet.
                                    </div>
                                )}
                            </SortableContext>
                        </div>
                        <div className="ml-10 p-2 pt-1 border-t border-dashed border-slate-100 mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 w-full justify-start text-xs font-bold h-8"
                                onClick={() => onAddLesson(chapter.id)}
                            >
                                <Plus className="h-3 w-3 mr-2" /> Add Lesson
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
