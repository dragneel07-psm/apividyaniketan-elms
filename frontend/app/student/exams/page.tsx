// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar, MapPin, Ticket, Info,
    Printer, Loader2, BookOpen, Clock
} from 'lucide-react';
import { academicAPI, reportsAPI, downloadReport, Exam, ExamSeating } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatDate, formatNumber } from '@/lib/i18n/format';

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
        return (payload as { results: T[] }).results;
    }
    return [];
}

export default function StudentExamsPage() {
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [seatings, setSeatings] = useState<ExamSeating[]>([]);
    const [downloading, setDownloading] = useState<string | null>(null);
    const { t, locale } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [examsData, seatingsData] = await Promise.all([
                academicAPI.getExams(),
                academicAPI.getExamSeating()
            ]);

            setExams(toList<Exam>(examsData));
            setSeatings(toList<ExamSeating>(seatingsData));
        } catch (error) {
            console.error("Failed to load exam data", error);
            toast.error(t('student.exams.errorLoadExams'));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadHallTicket = async (seating: ExamSeating) => {
        try {
            setDownloading(seating.seating_id);
            await downloadReport(
                reportsAPI.getHallTicketPDF(seating.seating_id),
                `hall_ticket_${seating.hall_ticket_number}.pdf`,
            );
            toast.success(t('student.exams.ticketDownloaded'));
        } catch (error) {
            console.error("Failed to download hall ticket", error);
            toast.error(t('student.exams.ticketDownloadFailed'));
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p>{t('student.exams.loadingExams')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Ticket className="h-8 w-8 text-indigo-600" /> {t('student.exams.pageTitle')}
                    </h1>
                    <p className="text-slate-500 text-lg">{t('student.exams.subtitle')}</p>
                </div>
                <Button
                    variant="outline"
                    className="md:w-fit w-full border-slate-200"
                    onClick={() => window.print()}
                >
                    <Printer className="h-4 w-4 mr-2" /> {t('student.exams.printAll')}
                </Button>
            </div>

            {seatings.length === 0 ? (
                <Card className="border-dashed border-2 py-12 text-center text-slate-400 bg-slate-50/50">
                    <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-slate-900">{t('student.exams.noTicketsTitle')}</h3>
                    <p className="max-w-xs mx-auto mt-2">
                        {t('student.exams.noTicketsHint')}
                    </p>
                </Card>
            ) : (
                <div className="grid gap-8">
                    {seatings.map((seating) => {
                        const exam = exams.find(e => e.exam_id === seating.exam);
                        if (!exam) return null;

                        return (
                            <Card key={seating.seating_id} className="overflow-hidden border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="bg-indigo-600 text-white p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl md:text-2xl font-bold">
                                                {exam.assessment_details?.title}
                                            </CardTitle>
                                            <CardDescription className="text-indigo-100 mt-1 flex items-center gap-2">
                                                <BookOpen className="h-4 w-4" /> {exam.assessment_details?.subject_name}
                                            </CardDescription>
                                        </div>
                                        <Badge className="bg-white text-indigo-600 hover:bg-indigo-50 border-none font-mono">
                                            {seating.hall_ticket_number}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">{t('student.exams.examDate')}</p>
                                                    <p className="font-semibold text-slate-700">
                                                        {exam.assessment_details?.scheduled_at
                                                            ? formatDate(new Date(exam.assessment_details.scheduled_at), locale)
                                                            : t('student.exams.notScheduled')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">{t('student.exams.startTime')}</p>
                                                    <p className="font-semibold text-slate-700">
                                                        {exam.assessment_details?.scheduled_at ?
                                                            new Date(exam.assessment_details.scheduled_at).toLocaleTimeString([], {
                                                                hour: '2-digit', minute: '2-digit'
                                                            }) : t('student.exams.startTimeTbd')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="h-5 w-5 text-slate-400" />
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">{t('student.exams.examCenter')}</p>
                                                    <p className="font-semibold text-slate-700">{exam.exam_center || t('student.exams.examCenterDefault')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">{t('student.exams.room')}</p>
                                                        <p className="font-semibold text-slate-700">{seating.room_number}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-medium">{t('student.exams.seat')}</p>
                                                        <p className="font-semibold text-slate-700">{seating.seat_number}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-slate-50/50 flex flex-col justify-between">
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('student.exams.candidateDetails')}</h4>
                                                <p className="text-sm font-bold text-slate-900">{seating.student_name}</p>
                                                <p className="text-xs text-slate-400">{t('student.exams.studentId', { id: seating.student_id_code ?? '' })}</p>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                    onClick={() => handleDownloadHallTicket(seating)}
                                                    disabled={downloading === seating.seating_id}
                                                >
                                                    {downloading === seating.seating_id ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            {t('student.exams.downloading')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Printer className="h-4 w-4 mr-2" />
                                                            {t('student.exams.downloadTicket')}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {exam.instructions && (
                                        <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-3 items-start">
                                            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-900 uppercase tracking-tighter">{t('student.exams.instructions')}</p>
                                                <p className="text-xs text-amber-800 leading-relaxed">{exam.instructions}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
