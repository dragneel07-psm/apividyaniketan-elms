// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus, Edit, Trash2, FileText, Video,
    ChevronDown, ChevronRight, FileUp,
    MoreVertical, GripVertical, PlayCircle,
    BookOpen, Layers, Eye, EyeOff
} from 'lucide-react';
import { academicAPI, Chapter, Lesson, Subject, LessonMaterial } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

import { ChapterDialog } from './ChapterDialog';
import { LessonDialog } from './LessonDialog';

interface SortableLessonItemProps {
    lesson: Lesson;
    chapterIndex: number;
    lessonIndex: number;
    onEdit: (lesson: Lesson) => void;
    onDelete: (id: number) => void;
    onTogglePublish: (lesson: Lesson) => void;
}

function SortableLessonItem({ lesson, chapterIndex, lessonIndex, onEdit, onDelete, onTogglePublish }: SortableLessonItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `lesson-${lesson.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all ${isDragging ? 'bg-indigo-50 border-indigo-200 shadow-lg' : ''} ${!lesson.is_published ? 'bg-slate-50/50 opacity-80' : 'bg-white'}`}
        >
            <div className="flex items-center gap-4 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
                    <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${!lesson.is_published ? 'bg-slate-100 border-slate-200' : 'bg-indigo-50 border-indigo-100'}`}>
                    {lesson.content_type === 'quiz' ? <BookOpen className="h-5 w-5 text-emerald-500" /> :
                        lesson.video_url ? <PlayCircle className="h-5 w-5 text-red-500" /> :
                            <FileText className="h-5 w-5 text-indigo-500" />}
                </div>
                <div className="flex-1">
                    <h4 className={`font-medium transition-colors ${!lesson.is_published ? 'text-slate-500' : 'text-slate-800'}`}>{lesson.title}</h4>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{lesson.duration_minutes} mins</span>
                        {!lesson.is_published && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-100 text-slate-500 border-slate-200">Draft</Badge>
                        )}
                        {lesson.is_published && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-600 border-emerald-100">Published</Badge>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{lesson.is_published ? 'Live' : 'Draft'}</span>
                    <Switch
                        checked={lesson.is_published}
                        onCheckedChange={() => onTogglePublish(lesson)}
                        className="scale-75 data-[state=checked]:bg-emerald-500"
                    />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={(e) => { e.stopPropagation(); onEdit(lesson); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(lesson.id); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface SortableChapterItemProps {
    chapter: Chapter;
    chapterIndex: number;
    onEditChapter: (chapter: Chapter) => void;
    onDeleteChapter: (id: number) => void;
    onEditLesson: (lesson: Lesson) => void;
    onDeleteLesson: (id: number) => void;
    onCreateLesson: (chapterId: number, type?: 'text' | 'video' | 'quiz') => void;
    onToggleLessonPublish: (lesson: Lesson) => void;
    onToggleChapterPublish: (chapter: Chapter) => void;
    onBatchPublish: (chapterId: number, publish: boolean) => void;
    sensors: any;
    handleLessonDragEnd: (event: DragEndEvent, chapterId: number) => void;
}

function SortableChapterItem({
    chapter,
    chapterIndex,
    onEditChapter,
    onDeleteChapter,
    onEditLesson,
    onDeleteLesson,
    onCreateLesson,
    onToggleLessonPublish,
    onToggleChapterPublish,
    onBatchPublish,
    sensors,
    handleLessonDragEnd
}: SortableChapterItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `chapter-${chapter.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : 0,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`overflow-hidden border-slate-200 shadow-sm ${isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}>
                <AccordionItem value={chapter.id.toString()} className="border-none">
                    <div className="flex items-center pr-4 bg-slate-50/50">
                        <div {...attributes} {...listeners} className="pl-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                            <GripVertical className="h-5 w-5" />
                        </div>
                        <AccordionTrigger className="hover:no-underline py-4 px-4 flex-1">
                            <div className="flex items-center gap-3 text-left">
                                <div className={`p-2 rounded-lg border shadow-sm transition-colors ${!chapter.is_published ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200'}`}>
                                    <BookOpen className={`h-5 w-5 ${!chapter.is_published ? 'text-slate-400' : 'text-indigo-600'}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold transition-colors ${!chapter.is_published ? 'text-slate-500' : 'text-slate-800'}`}>{chapter.title}</h3>
                                        {!chapter.is_published && (
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-100 text-slate-500 border-slate-200">Draft</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{chapter.lessons?.length || 0} Lessons</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{chapter.is_published ? 'Visible' : 'Hidden'}</span>
                                <Switch
                                    checked={chapter.is_published}
                                    onCheckedChange={() => onToggleChapterPublish(chapter)}
                                    className="scale-75 data-[state=checked]:bg-indigo-600"
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); onEditChapter(chapter); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => onCreateLesson(chapter.id, 'text')}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Article
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCreateLesson(chapter.id, 'video')}>
                                        <Video className="h-4 w-4 mr-2" /> Add Video
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCreateLesson(chapter.id, 'quiz')}>
                                        <BookOpen className="h-4 w-4 mr-2" /> Add Quiz
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="border-t mt-1" onClick={() => onBatchPublish(chapter.id, true)}>
                                        <Eye className="h-4 w-4 mr-2 text-emerald-600" /> Publish All Lessons
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onBatchPublish(chapter.id, false)}>
                                        <EyeOff className="h-4 w-4 mr-2 text-slate-500" /> Unpublish All Lessons
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="border-t mt-1" onClick={() => onEditChapter(chapter)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit Chapter
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => onDeleteChapter(chapter.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Chapter
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <AccordionContent className="p-0">
                        <div className={`bg-white border-t border-slate-100 p-4 space-y-2 transition-opacity ${!chapter.is_published ? 'bg-slate-50/30' : ''}`}>
                            {chapter.lessons && chapter.lessons.length > 0 ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => handleLessonDragEnd(event, chapter.id)}
                                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                                >
                                    <SortableContext
                                        items={chapter.lessons.map(l => `lesson-${l.id}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {chapter.lessons.map((lesson, lessonIndex) => (
                                                <SortableLessonItem
                                                    key={lesson.id}
                                                    lesson={lesson}
                                                    chapterIndex={chapterIndex}
                                                    lessonIndex={lessonIndex}
                                                    onEdit={onEditLesson}
                                                    onDelete={onDeleteLesson}
                                                    onTogglePublish={onToggleLessonPublish}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="text-center py-6 border-2 border-dashed rounded-xl border-slate-100">
                                    <p className="text-sm text-slate-400 mb-4">No lessons in this chapter</p>
                                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700" onClick={() => onCreateLesson(chapter.id)}>
                                        <Plus className="h-3 w-3 mr-2" /> Add first lesson
                                    </Button>
                                </div>
                            )}
                            {chapter.lessons && chapter.lessons.length > 0 && (
                                <div className="pt-2 flex justify-center">
                                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600 text-xs gap-1" onClick={() => onCreateLesson(chapter.id)}>
                                        <Plus className="h-3 w-3" /> Add Lesson
                                    </Button>
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Card>
        </div>
    );
}

export default function LessonPlanningManager() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

    const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [targetChapterId, setTargetChapterId] = useState<number | null>(null);
    const [lessonType, setLessonType] = useState<'text' | 'video' | 'quiz'>('text');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, chaptersData] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getChapters(parseInt(courseId))
            ]);
            setSubject(subjectData);
            setChapters(chaptersData);
        } catch (error) {
            console.error('Failed to load lesson planning data:', error);
            toast.error('Failed to load subject content');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLessonDragEnd = async (event: DragEndEvent, chapterId: number) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const chapterIndex = chapters.findIndex(c => c.id === chapterId);
            if (chapterIndex === -1) return;

            const chapter = chapters[chapterIndex];
            const activeId = parseInt((active.id as string).replace('lesson-', ''));
            const overId = parseInt((over.id as string).replace('lesson-', ''));

            const oldIndex = chapter.lessons?.findIndex(l => l.id === activeId) ?? -1;
            const newIndex = chapter.lessons?.findIndex(l => l.id === overId) ?? -1;

            if (oldIndex !== -1 && newIndex !== -1) {
                const newLessons = arrayMove(chapter.lessons!, oldIndex, newIndex);

                // Update local state immediately
                const newChapters = [...chapters];
                newChapters[chapterIndex] = { ...chapter, lessons: newLessons };
                setChapters(newChapters);

                try {
                    // Call API to persist new order
                    const orders = newLessons.map((lesson, index) => ({
                        id: lesson.id,
                        order: index + 1
                    }));
                    await academicAPI.reorderLessons(orders);
                    toast.success('Lessons reordered');
                } catch (error) {
                    console.error('Failed to reorder lessons:', error);
                    toast.error('Failed to save lesson order');
                    // Revert on failure
                    loadData();
                }
            }
        }
    };

    const handleChapterDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const activeId = parseInt((active.id as string).replace('chapter-', ''));
            const overId = parseInt((over.id as string).replace('chapter-', ''));

            const oldIndex = chapters.findIndex(c => c.id === activeId);
            const newIndex = chapters.findIndex(c => c.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newChapters = arrayMove(chapters, oldIndex, newIndex);
                setChapters(newChapters);

                try {
                    const orders = newChapters.map((chapter, index) => ({
                        id: chapter.id,
                        order: index + 1
                    }));
                    await academicAPI.reorderChapters(orders);
                    toast.success('Chapters reordered');
                } catch (error) {
                    console.error('Failed to reorder chapters:', error);
                    toast.error('Failed to save chapter order');
                    loadData();
                }
            }
        }
    };

    const handleCreateChapter = () => {
        setSelectedChapter(null);
        setChapterDialogOpen(true);
    };

    const handleEditChapter = (chapter: Chapter) => {
        setSelectedChapter(chapter);
        setChapterDialogOpen(true);
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm('Are you sure you want to delete this chapter? All lessons within will be lost.')) return;
        try {
            await academicAPI.deleteChapter(id);
            toast.success('Chapter deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete chapter');
        }
    };

    const handleCreateLesson = (chapterId: number, type: 'text' | 'video' | 'quiz' = 'text') => {
        setTargetChapterId(chapterId);
        setLessonType(type);
        setSelectedLesson(null);
        setLessonDialogOpen(true);
    };

    const handleEditLesson = (lesson: Lesson) => {
        setSelectedLesson(lesson);
        setTargetChapterId(lesson.chapter);
        setLessonDialogOpen(true);
    };

    const handleDeleteLesson = async (id: number) => {
        if (!confirm('Are you sure you want to delete this lesson?')) return;
        try {
            await academicAPI.deleteLesson(id);
            toast.success('Lesson deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete lesson');
        }
    };

    const handleToggleLessonPublish = async (lesson: Lesson) => {
        try {
            const updated = await academicAPI.updateLesson(lesson.id, {
                is_published: !lesson.is_published
            });
            toast.success(updated.is_published ? 'Lesson published' : 'Lesson set to draft');

            // Update local state for immediate feedback
            setChapters(prev => prev.map(ch => {
                if (ch.id === lesson.chapter) {
                    return {
                        ...ch,
                        lessons: ch.lessons?.map(l => l.id === lesson.id ? { ...l, is_published: updated.is_published } : l)
                    };
                }
                return ch;
            }));
        } catch (error) {
            toast.error('Failed to update lesson status');
        }
    };

    const handleToggleChapterPublish = async (chapter: Chapter) => {
        try {
            const updated = await academicAPI.updateChapter(chapter.id, {
                is_published: !chapter.is_published
            });
            toast.success(updated.is_published ? 'Chapter is now visible' : 'Chapter is now hidden');

            setChapters(prev => prev.map(ch => ch.id === chapter.id ? { ...ch, is_published: updated.is_published } : ch));
        } catch (error) {
            toast.error('Failed to update chapter status');
        }
    };

    const handleBatchPublish = async (chapterId: number, publish: boolean) => {
        const chapter = chapters.find(c => c.id === chapterId);
        if (!chapter || !chapter.lessons || chapter.lessons.length === 0) return;

        const actionTerm = publish ? 'publish' : 'unpublish';
        if (!confirm(`Are you sure you want to ${actionTerm} all lessons in "${chapter.title}"?`)) return;

        toast.loading(`${publish ? 'Publishing' : 'Unpublishing'} all lessons...`);
        try {
            // Sequential updates for simplicity in MVP, but could be batch API if backend supports it
            await Promise.all(chapter.lessons.map(lesson =>
                academicAPI.updateLesson(lesson.id, { is_published: publish })
            ));

            toast.dismiss();
            toast.success(`All lessons in "${chapter.title}" ${publish ? 'published' : 'set to draft'}`);
            loadData();
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to update some lessons');
            loadData();
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{subject?.name}</h1>
                    <p className="text-slate-500">Curriculum & Lesson Planning</p>
                </div>
                <Button onClick={handleCreateChapter} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4" />
                    New Chapter
                </Button>
            </header>

            {chapters.length === 0 ? (
                <Card className="p-12 text-center border-dashed border-2">
                    <Layers className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700">No content yet</h3>
                    <p className="text-slate-500 mb-6">Start by creating your first chapter.</p>
                    <Button onClick={handleCreateChapter} variant="outline">
                        Create Chapter
                    </Button>
                </Card>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleChapterDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <SortableContext
                        items={chapters.map(c => `chapter-${c.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <Accordion type="multiple" className="space-y-4">
                            {chapters.map((chapter, chapterIndex) => (
                                <SortableChapterItem
                                    key={chapter.id}
                                    chapter={chapter}
                                    chapterIndex={chapterIndex}
                                    onEditChapter={handleEditChapter}
                                    onDeleteChapter={handleDeleteChapter}
                                    onEditLesson={handleEditLesson}
                                    onDeleteLesson={handleDeleteLesson}
                                    onCreateLesson={handleCreateLesson}
                                    onToggleLessonPublish={handleToggleLessonPublish}
                                    onToggleChapterPublish={handleToggleChapterPublish}
                                    onBatchPublish={handleBatchPublish}
                                    sensors={sensors}
                                    handleLessonDragEnd={handleLessonDragEnd}
                                />
                            ))}
                        </Accordion>
                    </SortableContext>
                </DndContext>
            )}

            <ChapterDialog
                open={chapterDialogOpen}
                onOpenChange={setChapterDialogOpen}
                chapter={selectedChapter}
                subjectId={parseInt(courseId)}
                onSuccess={loadData}
            />

            <LessonDialog
                open={lessonDialogOpen}
                onOpenChange={setLessonDialogOpen}
                lesson={selectedLesson}
                chapterId={targetChapterId || 0}
                onSuccess={loadData}
                initialType={lessonType}
            />
        </div>
    );
}
