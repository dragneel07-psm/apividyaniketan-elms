// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, HelpCircle, Layers, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InteractionType = 'quiz' | 'info' | 'checkpoint' | 'flashcards' | 'tabs';

export interface Interaction {
    id: string;
    type: InteractionType;
    timestamp?: number; // For video lessons (seconds)
    position?: 'start' | 'end' | 'inline'; // For text lessons
    title?: string;
    content: any; // Flexible depending on type
}

interface InteractiveRendererProps {
    type: InteractionType | string;
    data: any;
    onComplete?: () => void;
}

export function InteractiveRenderer({ type, data, onComplete }: InteractiveRendererProps) {
    if (!data) return null;

    switch (type) {
        case 'quiz':
            return <InteractiveQuiz data={data} onComplete={onComplete} />;
        case 'flashcards':
            return <InteractiveFlashcards data={data} onComplete={onComplete} />;
        case 'tabs':
            return <InteractiveTabs data={data} />;
        case 'info':
            return <InteractiveInfo data={data} onComplete={onComplete} />;
        default:
            return (
                <div className="p-8 text-center border-2 border-dashed rounded-2xl border-slate-200">
                    <HelpCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Unknown interactive content type: {type}</p>
                </div>
            );
    }
}

// --- NEW COMPONENT FOR MULTIPLE INTERACTIONS ---
export function LessonInteractiveRenderer({
    interactions,
    activeInteractionId,
    onComplete
}: {
    interactions: Interaction[],
    activeInteractionId: string | null,
    onComplete: (id: string) => void
}) {
    const activeInteraction = interactions.find(i => i.id === activeInteractionId);

    if (!activeInteraction) return null;

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden max-w-2xl mx-auto">
            {activeInteraction.title && (
                <div className="bg-indigo-600 px-6 py-3">
                    <h3 className="text-white font-bold">{activeInteraction.title}</h3>
                </div>
            )}
            <div className="p-6">
                <InteractiveRenderer
                    type={activeInteraction.type}
                    data={activeInteraction.content}
                    onComplete={() => onComplete(activeInteraction.id)}
                />
            </div>
        </div>
    );
}

// --- INFO COMPONENT ---
function InteractiveInfo({ data, onComplete }: { data: any, onComplete?: () => void }) {
    return (
        <div className="space-y-6">
            <div className="prose prose-slate max-w-none">
                <div dangerouslySetInnerHTML={{ __html: data.text || data.content || '' }} />
            </div>
            {onComplete && (
                <Button onClick={onComplete} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Continue
                </Button>
            )}
        </div>
    );
}

