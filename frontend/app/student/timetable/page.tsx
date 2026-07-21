// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Clock, MapPin, Loader2 } from 'lucide-react';
import { academicAPI, Timetable } from '@/lib/api';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useTranslation } from '@/lib/localization';

export default function TimetablePage() {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [timetable, setTimetable] = useState<Timetable[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        loadTimetable();
    }, []);

    const loadTimetable = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getMyTimetable();
            setTimetable(data);
        } catch (error) {
            console.error('Failed to load timetable', error);
            // toast.error("Failed to load timetable."); // Optional: Don't spam if just empty
        } finally {
            setLoading(false);
        }
    };

    const getDaySchedule = (day: string) => {
        return timetable.filter(t => t.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text(t('student.timetable.pdfTitle'), 14, 20);

        const tableData = timetable.map(slot => [
            slot.day_of_week,
            `${slot.start_time} - ${slot.end_time}`,
            slot.subject_name,
            slot.entry_type === 'extra' ? t('student.timetable.typeExtraPdf') : t('student.timetable.typeMain'),
            slot.room_number || '-',
            slot.teacher_name || '-'
        ]);

        autoTable(doc, {
            head: [[t('student.timetable.colDay'), t('student.timetable.colTime'), t('student.timetable.colSubject'), t('student.timetable.colType'), t('student.timetable.colRoom'), t('student.timetable.colTeacher')]],
            body: tableData,
            startY: 30,
        });

        doc.save("timetable.pdf");
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{t('student.timetable.pageTitle')}</h1>
                    <p className="text-slate-600">{t('student.timetable.subtitle')}</p>
                </div>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleDownloadPDF} disabled={timetable.length === 0}>
                    <Download className="h-4 w-4" /> {t('student.timetable.downloadPdf')}
                </Button>
            </div>

            <Card className="p-6 border-0 shadow-lg bg-white">
                <Tabs defaultValue="Monday" className="w-full">
                    <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 mb-8 h-auto p-1 bg-slate-100 rounded-xl gap-1">
                        {weekDays.map(day => (
                            <TabsTrigger
                                key={day}
                                value={day}
                                className="py-2 px-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-medium text-xs md:text-sm"
                            >
                                {day.substring(0, 3)} <span className="hidden md:inline">{day.substring(3)}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {weekDays.map(day => {
                        const schedule = getDaySchedule(day);
                        return (
                            <TabsContent key={day} value={day} className="space-y-4 animate-in fade-in-50 duration-300">
                                {schedule.length > 0 ? (
                                    <div className="relative border-l-2 border-indigo-200 ml-4 space-y-8 py-2">
                                        {schedule.map((slot) => (
                                            <div key={slot.timetable_id} className="relative pl-8">
                                                {/* Timeline Dot */}
                                                <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-indigo-600`}></div>

                                                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold text-lg text-indigo-900 group-hover:text-indigo-600 transition-colors">{slot.subject_name}</h3>
                                                                <Badge variant={slot.entry_type === 'extra' ? 'secondary' : 'outline'}>
                                                                    {slot.entry_type === 'extra' ? t('student.timetable.typeExtra') : t('student.timetable.typeMain')}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-4 w-4 text-indigo-400" />
                                                                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                                                </div>
                                                                {slot.room_number && (
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin className="h-4 w-4 text-indigo-400" />
                                                                        {t('student.timetable.room', { number: slot.room_number })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {slot.teacher_name && (
                                                            <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-lg">
                                                                <div className="h-8 w-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                                    {slot.teacher_name.split(' ').pop()?.charAt(0)}
                                                                </div>
                                                                <span className="text-sm font-medium text-indigo-800">{slot.teacher_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 italic">
                                        {t('student.timetable.noClasses', { day })}
                                    </div>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </Card>
        </div>
    );
}
