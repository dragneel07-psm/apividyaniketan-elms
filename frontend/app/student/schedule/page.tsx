// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client"

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Loader2, Calendar, BookOpen, CheckCircle2, Brain,
    Target, Zap, Clock, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { toast } from "sonner";
import { useTranslation } from '@/lib/localization';
import { formatNumber } from '@/lib/i18n/format';

// ── Types ──────────────────────────────────────────────────────────────────

interface StudyEvent {
    id: string;
    title: string;
    description: string;
    event_type: 'study' | 'exam' | 'review' | 'skill_practice' | 'class' | 'assignment' | 'break';
    subject_name: string | null;
    start_time: string;
    end_time: string;
    estimated_minutes: number;
    is_completed: boolean;
    node_id: string | null;
    skill_tag_id: string | null;
}

interface PlanSummary {
    due_reviews: number;
    skill_gaps: Array<{ skill: string; p_mastery: number; subject: string | null }>;
    upcoming_exams: Array<{ title: string; scheduled_at: string; subject: string | null }>;
    new_content_nodes: number;
    daily_goal_minutes: number;
}

// ── Event type config ──────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; color: string; border: string; icon: React.ReactNode }> = {
    review:        { label: 'Spaced Review',   color: 'bg-blue-500',   border: 'border-l-blue-500',   icon: <Brain className="h-3 w-3" /> },
    skill_practice:{ label: 'Skill Practice',  color: 'bg-orange-500', border: 'border-l-orange-500', icon: <Target className="h-3 w-3" /> },
    exam:          { label: 'Exam Prep',       color: 'bg-red-500',    border: 'border-l-red-500',    icon: <Zap className="h-3 w-3" /> },
    study:         { label: 'Study',           color: 'bg-indigo-500', border: 'border-l-indigo-500', icon: <BookOpen className="h-3 w-3" /> },
    class:         { label: 'Class',           color: 'bg-slate-500',  border: 'border-l-slate-400',  icon: <Calendar className="h-3 w-3" /> },
    assignment:    { label: 'Assignment',      color: 'bg-yellow-500', border: 'border-l-yellow-500', icon: <BookOpen className="h-3 w-3" /> },
    break:         { label: 'Break',           color: 'bg-green-500',  border: 'border-l-green-400',  icon: <Clock className="h-3 w-3" /> },
};

