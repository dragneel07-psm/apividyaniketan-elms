// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, GripVertical, Loader2, ListChecks } from 'lucide-react';
import { academicAPI, aiAPI, Chapter, GeneratedExamPaperResponse, Lesson, Subject } from '@/lib/api';
import { toast } from 'sonner';
import LessonEditor from '@/components/course/lesson-editor';

export default function CurriculumEditorPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [generatingChapterQuizId, setGeneratingChapterQuizId] = useState<number | null>(null);
    const [generatingExamPaper, setGeneratingExamPaper] = useState(false);
    const [generatedExamPaper, setGeneratedExamPaper] = useState<GeneratedExamPaperResponse | null>(null);

    // Initial load
    useEffect(() => {
        loadChapters();
    }, [courseId]);

    const loadChapters = async () => {
        try {
            setLoading(true);
            const [chaptersData, subjectData, artifacts] = await Promise.all([
                academicAPI.getChapters(parseInt(courseId)),
                academicAPI.getSubject(parseInt(courseId)),
                aiAPI.getArtifacts({
                    artifact_type: 'exam_paper',
                    source_type: 'subject',
                    source_id: courseId,
                    limit: 1,
                }).catch(() => []),
            ]);
            setChapters(chaptersData);
            setSubject(subjectData);
            const latestArtifact = artifacts[0]?.content as any;
            if (
                latestArtifact
                && typeof latestArtifact === 'object'
                && latestArtifact.paper
                && latestArtifact.answer_key
                && latestArtifact.marking_scheme
            ) {
                setGeneratedExamPaper({
                    paper: latestArtifact.paper,
                    answer_key: latestArtifact.answer_key,
                    marking_scheme: latestArtifact.marking_scheme,
                });
            }
        } catch (error) {
            console.error('Failed to load chapters:', error);
            toast.error('Failed to load curriculum');
        } finally {
            setLoading(false);
        }
    };

    const handleLessonSelect = async (lesson: Lesson) => {
        try {
            // Fetch fresh lesson details (including materials)
            // Note: The list view might define materials, but getLesson ensures full detail
            const fullLesson = await academicAPI.getLesson(lesson.id);
            setSelectedLesson(fullLesson);
        } catch (error) {
            toast.error("Failed to load lesson details");
        }
    };

    const handleLessonSave = async (updated: Lesson) => {
        try {
            await academicAPI.updateLesson(updated.id, updated);
            toast.success('Lesson saved successfully');

            // Reload chapters to refresh the sidebar titles/order if changed
            loadChapters();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save lesson');
            throw error; // Re-throw for child component to handle loading state
        }
    };

    const handleChapterCreate = async () => {
        const title = prompt("Enter chapter title:");
        if (!title) return;

        try {
            await academicAPI.createChapter({
                subject: parseInt(courseId),
                title,
                order: chapters.length + 1
            });
            toast.success("Chapter created");
            loadChapters();
        } catch (e) {
            toast.error("Failed to create chapter");
        }
    };

    const handleLessonCreate = async (chapterId: number) => {
        const title = prompt("Enter lesson title:");
        if (!title) return;

        try {
            const chap = chapters.find(c => c.id === chapterId);
            const order = (chap?.lessons?.length || 0) + 1;

            const newLesson = await academicAPI.createLesson({
                chapter: chapterId,
                title,
                order,
                content: '',
                duration_minutes: 30,
                is_published: false
            });

            toast.success("Lesson created");
            await loadChapters();
            // Select the new lesson
            handleLessonSelect(newLesson);
        } catch (e) {
            toast.error("Failed to create lesson");
        }
    };

    const handleGenerateChapterQuiz = async (chapterId: number) => {
        const rawDifficulty = (window.prompt('Quiz difficulty? (easy | medium | hard)', 'medium') || 'medium').trim().toLowerCase();
        const difficulty = rawDifficulty === 'easy' || rawDifficulty === 'hard' ? rawDifficulty : 'medium';
        const rawCount = window.prompt('Number of questions (1-30)', '10') || '10';
        const parsedCount = Number.parseInt(rawCount, 10);
        const count = Number.isFinite(parsedCount) ? Math.max(1, Math.min(30, parsedCount)) : 10;

        setGeneratingChapterQuizId(chapterId);
        try {
            const result = await aiAPI.generateQuiz({
                source_type: 'chapter',
                source_id: chapterId,
                difficulty: difficulty as 'easy' | 'medium' | 'hard',
                count,
            });
            toast.success(`Chapter quiz created (${result.questions.length} questions). Quiz ID: ${result.quiz_id}`);
        } catch (error: any) {
            console.error('Failed to generate chapter quiz', error);
            toast.error(error?.message || 'Failed to generate chapter quiz');
        } finally {
            setGeneratingChapterQuizId(null);
        }
    };

    const handleGenerateExamPaper = async () => {
        if (!subject) {
            toast.error('Subject details are not loaded yet.');
            return;
        }

        const defaultUnits = chapters.map((chapter) => chapter.id);
        if (defaultUnits.length === 0) {
            toast.error('Create at least one chapter before generating exam paper.');
            return;
        }

        const unitsInput = window.prompt(
            'Chapter IDs for this exam (comma-separated). Leave as default to include all.',
            defaultUnits.join(',')
        );
        if (unitsInput === null) return;

        const parsedUnits = unitsInput
            .split(',')
            .map((part) => Number.parseInt(part.trim(), 10))
            .filter((value) => Number.isFinite(value));
        const units = parsedUnits.length > 0 ? parsedUnits : defaultUnits;

        const marksInput = window.prompt('Total marks (10-300)', '100');
        if (marksInput === null) return;
        const parsedMarks = Number.parseInt(marksInput, 10);
        if (!Number.isFinite(parsedMarks) || parsedMarks < 10 || parsedMarks > 300) {
            toast.error('Marks must be between 10 and 300.');
            return;
        }

        const mixInput = window.prompt('Difficulty mix as easy,medium,hard (must sum to 100)', '30,50,20');
        if (mixInput === null) return;
        const [easyRaw, mediumRaw, hardRaw] = mixInput.split(',').map((part) => Number.parseInt(part.trim(), 10));
        if (![easyRaw, mediumRaw, hardRaw].every((value) => Number.isFinite(value)) || (easyRaw + mediumRaw + hardRaw) !== 100) {
            toast.error('Difficulty mix must be three numbers summing to 100.');
            return;
        }

        setGeneratingExamPaper(true);
        try {
            const result = await aiAPI.generateExamPaper({
                class_id: subject.academic_class,
                subject_id: subject.id,
                units,
                marks: parsedMarks,
                difficulty_mix: {
                    easy: easyRaw,
                    medium: mediumRaw,
                    hard: hardRaw,
                },
            });
            setGeneratedExamPaper(result);
            toast.success(`Exam paper generated: ${result.paper.title}`);
        } catch (error: any) {
            console.error('Failed to generate exam paper', error);
            toast.error(error?.message || 'Failed to generate exam paper');
        } finally {
            setGeneratingExamPaper(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
            {/* Header */}
            <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <h1 className="text-lg font-bold text-slate-900">Curriculum Editor</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleGenerateExamPaper}
                        disabled={generatingExamPaper || chapters.length === 0}
                    >
                        <ListChecks className="h-4 w-4" />
                        {generatingExamPaper ? 'Generating Exam...' : 'AI Exam Paper'}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => router.push(`/student/courses/${courseId}`)}>
                        Preview Course
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar: Chapters & Lessons List */}
                <aside className="w-80 overflow-y-auto border-r bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Course Structure</h2>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleChapterCreate}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {chapters.map((chapter, cIndex) => (
                            <div key={chapter.id} className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="font-bold text-slate-700">
                                        {cIndex + 1}. {chapter.title}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-[10px] text-indigo-600"
                                            onClick={() => handleGenerateChapterQuiz(chapter.id)}
                                            disabled={generatingChapterQuizId === chapter.id}
                                        >
                                            <ListChecks className="mr-1 h-3 w-3" />
                                            {generatingChapterQuizId === chapter.id ? 'Generating' : 'AI Quiz'}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={() => handleLessonCreate(chapter.id)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="ml-4 space-y-1 border-l-2 border-slate-100 pl-4">
                                    {chapter.lessons?.map((lesson, lIndex) => (
                                        <div
                                            key={lesson.id}
                                            onClick={() => handleLessonSelect(lesson)}
                                            className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${selectedLesson?.id === lesson.id
                                                    ? 'bg-indigo-50 font-medium text-indigo-700'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <GripVertical className="h-3 w-3 text-slate-300" />
                                            <span className="truncate">{lesson.title}</span>
                                        </div>
                                    ))}
                                    {(!chapter.lessons || chapter.lessons.length === 0) && (
                                        <p className="text-xs italic text-slate-400">No lessons yet</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content: Lesson Editor */}
                <section className="flex-1 overflow-y-auto p-8">
                    {generatedExamPaper && (
                        <div className="mb-6 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">{generatedExamPaper.paper.title}</h2>
                                <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                                    {generatedExamPaper.paper.total_marks} Marks
                                </span>
                            </div>
                            <div className="space-y-3">
                                {generatedExamPaper.paper.sections.map((section, sectionIndex) => (
                                    <div key={`${section.title}-${sectionIndex}`} className="rounded-lg border border-slate-200 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
                                            <span className="text-xs font-medium text-slate-500">{section.marks} marks</span>
                                        </div>
                                        {section.instructions && (
                                            <p className="mb-2 text-xs text-slate-500">{section.instructions}</p>
                                        )}
                                        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                                            {section.questions.map((question, questionIndex) => (
                                                <li key={`${section.title}-${questionIndex}`}>
                                                    {question.prompt} <span className="text-xs text-slate-500">({question.marks} marks)</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>
                            <details className="mt-4 rounded-md bg-slate-50 p-3">
                                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Answer Key</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">
                                    {JSON.stringify(generatedExamPaper.answer_key, null, 2)}
                                </pre>
                            </details>
                            <details className="mt-3 rounded-md bg-slate-50 p-3">
                                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Marking Scheme</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">
                                    {JSON.stringify(generatedExamPaper.marking_scheme, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                    {selectedLesson ? (
                        <LessonEditor
                            key={selectedLesson.id} // Force remount on lesson switch
                            lesson={selectedLesson}
                            chapterTitle={chapters.find(c => c.id === selectedLesson.chapter)?.title}
                            onSave={handleLessonSave}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                <Plus className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Select a lesson to edit</h3>
                            <p className="max-w-xs text-sm">Choose a lesson from the sidebar or create a new one to start adding content.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
