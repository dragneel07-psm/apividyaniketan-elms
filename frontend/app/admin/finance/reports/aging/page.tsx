// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, AgingReport } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Printer, Loader2 } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const BUCKETS: { key: keyof AgingReport['buckets']; label: string; color: string }[] = [
    { key: 'current', label: 'Current (not yet due)', color: 'bg-slate-50 text-slate-700' },
    { key: '0-30', label: '1–30 days overdue', color: 'bg-amber-50 text-amber-700' },
    { key: '31-60', label: '31–60 days overdue', color: 'bg-orange-50 text-orange-700' },
    { key: '61-90', label: '61–90 days overdue', color: 'bg-red-50 text-red-700' },
    { key: '90+', label: '90+ days overdue', color: 'bg-red-100 text-red-800' },
];

export default function AgingPage() {
    const [asOf, setAsOf] = useState(today());
    const [data, setData] = useState<AgingReport | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await billingAPI.aging(asOf);
            setData(res);
        } catch {
            toast.error('Failed to load Aging Report');
        } finally {
            setLoading(false);
        }
    }, [asOf]);

    useEffect(() => { load(); }, [load]);

    const print = () => {
        if (!data) return;
        const sections = BUCKETS.map(b => {
            const rows = data.buckets[b.key];
            if (!rows.length) return '';
            const tbody = rows.map(r => `
                <tr>
                    <td>${escapeHtml(r.student_name)}</td>
                    <td>${escapeHtml(r.fee_name)}</td>
                    <td>${new Date(r.due_date).toLocaleDateString()}</td>
                    <td class="num">${r.days_overdue}</td>
                    <td class="num bal">Rs. ${fmt(r.balance)}</td>
                </tr>`).join('');
            return `<h2>${b.label}</h2>
                <table>
                    <thead><tr><th>Student</th><th>Fee</th><th>Due Date</th><th class="num">Days</th><th class="num">Balance</th></tr></thead>
                    <tbody>${tbody}</tbody>
                    <tfoot><tr><td colspan="4">Subtotal</td><td class="num bal">Rs. ${fmt(data.totals[b.key])}</td></tr></tfoot>
                </table>`;
        }).join('');
        const html = `<!doctype html><html><head><title>Aging ${asOf}</title><style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
            h1 { font-size: 18px; margin: 0; } h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            .meta { color: #64748b; margin-bottom: 8px; }
            .grand { background: #fef2f2; padding: 10px; border: 1px solid #fecaca; border-radius: 6px; font-weight: 700; margin-top: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { text-align: left; text-transform: uppercase; font-size: 9px; color: #64748b; padding: 4px 6px; border-bottom: 1.5px solid #111827; }
            td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; } td.bal { font-weight: 700; color: #dc2626; }
            tfoot td { font-weight: 700; border-top: 1.5px solid #111827; padding-top: 6px; }
            </style></head><body>
            <h1>Outstanding Aging Report</h1>
            <div class="meta">As of ${asOf}</div>
            ${sections || '<p style="color:#94a3b8">No outstanding fees.</p>'}
            <div class="grand">Grand Total Outstanding: Rs. ${fmt(data.grand_total)}</div>
            <script>window.onload = () => window.print();</script>
            </body></html>`;
        const w = window.open('', '_blank', 'width=1000,height=900');
        if (!w) { toast.error('Allow pop-ups to print'); return; }
        w.document.open(); w.document.write(html); w.document.close();
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Aging Report</h1>
                    <p className="text-sm text-slate-500">Outstanding student fees bucketed by overdue age.</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs uppercase text-slate-500">As of</Label>
                        <Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="w-40" />
                    </div>
                    <Button onClick={load} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Refresh</Button>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-2">
                            <div className="text-xs text-red-700 uppercase">Grand Total Outstanding</div>
                            <div className="font-bold text-red-700 text-lg">Rs. {fmt(data?.grand_total ?? '0')}</div>
                        </div>
                        <Button variant="outline" onClick={print} disabled={!data}><Printer className="h-4 w-4 mr-2" />Print</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {BUCKETS.map(b => (
                    <div key={b.key} className={`${b.color} rounded-lg p-3 border border-slate-200`}>
                        <div className="text-xs uppercase tracking-wider opacity-80">{b.label}</div>
                        <div className="font-bold text-lg mt-1">Rs. {fmt(data?.totals[b.key] ?? '0')}</div>
                        <div className="text-xs opacity-70">{data?.buckets[b.key].length ?? 0} fees</div>
                    </div>
                ))}
            </div>

            {BUCKETS.map(b => (
                <Card key={b.key}>
                    <CardHeader>
                        <CardTitle className="text-base">{b.label} ({data?.buckets[b.key].length ?? 0})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['Student', 'Fee', 'Due Date', 'Days Overdue', 'Balance'].map(h => (
                                        <th key={h} className={`py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b ${['Days Overdue', 'Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!data || data.buckets[b.key].length === 0 ? (
                                    <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">No fees in this bucket.</td></tr>
                                ) : data.buckets[b.key].map((r, i) => (
                                    <tr key={i} className="border-b hover:bg-slate-50/50">
                                        <td className="py-2 px-4 font-semibold">{r.student_name}</td>
                                        <td className="py-2 px-4">{r.fee_name}</td>
                                        <td className="py-2 px-4 text-slate-500">{new Date(r.due_date).toLocaleDateString()}</td>
                                        <td className="py-2 px-4 text-right">{r.days_overdue}</td>
                                        <td className="py-2 px-4 text-right font-bold text-red-600">Rs. {fmt(r.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
