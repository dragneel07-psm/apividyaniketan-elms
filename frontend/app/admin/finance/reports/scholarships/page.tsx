// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, ScholarshipRegister } from '@/lib/api';
import { toast } from 'sonner';
import { Award, Loader2, FileDown } from 'lucide-react';

const fmt = (n: string | number) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ScholarshipRegisterPage() {
    const [fy, setFy] = useState('');
    const [data, setData] = useState<ScholarshipRegister | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await billingAPI.scholarshipRegister(fy || undefined));
        } catch {
            toast.error('Failed to load scholarship register');
        } finally {
            setLoading(false);
        }
    }, [fy]);

    useEffect(() => { load(); }, [load]);

    const downloadPdf = async () => {
        setDownloading(true);
        try {
            await billingAPI.scholarshipRegisterPdf(fy || undefined);
            toast.success('Register downloaded');
        } catch {
            toast.error('Failed to download register');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><Award className="h-5 w-5 text-blue-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Government Scholarship Register</h1>
                    <p className="text-sm text-slate-500">
                        Audit-ready listing of every fee that received a category-tagged scholarship discount.
                        Required by SSDP / EGRP / IRD reviewers.
                    </p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs uppercase text-slate-500">Fiscal Year (BS)</Label>
                        <Input
                            value={fy}
                            onChange={(e) => setFy(e.target.value)}
                            placeholder="e.g. 2082/83 — leave blank for all"
                            className="w-56"
                        />
                    </div>
                    <Button onClick={load} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Refresh</Button>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="border border-slate-200 rounded-lg px-3 py-2 bg-white">
                            <div className="text-xs text-slate-500 uppercase">Total Awards</div>
                            <div className="font-bold text-blue-700 text-lg">{data?.grand_count ?? 0}</div>
                        </div>
                        <div className="border border-slate-200 rounded-lg px-3 py-2 bg-white">
                            <div className="text-xs text-slate-500 uppercase">Total Amount</div>
                            <div className="font-bold text-blue-700 text-lg">Rs. {fmt(data?.grand_amount ?? '0')}</div>
                        </div>
                        <Button variant="outline" onClick={downloadPdf} disabled={!data || downloading}>
                            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                            Download PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {!data ? null : data.groups.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-slate-400 text-sm">
                        No scholarship awards recorded for this period.
                        Tag a discount with a Scholarship Category in the Discounts tab to start tracking.
                    </CardContent>
                </Card>
            ) : (
                data.groups.map((g, i) => (
                    <Card key={`${g.category_key}-${g.source_key}-${i}`}>
                        <CardHeader className="bg-blue-700 text-white py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">{g.category_label}</CardTitle>
                                <span className="text-xs opacity-80">Source: {g.source_label}</span>
                            </div>
                            <CardDescription className="text-blue-100 text-xs">
                                {g.count} award{g.count === 1 ? '' : 's'} &middot; Rs. {fmt(g.amount)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Student', 'Class', 'Fee', 'Scholarship', 'Due Date', 'Amount'].map((h, idx) => (
                                            <th key={h} className={`py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b ${idx === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {g.awards.map((a, j) => (
                                        <tr key={j} className="border-b last:border-b-0 hover:bg-slate-50/50">
                                            <td className="py-2 px-4 font-semibold">{a.student_name}</td>
                                            <td className="py-2 px-4 text-slate-500">{a.class}</td>
                                            <td className="py-2 px-4">{a.fee_name}</td>
                                            <td className="py-2 px-4 text-slate-600">{a.discount_name}</td>
                                            <td className="py-2 px-4 text-slate-500">{new Date(a.due_date).toLocaleDateString()}</td>
                                            <td className="py-2 px-4 text-right font-bold text-blue-700">Rs. {fmt(a.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold">
                                    <tr>
                                        <td colSpan={5} className="py-2.5 px-4 text-right uppercase text-xs">Subtotal</td>
                                        <td className="py-2.5 px-4 text-right text-blue-700">Rs. {fmt(g.amount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
