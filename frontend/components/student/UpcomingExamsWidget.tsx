// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Assessment } from '@/lib/api';

interface UpcomingExamsWidgetProps {
    assessments: Assessment[];
}

export function UpcomingExamsWidget({ assessments }: UpcomingExamsWidgetProps) {
    // Filter and sort upcoming assessments
    const upcoming = assessments
        .filter(a => {
            if (!a.scheduled_at) return false;
            return new Date(a.scheduled_at) > new Date();
        })
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
        .slice(0, 3); // Show max 3

    if (upcoming.length === 0) {
        return (
            <Card className="border-0 shadow-md rounded-2xl">
                <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">No Upcoming Exams</p>
                        <p className="text-xs text-slate-400 mt-0.5">You&apos;re all clear — enjoy your study time!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        Upcoming Exams
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-0 font-bold">
                        {upcoming.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-4 space-y-3">
                {upcoming.map((exam) => (
                    <Link key={exam.id} href={`/student/assessments/${exam.id}`}>
                        <div className="group flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${exam.type === 'exam' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                <Clock className={`h-4 w-4 ${exam.type === 'exam' ? 'text-red-600' : 'text-blue-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                        {exam.title}
                                    </h4>
                                    <Badge className={`text-[9px] uppercase font-bold border-0 shrink-0 ${exam.type === 'exam' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {exam.type}
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {exam.subject_name || 'Subject'} · {new Date(exam.scheduled_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {exam.duration_minutes ? ` · ${exam.duration_minutes}m` : ''}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}

                <Link href="/student/assessments" className="block">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold gap-1 rounded-xl">
                        View All <ArrowRight className="h-3 w-3" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
