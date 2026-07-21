// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billingAPI, TrialBalance } from '@/lib/api';
import { toast } from 'sonner';
import { Scale, Printer, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function TrialBalancePage() {
    const [asOf, setAsOf] = useState(today());
    const [data, setData] = useState<TrialBalance | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await billingAPI.trialBalance(asOf));
        } catch {
            toast.error('Failed to load Trial Balance');
        } finally {
            setLoading(false);
        }
    }, [asOf]);

    useEffect(() => { load(); }, [load]);

    const print = () => {
        if (!data) return;
        const tbody = data.rows.map(r => `
            <tr>
                <td>${escapeHtml(r.account_code)}</td>
                <td>${escapeHtml(r.account_name)}</td>
                <td class="cap">${escapeHtml(r.account_type)}</td>
                <td class="num">${Number(r.debit) ? `Rs. ${fmt(r.debit)}` : ''}</td>
                <td class="num">${Number(r.credit) ? `Rs. ${fmt(r.credit)}` : ''}</td>
            </tr>`).join('');
        const html = `<!doctype html><html><head><title>Trial Balance ${asOf}</title><style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
            h1 { font-size: 18px; margin: 0; } .meta { color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; text-transform: uppercase; font-size: 9px; color: #64748b; padding: 6px 8px; border-bottom: 1.5px solid #111827; }
            td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; }
            td.cap, .cap { text-transform: capitalize; }
            tfoot td { font-weight: 700; border-top: 1.5px solid #111827; padding-top: 8px; }
            .balance-tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 700; }
            .balance-tag.ok { background: #d1fae5; color: #047857; }
            .balance-tag.bad { background: #fee2e2; color: #991b1b; }
            </style></head><body>
            <h1>Trial Balance</h1>
            <div class="meta">As of ${asOf}
                <span class="balance-tag ${data.balanced ? 'ok' : 'bad'}">${data.balanced ? 'BALANCED' : 'OUT OF BALANCE'}</span>
            </div>
            <table>
                <thead><tr><th>Code</th><th>Account</th><th>Type</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
                <tbody>${tbody}</tbody>
                <tfoot><tr><td colspan="3">TOTALS</td><td class="num">Rs. ${fmt(data.totals.debit)}</td><td class="num">Rs. ${fmt(data.totals.credit)}</td></tr></tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
            </body></html>`;
        const w = window.open('', '_blank', 'width=1000,height=900');
        if (!w) { toast.error('Allow pop-ups to print'); return; }
        w.document.open(); w.document.write(html); w.document.close();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl"><Scale className="h-5 w-5 text-amber-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
                    <p className="text-sm text-slate-500">All Chart of Accounts balances from posted journal entries.</p>
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
                        {data && (
                            <span className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${data.balanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {data.balanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                {data.balanced ? 'BALANCED' : 'OUT OF BALANCE'}
                            </span>
                        )}
                        <Button variant="outline" onClick={print} disabled={!data}><Printer className="h-4 w-4 mr-2" />Print</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-base">Accounts ({data?.rows.length ?? 0})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Code', 'Account', 'Type', 'Debit', 'Credit'].map(h => (
                                    <th key={h} className={`py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b ${['Debit', 'Credit'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!data || data.rows.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                                    No posted journal entries yet. Post manual journal entries to see balances here. Phase C will auto-post payments.
                                </td></tr>
                            ) : data.rows.map((r, i) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                    <td className="py-2 px-4 font-mono text-xs">{r.account_code}</td>
                                    <td className="py-2 px-4 font-semibold">{r.account_name}</td>
                                    <td className="py-2 px-4 capitalize text-slate-500">{r.account_type}</td>
                                    <td className="py-2 px-4 text-right">{Number(r.debit) ? `Rs. ${fmt(r.debit)}` : ''}</td>
                                    <td className="py-2 px-4 text-right">{Number(r.credit) ? `Rs. ${fmt(r.credit)}` : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        {data && data.rows.length > 0 && (
                            <tfoot className="bg-slate-50 font-bold">
                                <tr>
                                    <td colSpan={3} className="py-3 px-4 uppercase text-xs">Totals</td>
                                    <td className="py-3 px-4 text-right">Rs. {fmt(data.totals.debit)}</td>
                                    <td className="py-3 px-4 text-right">Rs. {fmt(data.totals.credit)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