// --- QUIZ COMPONENT ---
function InteractiveQuiz({ data, onComplete }: { data: any, onComplete?: () => void }) {
    const questions = data.questions || [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const currentQuestion = questions[currentIndex];

    const handleOptionSelect = (index: number) => {
        if (isCorrect !== null) return;
        setSelectedOption(index);
        const correct = index === currentQuestion.correctIndex;
        setIsCorrect(correct);
        if (correct) setScore(s => s + 1);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
            setSelectedOption(null);
            setIsCorrect(null);
        } else {
            setShowResults(true);
            if (onComplete) onComplete();
        }
    };

    const reset = () => {
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setScore(0);
        setShowResults(false);
    };

    if (showResults) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-8 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Quiz Complete!</h3>
                <p className="text-slate-600 mb-6">You scored <span className="font-bold text-indigo-600">{score}</span> out of {questions.length}</p>
                <Button onClick={reset} variant="outline" className="mr-2">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                </Button>
            </motion.div>
        );
    }

    return (
        <Card className="border-none shadow-none bg-slate-50 overflow-hidden">
            <div className="bg-white p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Question {currentIndex + 1} of {questions.length}</span>
                    <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>
                <h4 className="text-xl font-bold text-slate-900 leading-tight">{currentQuestion.question}</h4>
            </div>
            <CardContent className="p-6">
                <div className="space-y-3">
                    {currentQuestion.options.map((option: string, i: number) => (
                        <button
                            key={i}
                            onClick={() => handleOptionSelect(i)}
                            disabled={isCorrect !== null}
                            className={cn(
                                "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 group",
                                isCorrect === null
                                    ? "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md"
                                    : i === currentQuestion.correctIndex
                                        ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                        : i === selectedOption
                                            ? "bg-rose-50 border-rose-500 opacity-80"
                                            : "bg-white border-slate-100 opacity-40"
                            )}
                        >
                            <div className={cn(
                                "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                isCorrect === null
                                    ? "border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50"
                                    : i === currentQuestion.correctIndex
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "border-slate-200"
                            )}>
                                {isCorrect !== null && i === currentQuestion.correctIndex ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <span className="text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                                )}
                            </div>
                            <span className="font-medium text-slate-700">{option}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {isCorrect !== null && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 flex flex-col items-center gap-4 pt-6 border-t border-slate-100"
                        >
                            <div className={cn(
                                "w-full p-4 rounded-xl text-sm font-medium",
                                isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                            )}>
                                {isCorrect ? "Correct! Well done." : `Not quite. The correct answer was: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                                {currentQuestion.explanation && (
                                    <p className="mt-2 text-xs opacity-80 leading-relaxed italic">{currentQuestion.explanation}</p>
                                )}
                            </div>
                            <Button onClick={handleNext} className="w-full sm:w-auto h-12 px-8 rounded-full shadow-lg hover:shadow-indigo-200 transition-all font-bold">
                                {currentIndex < questions.length - 1 ? "Next Question" : "View Results"}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

// --- FLASHCARDS COMPONENT ---
function InteractiveFlashcards({ data, onComplete }: { data: any, onComplete?: () => void }) {
    const cards = data.cards || [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [viewedCount, setViewedCount] = useState(1);

    const handleFlip = () => setFlipped(!flipped);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(i => i + 1);
            setFlipped(false);
            if (currentIndex + 1 >= viewedCount) setViewedCount(v => v + 1);
        } else {
            if (onComplete) onComplete();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setFlipped(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400 px-2">
                <span>Card {currentIndex + 1} of {cards.length}</span>
                <span>{Math.round((viewedCount / cards.length) * 100)}% Mastered</span>
            </div>

            <div className="relative h-64 w-full [perspective:1000px] cursor-pointer" onClick={handleFlip}>
                <motion.div
                    className="h-full w-full [transform-style:preserve-3d] shadow-xl rounded-2xl bg-white border border-slate-100"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                >
                    {/* Front Side */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
                        <span className="text-xs font-bold text-indigo-400 mb-4 uppercase tracking-wider">Target Concept</span>
                        <h4 className="text-2xl font-black text-slate-900">{cards[currentIndex].front}</h4>
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-slate-300">
                            <span className="text-[10px] font-bold">Click to reveal</span>
                            <RefreshCcw className="h-3 w-3" />
                        </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-indigo-600 text-white rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <span className="text-xs font-bold text-indigo-200 mb-4 uppercase tracking-wider">Definition</span>
                        <p className="text-lg font-medium leading-relaxed">{cards[currentIndex].back}</p>
                    </div>
                </motion.div>
            </div>

            <div className="flex justify-center items-center gap-4">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handlePrev() }} disabled={currentIndex === 0}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    onClick={(e) => { e.stopPropagation(); handleNext() }}
                    className="h-12 px-10 rounded-full font-black shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700"
                >
                    {currentIndex < cards.length - 1 ? "Got It!" : "Finish Set"}
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleNext() }} disabled={currentIndex === cards.length - 1}>
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}

// --- TABS COMPONENT ---
function InteractiveTabs({ data }: { data: any }) {
    const tabs = data.tabs || [];
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            <div className="flex bg-slate-50 p-2 gap-1 overflow-x-auto no-scrollbar border-b">
                {tabs.map((tab: any, i: number) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(i)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                            activeTab === i
                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100"
                                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                        )}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
            <div className="p-8 min-h-[200px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="prose prose-slate prose-sm max-w-none"
                    >
                        <h5 className="text-indigo-600 font-black mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Layers className="h-3 w-3" /> {tabs[activeTab].title}
                        </h5>
                        <div dangerouslySetInnerHTML={{ __html: tabs[activeTab].content }} />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
