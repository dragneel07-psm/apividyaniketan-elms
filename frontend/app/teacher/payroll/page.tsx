// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Wallet, Download, Loader2, FileClock, CheckCircle2, BadgeCheck,
} from 'lucide-react';
import { hrAPI, HRSalarySlip, normalizeArrayPayload } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_BADGE: Record<HRSalarySlip['status'], string> = {
    draft: 'bg-slate-100 text-slate-500',
    finalized: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
};

const STATUS_ICON: Record<HRSalarySlip['status'], typeof FileClock> = {
    draft: FileClock,
    finalized: BadgeCheck,
    paid: CheckCircle2,
};

export default function TeacherPayrollPage() {
    const [slips, setSlips] = useState<HRSalarySlip[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        loadSlips();
    }, []);

    const loadSlips = async () => {
        setLoading(true);
        try {
            const data = await hrAPI.getSalarySlips();
            setSlips(normalizeArrayPayload(data));
        } catch {
            toast.error('Failed to load payslips.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (slip: HRSalarySlip) => {
        setDownloadingId(slip.slip_id);
        try {
            await hrAPI.downloadPayslip(slip.slip_id, `payslip_${slip.period_name.replace(/\s+/g, '_')}.pdf`);
        } catch {
            toast.error('Failed to download payslip.');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-teal-600 font-bold mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Teacher Portal</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Payslips</h1>
                <p className="text-slate-500 font-medium">Your salary slips, one per payroll period.</p>
            </div>

            {/* Table */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-teal-500" />
                        Payslip History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
                        </div>
                    ) : slips.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No payslips yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        {['Period', 'Paid Days', 'Gross', 'Deductions', 'Net', 'Status', 'Payslip'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {slips.map(slip => {
                                        const StatusIcon = STATUS_ICON[slip.status];
                                        return (
                                            <tr key={slip.slip_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-800">{slip.period_name}</td>
                                                <td className="px-4 py-3 text-slate-600">{slip.paid_days}/{slip.working_days}</td>
                                                <td className="px-4 py-3 text-slate-700 font-medium">{Number(slip.gross_salary).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-red-600 font-medium">{Number(slip.total_deductions).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-emerald-700 font-black">{Number(slip.net_salary).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[slip.status]}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {slip.status.charAt(0).toUpperCase() + slip.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {slip.status === 'draft' ? (
                                                        <span className="text-xs text-slate-400 italic">Not finalized yet</span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1"
                                                            disabled={downloadingId === slip.slip_id}
                                                            onClick={() => handleDownload(slip)}
                                                        >
                                                            {downloadingId === slip.slip_id
                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                : <Download className="h-3 w-3" />}
                                                            PDF
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
