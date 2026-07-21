// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { academicAPI } from '@/lib/api';
import { useTranslation } from '@/lib/localization';
import { formatNumber, formatDate } from '@/lib/i18n/format';
import {
    ArrowLeft, Loader2, CalendarDays, GraduationCap, Wallet,
    CheckCircle2, XCircle, Clock, MinusCircle, AlertCircle,
    TrendingUp, TrendingDown, DollarSign, Receipt
} from 'lucide-react';

const ATT_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    present: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    absent: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
    late: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
    excused: { icon: <MinusCircle className="h-4 w-4" />, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-100' },
};

const FEE_STATUS_COLOR: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
};

export default function ChildDetailPage() {
    const { t, locale } = useTranslation();
    const { studentId } = useParams<{ studentId: string }>();
    const feeStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            paid: 'parent.childDetail.statusPaid',
            partial: 'parent.childDetail.statusPartial',
            pending: 'parent.childDetail.statusPending',
            overdue: 'parent.childDetail.statusOverdue',
        };
        return map[status] ? t(map[status]) : status;
    };

    // Attendance
    const [attData, setAttData] = useState<{ records: any[]; summary: any } | null>(null);
    const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
    const [attYear, setAttYear] = useState(new Date().getFullYear());
    const [attLoading, setAttLoading] = useState(false);

    // Grades
    const [results, setResults] = useState<any[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);

    // Fees
    const [feesData, setFeesData] = useState<{ fees: any[]; payments: any[]; summary: any } | null>(null);
    const [feesLoading, setFeesLoading] = useState(false);

    const loadAttendance = async () => {
        setAttLoading(true);
        try {
            const data = await academicAPI.getChildAttendance(studentId, attMonth, attYear);
            setAttData(data);
        } catch { setAttData(null); }
        finally { setAttLoading(false); }
    };

    const loadResults = async () => {
        setResultsLoading(true);
        try {
            const data = await academicAPI.getChildResults(studentId);
            setResults(Array.isArray(data) ? data : []);
        } catch { setResults([]); }
        finally { setResultsLoading(false); }
    };

    const loadFees = async () => {
        setFeesLoading(true);
        try {
            const data = await academicAPI.getChildFees(studentId);
            setFeesData(data);
        } catch { setFeesData(null); }
        finally { setFeesLoading(false); }
    };

    useEffect(() => { loadAttendance(); }, [studentId, attMonth, attYear]);
    useEffect(() => { loadResults(); loadFees(); }, [studentId]);

    // Group attendance by date
    const attByDate: Record<string, any[]> = {};
    (attData?.records ?? []).forEach(r => {
        if (!attByDate[r.date]) attByDate[r.date] = [];
        attByDate[r.date].push(r);
    });

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            <div className="flex items-center gap-3">
                <Link href="/parent">
                    <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-slate-600">
                        <ArrowLeft className="h-4 w-4" /> {t('parent.childDetail.back')}
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-black text-slate-900">{t('parent.childDetail.title')}</h1>
                    <p className="text-xs text-slate-400">{t('parent.childDetail.subtitle')}</p>
                </div>
            </div>

            <Tabs defaultValue="attendance" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 h-auto">
                    <TabsTrigger value="attendance" className="rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md">
                        <CalendarDays className="h-3.5 w-3.5 mr-2" /> {t('parent.childDetail.tabAttendance')}
                    </TabsTrigger>
                    <TabsTrigger value="grades" className="rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md">
                        <GraduationCap className="h-3.5 w-3.5 mr-2" /> {t('parent.childDetail.tabGrades')}
                    </TabsTrigger>
                    <TabsTrigger value="fees" className="rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-md">
                        <Wallet className="h-3.5 w-3.5 mr-2" /> {t('parent.childDetail.tabFees')}
                    </TabsTrigger>
                </TabsList>

                {/* ── ATTENDANCE ── */}
                <TabsContent value="attendance" className="space-y-4 animate-in fade-in duration-300">
                    {/* Month selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline" size="sm"
                            onClick={() => { const d = new Date(attYear, attMonth - 2); setAttMonth(d.getMonth() + 1); setAttYear(d.getFullYear()); }}
                            className="h-8 px-3 rounded-xl text-xs font-bold"
                        >{t('parent.childDetail.btnPrev')}</Button>
                        <span className="text-sm font-black text-slate-700 min-w-[120px] text-center">
                            {t('parent.childDetail.monthsShort.' + (attMonth - 1))} {formatNumber(attYear, locale)}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            onClick={() => { const d = new Date(attYear, attMonth); setAttMonth(d.getMonth() + 1); setAttYear(d.getFullYear()); }}
                            className="h-8 px-3 rounded-xl text-xs font-bold"
                        >{t('parent.childDetail.btnNext')}</Button>
                    </div>

                    {/* Summary cards */}
                    {attData?.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: t('parent.childDetail.statPresent'), value: formatNumber(attData.summary.present ?? 0, locale), color: 'bg-emerald-50 text-emerald-700' },
                                { label: t('parent.childDetail.statAbsent'), value: formatNumber(attData.summary.absent ?? 0, locale), color: 'bg-red-50 text-red-700' },
                                { label: t('parent.childDetail.statLate'), value: formatNumber(attData.summary.late ?? 0, locale), color: 'bg-amber-50 text-amber-700' },
                                { label: t('parent.childDetail.statRate'), value: `${formatNumber(attData.summary.percentage ?? 0, locale)}%`, color: 'bg-blue-50 text-blue-700' },
                            ].map((s, i) => (
                                <Card key={i} className="border-slate-200 shadow-sm">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                                        <p className={`text-2xl font-black mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {attLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-blue-400" /></div>
                    ) : Object.keys(attByDate).length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-14 text-center">
                                <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">{t('parent.childDetail.noAttendance')}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(attByDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, entries]) => (
                                <div key={date} className="bg-white border border-slate-100 rounded-xl p-3">
                                    <p className="text-xs font-bold text-slate-500 mb-2">
                                        {formatDate(new Date(date), locale)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {entries.map((e, i) => {
                                            const cfg = ATT_CONFIG[e.status] ?? ATT_CONFIG.present;
                                            return (
                                                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                                                    {cfg.icon} {e.subject || t('parent.childDetail.generalSubject')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── GRADES ── */}
                <TabsContent value="grades" className="space-y-4 animate-in fade-in duration-300">
                    {resultsLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div>
                    ) : results.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200">
                            <CardContent className="py-14 text-center">
                                <GraduationCap className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">{t('parent.childDetail.noResults')}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {results.map((r) => {
                                const pct = r.percentage ?? 0;
                                const good = pct >= 60;
                                return (
                                    <Card key={r.result_id} className="border-slate-200 shadow-sm">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-2xl ${good ? 'bg-emerald-50' : 'bg-red-50'} flex items-center justify-center flex-shrink-0`}>
                                                {good
                                                    ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                                                    : <TrendingDown className="h-6 w-6 text-red-500" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 leading-tight">{r.assessment_title}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-xs text-slate-400">{r.subject}</span>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 uppercase">{r.assessment_type}</Badge>
                                                    <span className="text-xs text-slate-300">{formatDate(new Date(r.submitted_at), locale)}</span>
                                                </div>
                                                {r.teacher_feedback && (
                                                    <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">{r.teacher_feedback}</p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-lg font-black ${good ? 'text-emerald-600' : 'text-red-500'}`}>{formatNumber(pct, locale)}%</p>
                                                <p className="text-xs text-slate-400">{formatNumber(r.score ?? 0, locale)}/{formatNumber(r.total_marks ?? 0, locale)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── FEES ── */}
                <TabsContent value="fees" className="space-y-4 animate-in fade-in duration-300">
                    {feesLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>
                    ) : (
                        <>
                            {feesData?.summary && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { icon: <DollarSign className="h-5 w-5 text-blue-600" />, label: t('parent.childDetail.feeTotalDue'), value: formatNumber(feesData.summary.total_due ?? 0, locale), color: 'bg-blue-50' },
                                        { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, label: t('parent.childDetail.feePaid'), value: formatNumber(feesData.summary.total_paid ?? 0, locale), color: 'bg-emerald-50' },
                                        { icon: <AlertCircle className="h-5 w-5 text-amber-600" />, label: t('parent.childDetail.feeOutstanding'), value: formatNumber(feesData.summary.outstanding ?? 0, locale), color: 'bg-amber-50' },
                                    ].map((s, i) => (
                                        <Card key={i} className="border-slate-200 shadow-sm">
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl ${s.color} flex items-center justify-center`}>{s.icon}</div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                                                    <p className="text-lg font-black text-slate-900">{s.value}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Fee items */}
                            {(feesData?.fees ?? []).length === 0 ? (
                                <Card className="border-dashed border-2 border-slate-200">
                                    <CardContent className="py-12 text-center">
                                        <Wallet className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium">{t('parent.childDetail.noFees')}</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="border-b border-slate-100 py-3 px-5">
                                        <CardTitle className="text-sm font-bold text-slate-700">{t('parent.childDetail.feeItems')}</CardTitle>
                                    </CardHeader>
                                    <div className="divide-y divide-slate-50">
                                        {(feesData?.fees ?? []).map((fee) => (
                                            <div key={fee.student_fee_id} className="px-5 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900">{fee.fee_name}</p>
                                                    {fee.due_date && (
                                                        <p className="text-xs text-slate-400">{t('parent.childDetail.dueLabel', { date: fee.due_date })}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">{t('parent.childDetail.paidDueLabel')}</p>
                                                        <p className="text-sm font-black text-slate-800">{formatNumber(Number(fee.amount_paid), locale)} / {formatNumber(Number(fee.amount_due), locale)}</p>
                                                    </div>
                                                    <Badge className={`text-[10px] font-bold px-2 py-0.5 ${FEE_STATUS_COLOR[fee.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                        {feeStatusLabel(fee.status)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Payment history */}
                            {(feesData?.payments ?? []).length > 0 && (
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="border-b border-slate-100 py-3 px-5">
                                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Receipt className="h-4 w-4" /> {t('parent.childDetail.paymentHistory')}
                                        </CardTitle>
                                    </CardHeader>
                                    <div className="divide-y divide-slate-50">
                                        {(feesData?.payments ?? []).map((p) => (
                                            <div key={p.payment_id} className="px-5 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900">{p.payment_date}</p>
                                                    <p className="text-xs text-slate-400 capitalize">{p.method.replace('_', ' ')}</p>
                                                    {p.transaction_id && <p className="text-[10px] text-slate-300 font-mono">{p.transaction_id}</p>}
                                                </div>
                                                <p className="text-base font-black text-emerald-600">+{formatNumber(Number(p.amount), locale)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
