// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, BankRow } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Printer, Loader2 } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function BankBookPage() {
    const [from, setFrom] = useState(today());
    const [to, setTo] = useState(today());
    const [rows, setRows] = useState<BankRow[]>([]);
    const [total, setTotal] = useState('0');
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await billingAPI.bankBook(from, to);
            setRows(data.rows);
            setTotal(data.total);
        } catch {
            toast.error('Failed to load Bank Book');
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => { load(); }, [load]);

    const print = () => {
        const tbody = rows.map(r => `
            <tr>
                <td>${new Date(r.date).toLocaleString()}</td>
                <td class="cap">${escapeHtml(r.method.replace('_', ' '))}</td>
                <td>${escapeHtml(r.particulars)}</td>
                <td>${escapeHtml(r.reference)}</td>
                <td class="num">Rs. ${fmt(r.amount)}</td>
            </tr>`).join('');
        const html = `<!doctype html><html><head><title>Bank Book ${from} → ${to}</title><style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
            h1 { font-size: 18px; margin: 0; } .meta { color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; text-transform: uppercase; font-size: 9px; color: #64748b; padding: 6px 8px; border-bottom: 1.5px solid #111827; }
            td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #2563eb; }
            td.cap { text-transform: capitalize; }
            tfoot td { font-weight: 700; border-top: 1.5px solid #111827; padding-top: 8px; }
            </style></head><body>
            <h1>Bank Book</h1>
            <div class="meta">${from} → ${to}</div>
            <table>
                <thead><tr><th>Date</th><th>Method</th><th>Particulars</th><th>Ref.</th><th class="num">Amount (Rs.)</th></tr></thead>
                <tbody>${tbody}</tbody>
                <tfoot><tr><td colspan="4">TOTAL</td><td class="num">Rs. ${fmt(total)}</td></tr></tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
            </body></html>`;
        const w = window.open('', '_blank', 'width=900,height=900');
        if (!w) { toast.error('Allow pop-ups to print'); return; }
        w.document.open(); w.document.write(html); w.document.close();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><Building2 className="h-5 w-5 text-blue-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Bank Book</h1>
                    <p className="text-sm text-slate-500">Bank transfer, cheque, online and card receipts.</p>
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
                    <Button onClick={load} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Refresh</Button>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="border border-slate-200 rounded-lg px-3 py-2 bg-white">
                            <div className="text-xs text-slate-500 uppercase">Total Bank Received</div>
                            <div className="font-bold text-blue-700">Rs. {fmt(total)}</div>
                        </div>
                        <Button variant="outline" onClick={print} disabled={!rows.length}><Printer className="h-4 w-4 mr-2" />Print</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">Receipts ({rows.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Date', 'Method', 'Particulars', 'Ref.', 'Amount'].map(h => (
                                    <th key={h} className="text-left py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-slate-400">No bank receipts in this range.</td></tr>
                            ) : rows.map((r, i) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                    <td className="py-2 px-4">{new Date(r.date).toLocaleString()}</td>
                                    <td className="py-2 px-4 capitalize text-slate-600">{r.method.replace('_', ' ')}</td>
                                    <td className="py-2 px-4">{r.particulars}</td>
                                    <td className="py-2 px-4 text-slate-500 text-xs">{r.reference}</td>
                                    <td className="py-2 px-4 text-right font-semibold text-blue-600">Rs. {fmt(r.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