function eventCfg(type: string) {
    return EVENT_CONFIG[type] ?? EVENT_CONFIG.study;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StudentSchedulePage() {
    const [events, setEvents] = useState<StudyEvent[]>([]);
    const [summary, setSummary] = useState<PlanSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [days, setDays] = useState(7);
    const [showSummary, setShowSummary] = useState(true);
    const { t, locale } = useTranslation();

    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const [eventsData, summaryData] = await Promise.all([
                api.ai.getStudySchedule({ from: today }),
                api.ai.getStudyPlanSummary(days),
            ]);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
            setSummary(summaryData);
        } catch {
            toast.error(t('student.schedule.errorLoadSchedule'));
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const result = await api.ai.generateStudySchedule(days, true);
            setEvents(result.events ?? []);
            toast.success(t('student.schedule.planReady', { count: formatNumber(result.count, locale), days: formatNumber(result.days, locale) }));
        } catch {
            toast.error(t('student.schedule.errorGenerateSchedule'));
        } finally {
            setGenerating(false);
        }
    };

    const handleComplete = async (id: string, current: boolean) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, is_completed: !current } : e));
        try {
            await api.ai.markStudyEventComplete(id);
        } catch {
            setEvents(prev => prev.map(e => e.id === id ? { ...e, is_completed: current } : e));
            toast.error(t('student.schedule.errorUpdateStatus'));
        }
    };

    // Group events by date
    const grouped: Record<string, StudyEvent[]> = {};
    events.forEach(ev => {
        const key = format(parseISO(ev.start_time), 'yyyy-MM-dd');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(ev);
    });
    const sortedDates = Object.keys(grouped).sort();

    const completedCount = events.filter(e => e.is_completed).length;
    const progress = events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-6xl">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Brain className="h-8 w-8 text-indigo-600" />
                        {t('student.schedule.pageTitle')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('student.schedule.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Days selector */}
                    <div className="flex items-center gap-1 border rounded-lg overflow-hidden text-sm">
                        {[7, 14].map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 transition-colors ${days === d ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchSchedule} title={t('student.schedule.refresh')}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleGenerate} disabled={generating}>
                        {generating
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('student.schedule.generating')}</>
                            : <><Calendar className="mr-2 h-4 w-4" />{t('student.schedule.generatePlan')}</>
                        }
                    </Button>
                </div>
            </div>

            {/* Summary panel */}
            {summary && (
                <Card className="border-indigo-100 bg-indigo-50/40">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Zap className="h-4 w-4 text-indigo-600" />
                                {t('student.schedule.aiFoundTitle')}
                            </CardTitle>
                            <button onClick={() => setShowSummary(v => !v)} className="text-muted-foreground hover:text-foreground">
                                {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                        </div>
                    </CardHeader>
                    {showSummary && (
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{formatNumber(summary.due_reviews, locale)}</p>
                                    <p className="text-xs text-muted-foreground">{t('student.schedule.reviewsDue')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-500">{formatNumber(summary.skill_gaps.length, locale)}</p>
                                    <p className="text-xs text-muted-foreground">{t('student.schedule.skillGaps')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-500">{formatNumber(summary.upcoming_exams.length, locale)}</p>
                                    <p className="text-xs text-muted-foreground">{t('student.schedule.upcomingExams')}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-indigo-600">{formatNumber(summary.daily_goal_minutes, locale)}</p>
                                    <p className="text-xs text-muted-foreground">{t('student.schedule.dailyGoal')}</p>
                                </div>
                            </div>

                            {summary.skill_gaps.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('student.schedule.topSkillGaps')}</p>
                                    {summary.skill_gaps.slice(0, 3).map((gap, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs w-32 truncate">{gap.skill}</span>
                                            <Progress value={Math.round(gap.p_mastery * 100)} className="flex-1 h-1.5" />
                                            <span className="text-xs text-muted-foreground w-8">{formatNumber(Math.round(gap.p_mastery * 100), locale)}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Overall progress */}
            {events.length > 0 && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {t('student.schedule.sessions', { completed: formatNumber(completedCount, locale), total: formatNumber(events.length, locale) })}
                    </span>
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-medium text-indigo-600">{formatNumber(progress, locale)}%</span>
                </div>
            )}

            {/* Empty state */}
            {events.length === 0 && (
                <Card className="text-center p-12">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-indigo-100 rounded-full">
                            <Calendar className="h-12 w-12 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-semibold">{t('student.schedule.noScheduleTitle')}</h3>
                        <p className="text-muted-foreground max-w-sm">
                            {t('student.schedule.noScheduleHint')}
                        </p>
                        <Button onClick={handleGenerate} disabled={generating}>
                            {generating ? t('student.schedule.generating') : t('student.schedule.generatePlan')}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Calendar grouped by day */}
            <div className="space-y-8">
                {sortedDates.map(dateKey => {
                    const dayEvents = grouped[dateKey];
                    const parsedDate = parseISO(dateKey);
                    const dayLabel = isToday(parsedDate)
                        ? t('student.schedule.dayToday')
                        : isTomorrow(parsedDate)
                        ? t('student.schedule.dayTomorrow')
                        : format(parsedDate, 'EEEE, MMMM do');

                    const dayCompleted = dayEvents.filter(e => e.is_completed).length;

                    return (
                        <div key={dateKey}>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-indigo-600" />
                                    {dayLabel}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                    {t('student.schedule.dayDone', { completed: formatNumber(dayCompleted, locale), total: formatNumber(dayEvents.length, locale) })}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dayEvents.map(event => {
                                    const cfg = eventCfg(event.event_type);
                                    return (
                                        <Card
                                            key={event.id}
                                            className={`transition-all border-l-4 ${cfg.border} ${event.is_completed ? 'opacity-55 bg-muted/40' : 'hover:shadow-md'}`}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <Badge className={`${cfg.color} hover:${cfg.color} text-white flex items-center gap-1 text-[10px]`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </Badge>
                                                    <button
                                                        onClick={() => handleComplete(event.id, event.is_completed)}
                                                        className={`flex-shrink-0 rounded-full p-0.5 transition-colors ${event.is_completed ? 'text-green-500' : 'text-slate-300 hover:text-slate-500'}`}
                                                        title={event.is_completed ? t('student.schedule.markIncomplete') : t('student.schedule.markComplete')}
                                                    >
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                                <CardTitle className={`text-sm mt-1 leading-snug ${event.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                                    {event.title}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-1 text-xs">
                                                    <Clock className="h-3 w-3" />
                                                    {format(parseISO(event.start_time), 'h:mm a')}
                                                    {' – '}
                                                    {format(parseISO(event.end_time), 'h:mm a')}
                                                    {event.estimated_minutes > 0 && (
                                                        <span className="ml-1 text-muted-foreground">· {t('student.schedule.minutesSuffix', { min: formatNumber(event.estimated_minutes, locale) })}</span>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <p className="text-xs text-muted-foreground line-clamp-3">
                                                    {event.description}
                                                </p>
                                                {event.subject_name && (
                                                    <p className="text-[10px] mt-1 text-indigo-600 font-medium">{event.subject_name}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
