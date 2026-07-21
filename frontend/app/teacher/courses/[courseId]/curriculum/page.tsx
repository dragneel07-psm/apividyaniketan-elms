// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { academicAPI, Chapter, Lesson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { ChapterDialog } from '@/components/courses/chapter-dialog';
import { LessonDialog } from '@/components/courses/lesson-dialog';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableChapterItem } from '@/components/courses/sortable-chapter-item';

export default function CourseCurriculumPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [chapters, setChapters] = useState<Chapter[]>([]);

    // Dialog States
    const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
    const [chapterMode, setChapterMode] = useState<'create' | 'edit'>('create');
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

    const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
    const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadCurriculum = async () => {
        try {
            const data = await academicAPI.getChapters(parseInt(courseId));
            setChapters(data);
        } catch (error) {
            console.error("Failed to load curriculum", error);
            toast.error("Failed to load curriculum");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCurriculum();
    }, [courseId]);

    // --- Chapter Handlers ---

    const openCreateChapter = () => {
        setChapterMode('create');
        setSelectedChapter(null);
        setChapterDialogOpen(true);
    };

    const openEditChapter = (chapter: Chapter) => {
        setChapterMode('edit');
        setSelectedChapter(chapter);
        setChapterDialogOpen(true);
    };

    const handleChapterSubmit = async (data: { title: string; description?: string }) => {
        try {
            if (chapterMode === 'create') {
                await academicAPI.createChapter({
                    subject: parseInt(courseId),
                    ...data,
                    order: chapters.length
                });
                toast.success('Chapter created');
            } else if (selectedChapter) {
                await academicAPI.updateChapter(selectedChapter.id, data);
                toast.success('Chapter updated');
            }
            loadCurriculum();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save chapter');
        }
    };

    const handleDeleteChapter = async (chapterId: number) => {
        if (!confirm('Are you sure you want to delete this chapter? All lessons inside it will be lost.')) return;
        try {
            await academicAPI.deleteChapter(chapterId);
            setChapters(prev => prev.filter(c => c.id !== chapterId));
            toast.success('Chapter deleted');
        } catch (error) {
            toast.error('Failed to delete chapter');
        }
    };

    // --- Lesson Handlers ---

    const openCreateLesson = (chapterId: number) => {
        setActiveChapterId(chapterId);
        setLessonDialogOpen(true);
    };

    const handleLessonSubmit = async (data: { title: string; contentType: 'article' | 'video' | 'quiz' }) => {
        if (!activeChapterId) return;
        try {
            // Instead of just creating, we might want to go to the full editor
            // or create it and then go. Standard practice here is create a draft and redirect.
            const newLesson = await academicAPI.createLesson({
                chapter: activeChapterId,
                title: data.title,
                content_type: data.contentType === 'article' ? 'text' : data.contentType,
                order: chapters.find(c => c.id === activeChapterId)?.lessons?.length || 0,
                is_published: false // Draft by default
            });

            toast.success('Lesson created, opening editor...');

            // Redirect to unified editor page
            router.push(`/teacher/courses/${courseId}/lessons/${newLesson.id}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to create lesson');
        }
    };

    const handleEditLesson = (lesson: Lesson) => {
        router.push(`/teacher/courses/${courseId}/lessons/${lesson.id}`);
    };

    const handleDeleteLesson = async (lessonId: number) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await academicAPI.deleteLesson(lessonId);
            toast.success('Lesson deleted');
            loadCurriculum(); // Reload to refresh nested structure
        } catch (error) {
            toast.error('Failed to delete lesson');
        }
    };

    // --- Drag & Drop Handlers ---

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Chapter Reordering
        if (activeId.startsWith('chapter-') && overId.startsWith('chapter-')) {
            if (activeId !== overId) {
                const oldIndex = chapters.findIndex((item) => `chapter-${item.id}` === activeId);
                const newIndex = chapters.findIndex((item) => `chapter-${item.id}` === overId);
                const newChapters = arrayMove(chapters, oldIndex, newIndex);

                setChapters(newChapters);

                // Persist order
                try {
                    await academicAPI.reorderChapters(newChapters.map((c, index) => ({ id: c.id, order: index })));
                    toast.success('Order saved');
                } catch (e) {
                    toast.error('Failed to save order');
                }
            }
        }

        // Lesson Reordering
        if (activeId.startsWith('lesson-') && overId.startsWith('lesson-')) {
            // Finding source and dest chapters
            const sourceChapter = chapters.find(c => c.lessons?.some(l => `lesson-${l.id}` === activeId));
            const destChapter = chapters.find(c => c.lessons?.some(l => `lesson-${l.id}` === overId));

            if (sourceChapter && destChapter && sourceChapter.id === destChapter.id && sourceChapter.lessons) {
                const oldIndex = sourceChapter.lessons.findIndex(l => `lesson-${l.id}` === activeId);
                const newIndex = sourceChapter.lessons.findIndex(l => `lesson-${l.id}` === overId);

                if (oldIndex !== newIndex) {
                    const newLessons = arrayMove(sourceChapter.lessons, oldIndex, newIndex);

                    // Optimistic update
                    setChapters(chapters.map(c =>
                        c.id === sourceChapter.id ? { ...c, lessons: newLessons } : c
                    ));

                    // Persist
                    try {
                        await academicAPI.reorderLessons(newLessons.map((l, index) => ({ id: l.id, order: index })));
                        toast.success('Lesson order saved');
                    } catch (e) {
                        toast.error('Failed to save lesson order');
                        loadCurriculum(); // Revert
                    }
                }
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Curriculum</h2>
                    <p className="text-slate-500">Design your course structure (Drag to reorder)</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateChapter}>
                    <Plus className="h-4 w-4 mr-2" /> Add Chapter
                </Button>
            </div>

            <div className="space-y-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={chapters.map(c => `chapter-${c.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {chapters.map((chapter) => (
                            <SortableChapterItem
                                key={chapter.id}
                                id={`chapter-${chapter.id}`}
                                chapter={chapter}
                                onEdit={openEditChapter}
                                onDelete={handleDeleteChapter}
                                onAddLesson={openCreateLesson}
                                onEditLesson={handleEditLesson}
                                onDeleteLesson={handleDeleteLesson}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {chapters.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 mb-4">You haven't created any chapters yet.</p>
                        <Button variant="outline" onClick={openCreateChapter}>Create First Chapter</Button>
                    </div>
                )}
            </div>

            <ChapterDialog
                open={chapterDialogOpen}
                onOpenChange={setChapterDialogOpen}
                onSubmit={handleChapterSubmit}
                initialData={selectedChapter ? { title: selectedChapter.title, description: selectedChapter.description } : undefined}
                mode={chapterMode}
            />

            <LessonDialog
                open={lessonDialogOpen}
                onOpenChange={setLessonDialogOpen}
                onSubmit={handleLessonSubmit}
                chapterTitle={chapters.find(c => c.id === activeChapterId)?.title}
            />
        </div>
    );
}
