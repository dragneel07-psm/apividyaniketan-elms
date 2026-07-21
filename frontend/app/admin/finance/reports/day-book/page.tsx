// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, DayBookRow } from '@/lib/api';
import { toast } from 'sonner';
import { CalendarDays, Printer, Loader2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function DayBookPage() {
    const [from, setFrom] = useState(today());
    const [to, setTo] = useState(today());
    const [rows, setRows] = useState<DayBookRow[]>([]);
    const [totals, setTotals] = useState({ in: '0', out: '0', net: '0' });
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await billingAPI.dayBook(from, to);
            setRows(data.rows);
            setTotals(data.totals);
        } catch {
            toast.error('Failed to load Day Book');
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => { load(); }, [load]);

    const print = () => {
        const tbody = rows.map(r => `
            <tr>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td class="cap">${escapeHtml(r.type)}</td>
                <td>${escapeHtml(r.particulars)}</td>
                <td class="cap">${escapeHtml(r.method)}</td>
                <td>${escapeHtml(r.reference)}</td>
                <td class="num in">${Number(r.in) ? `Rs. ${fmt(r.in)}` : ''}</td>
                <td class="num out">${Number(r.out) ? `Rs. ${fmt(r.out)}` : ''}</td>
            </tr>`).join('');
        const html = `<!doctype html><html><head><title>Day Book ${from} → ${to}</title><style>
            @page { size: A4 landscape; margin: 1.2cm; }
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
            h1 { font-size: 18px; margin: 0; } .meta { color: #64748b; margin-bottom: 16px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; text-transform: uppercase; font-size: 9px; color: #64748b; padding: 6px 8px; border-bottom: 1.5px solid #111827; }
            td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; }
            td.in { color: #059669; font-weight: 600; }
            td.out { color: #dc2626; font-weight: 600; }
            td.cap, .cap { text-transform: capitalize; }
            tfoot td { font-weight: 700; border-top: 1.5px solid #111827; padding-top: 8px; }
            </style></head><body>
            <h1>Day Book</h1>
            <div class="meta">${from} → ${to}</div>
            <table>
                <thead><tr><th>Date</th><th>Type</th><th>Particulars</th><th>Method</th><th>Ref.</th><th class="num">In (Rs.)</th><th class="num">Out (Rs.)</th></tr></thead>
                <tbody>${tbody}</tbody>
                <tfoot><tr><td colspan="5">TOTALS</td><td class="num in">Rs. ${fmt(totals.in)}</td><td class="num out">Rs. ${fmt(totals.out)}</td></tr>
                       <tr><td colspan="5">NET</td><td colspan="2" class="num" style="color:${Number(totals.net) >= 0 ? '#059669' : '#dc2626'}">Rs. ${fmt(totals.net)}</td></tr></tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
            </body></html>`;
        const w = window.open('', '_blank', 'width=1100,height=900');
        if (!w) { toast.error('Allow pop-ups to print'); return; }
        w.document.open(); w.document.write(html); w.document.close();
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl"><CalendarDays className="h-5 w-5 text-indigo-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Day Book</h1>
                    <p className="text-sm text-slate-500">Every receipt and expense for the date range, in chronological order.</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs uppercase text-slate-500">From</Label>
                        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs uppercase text-slate-500">To</Label>
                        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
                    </div>
                    <Button onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Refresh</Button>
                    <div className="ml-auto flex gap-3">
                        <SummaryCard label="In" value={totals.in} icon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />} color="text-emerald-600" />
                        <SummaryCard label="Out" value={totals.out} icon={<ArrowUpFromLine className="h-4 w-4 text-red-600" />} color="text-red-600" />
                        <SummaryCard label="Net" value={totals.net} icon={null} color={Number(totals.net) >= 0 ? 'text-emerald-700' : 'text-red-700'} />
                        <Button variant="outline" onClick={print} disabled={!rows.length}><Printer className="h-4 w-4 mr-2" />Print</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">Transactions ({rows.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Date', 'Type', 'Particulars', 'Method', 'Ref.', 'In', 'Out'].map(h => (
                                    <th key={h} className="text-left py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No transactions in this range.</td></tr>
                            ) : rows.map((r, i) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                    <td className="py-2 px-4 whitespace-nowrap">{new Date(r.date).toLocaleString()}</td>
                                    <td className="py-2 px-4 capitalize">{r.type}</td>
                                    <td className="py-2 px-4">{r.particulars}</td>
                                    <td className="py-2 px-4 capitalize text-slate-500">{r.method.replace('_', ' ')}</td>
                                    <td className="py-2 px-4 text-slate-500 text-xs">{r.reference}</td>
                                    <td className="py-2 px-4 text-right font-semibold text-emerald-600">{Number(r.in) ? `Rs. ${fmt(r.in)}` : ''}</td>
                                    <td className="py-2 px-4 text-right font-semibold text-red-600">{Number(r.out) ? `Rs. ${fmt(r.out)}` : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <div className="border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 bg-white">
            {icon}
            <div className="text-xs">
                <div className="text-slate-500 uppercase">{label}</div>
                <div className={`font-bold ${color}`}>Rs. {fmt(value)}</div>
            </div>
        </div>
    );
}
