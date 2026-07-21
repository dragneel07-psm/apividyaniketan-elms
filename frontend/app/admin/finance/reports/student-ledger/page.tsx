// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { academicAPI, billingAPI, LedgerRow, Student } from '@/lib/api';
import { toast } from 'sonner';
import { BookOpen, Printer, Loader2, Search } from 'lucide-react';

const fmt = (n: string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export default function StudentLedgerPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Student | null>(null);
    const [studentInfo, setStudentInfo] = useState<{ id: string; name: string; class: string } | null>(null);
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [totals, setTotals] = useState({ debit: '0', credit: '0', balance: '0' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        academicAPI.getStudents().then(setStudents).catch(() => toast.error('Failed to load students'));
    }, []);

    const load = useCallback(async (sid: string) => {
        setLoading(true);
        try {
            const data = await billingAPI.studentLedger(sid);
            setStudentInfo(data.student);
            setRows(data.rows);
            setTotals(data.totals);
        } catch {
            toast.error('Failed to load ledger');
        } finally {
            setLoading(false);
        }
    }, []);

    const pickStudent = (s: Student) => {
        setSelected(s);
        load(s.id);
    };

    const filtered = search
        ? students.filter(s =>
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
            || s.student_id.includes(search))
        : students.slice(0, 8);

    const print = () => {
        if (!studentInfo) return;
        const tbody = rows.map(r => `
            <tr>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${escapeHtml(r.particulars)}</td>
                <td>${escapeHtml(r.reference)}</td>
                <td class="num">${Number(r.debit) ? `Rs. ${fmt(r.debit)}` : ''}</td>
                <td class="num">${Number(r.credit) ? `Rs. ${fmt(r.credit)}` : ''}</td>
                <td class="num bal">Rs. ${fmt(r.balance)}</td>
            </tr>`).join('');
        const html = `<!doctype html><html><head><title>Ledger — ${escapeHtml(studentInfo.name)}</title><style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; font-size: 11px; }
            h1 { font-size: 18px; margin: 0; } .meta { color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; text-transform: uppercase; font-size: 9px; color: #64748b; padding: 6px 8px; border-bottom: 1.5px solid #111827; }
            td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
            td.num { text-align: right; font-variant-numeric: tabular-nums; }
            td.bal { font-weight: 700; color: ${Number(totals.balance) > 0 ? '#dc2626' : '#059669'}; }
            tfoot td { font-weight: 700; border-top: 1.5px solid #111827; padding-top: 8px; }
            </style></head><body>
            <h1>Account Statement</h1>
            <div class="meta">${escapeHtml(studentInfo.name)} ${studentInfo.class ? '· Class ' + escapeHtml(studentInfo.class) : ''}</div>
            <table>
                <thead><tr><th>Date</th><th>Particulars</th><th>Ref.</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
                <tbody>${tbody}</tbody>
                <tfoot><tr><td colspan="3">TOTALS</td><td class="num">Rs. ${fmt(totals.debit)}</td><td class="num">Rs. ${fmt(totals.credit)}</td><td class="num bal">Rs. ${fmt(totals.balance)}</td></tr></tfoot>
            </table>
            <script>window.onload = () => window.print();</script>
            </body></html>`;
        const w = window.open('', '_blank', 'width=1000,height=900');
        if (!w) { toast.error('Allow pop-ups to print'); return; }
        w.document.open(); w.document.write(html); w.document.close();
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-xl"><BookOpen className="h-5 w-5 text-violet-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Student Ledger</h1>
                    <p className="text-sm text-slate-500">T-format ledger of every charge and payment for one student.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Picker */}
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle className="text-base">Find Student</CardTitle></CardHeader>
                    <CardContent>
                        <Label className="text-xs uppercase text-slate-500">Search</Label>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input className="pl-9" placeholder="Name or ID" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                            {filtered.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => pickStudent(s)}
                                    className={`w-full text-left p-2 rounded text-sm hover:bg-slate-50 border ${selected?.id === s.id ? 'border-violet-300 bg-violet-50' : 'border-transparent'}`}
                                >
                                    <div className="font-semibold">{s.first_name} {s.last_name}</div>
                                    <div className="text-xs text-slate-500">ID: {s.student_id.slice(0, 8)}</div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Ledger */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">{studentInfo ? studentInfo.name : 'Select a student'}</CardTitle>
                            {studentInfo?.class && <p className="text-xs text-slate-500 mt-1">Class: {studentInfo.class}</p>}
                        </div>
                        {studentInfo && (
                            <Button variant="outline" size="sm" onClick={print} disabled={!rows.length}><Printer className="h-4 w-4 mr-2" />Print</Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {!studentInfo ? (
                            <div className="py-16 text-center text-slate-400 text-sm">Pick a student on the left.</div>
                        ) : loading ? (
                            <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></div>
                        ) : (
                            <>
                                <div className="px-6 pb-4 grid grid-cols-3 gap-3">
                                    <Stat label="Charged (Dr)" value={totals.debit} color="text-slate-700" />
                                    <Stat label="Paid (Cr)" value={totals.credit} color="text-emerald-600" />
                                    <Stat label="Balance" value={totals.balance} color={Number(totals.balance) > 0 ? 'text-red-600' : 'text-emerald-700'} />
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {['Date', 'Particulars', 'Ref.', 'Debit', 'Credit', 'Balance'].map(h => (
                                                <th key={h} className={`py-2 px-4 text-xs uppercase tracking-wider text-slate-500 font-bold border-b ${['Debit', 'Credit', 'Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr><td colSpan={6} className="py-12 text-center text-slate-400">No transactions yet.</td></tr>
                                        ) : rows.map((r, i) => (
                                            <tr key={i} className="border-b hover:bg-slate-50/50">
                                                <td className="py-2 px-4">{new Date(r.date).toLocaleDateString()}</td>
                                                <td className="py-2 px-4">{r.particulars}</td>
                                                <td className="py-2 px-4 text-xs text-slate-500">{r.reference}</td>
                                                <td className="py-2 px-4 text-right">{Number(r.debit) ? `Rs. ${fmt(r.debit)}` : ''}</td>
                                                <td className="py-2 px-4 text-right text-emerald-600 font-semibold">{Number(r.credit) ? `Rs. ${fmt(r.credit)}` : ''}</td>
                                                <td className={`py-2 px-4 text-right font-bold ${Number(r.balance) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>Rs. {fmt(r.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
            <div className={`font-bold text-lg ${color}`}>Rs. {fmt(value)}</div>
        </div>
    );
}
