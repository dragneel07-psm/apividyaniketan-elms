// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BookOpen, TrendingUp, TrendingDown, AlertCircle,
    RefreshCw, CheckCircle2,
    Calculator, Archive, Wallet, BarChart3, FileText,
    Coins, Scale,
} from 'lucide-react';

const API = (path: string) => `/api/billing_school${path}`;

async function apiFetch(path: string) {
    const res = await fetch(API(path), { credentials: 'include' });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type COA = { account_id: string; account_code: string; name: string; account_type: string; sub_type: string; balance: number };
type TDSSummary = { fiscal_year: string; total_tds: number; deposited_tds: number; pending_tds: number; by_payment_type: Record<string, { total: number }> };
type InventoryItem = { item_id: string; name: string; category: string; form_type: string; form_type_display: string; purchase_price: number; book_value: number; annual_dep: number; condition: string; location: string; custodian: string; purchase_date_bs: string };
type DepSchedule = { items: InventoryItem[]; total_annual_dep: number };
type IncomeExpenditure = {
    income: { fee_income: number; government_grant: number; donations: number; other_income: number; total: number };
    expenditure: { staff_salary: number; maintenance: number; utilities: number; supplies: number; events: number; transport: number; bank_charges_msf: number; other: number; total: number };
    surplus_deficit: number; label_surplus: string;
};
type BalanceSheet = {
    assets: { current_assets: { cash_and_bank: number; fees_receivable: number; total_current: number }; non_current_assets: { fixed_assets_net: number }; total_assets: number };
    liabilities: { current_liabilities: { tds_payable: number }; total_liabilities: number };
    accumulated_fund: { total: number; restricted_funds: { name: string; balance: number; type: string }[] };
    balanced: boolean;
};
type FundAccount = { fund_id: string; name: string; fund_type: string; fund_type_display: string; purpose: string; opening_balance: number; current_balance: number };
type BSCalendar = { bs_date_str: string; bs_display_en: string; bs_display_np: string; fiscal_year: string; ad_date: string };

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function NASAccountingPage() {
    const [bsDate, setBsDate]         = useState<BSCalendar | null>(null);
    const [ie, setIE]                 = useState<IncomeExpenditure | null>(null);
    const [bs, setBS]                 = useState<BalanceSheet | null>(null);
    const [coa, setCoa]               = useState<COA[]>([]);
    const [tdsSummary, setTdsSummary] = useState<TDSSummary | null>(null);
    const [depSchedule, setDepSchedule] = useState<DepSchedule | null>(null);
    const [funds, setFunds]           = useState<FundAccount[]>([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [activeTab, setActiveTab]   = useState('statements');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [calData, ieData, bsData, coaData, tdsData, depData, fundData] = await Promise.all([
                apiFetch('/nas/bs-calendar/?action=today').catch(() => null),
                apiFetch('/nas/financial-statements/?statement=income_expenditure').catch(() => null),
                apiFetch('/nas/financial-statements/?statement=balance_sheet').catch(() => null),
                apiFetch('/nas/chart-of-accounts/').catch(() => []),
                apiFetch('/nas/tds/summary/').catch(() => null),
                apiFetch('/nas/inventory/depreciation-schedule/').catch(() => null),
                apiFetch('/nas/fund-accounts/').catch(() => []),
            ]);
            setBsDate(calData);
            setIE(ieData?.data);
            setBS(bsData?.data);
            setCoa(Array.isArray(coaData) ? coaData : []);
            setTdsSummary(tdsData);
            setDepSchedule(depData);
            setFunds(Array.isArray(fundData) ? fundData : []);
        } catch (e: any) {
            setError(e.message || 'Failed to load accounting data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const seedCOA = async () => {
        await fetch(API('/nas/chart-of-accounts/seed-defaults/'), { method: 'POST', credentials: 'include' });
        load();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh] gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="font-medium">Loading NAS Accounting Module…</span>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Scale className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900">NAS Accounting</h1>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">NPO 2018</Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                        Nepal Accounting Standards compliant · Bikram Sambat dual calendar
                        {bsDate && (
                            <span className="ml-2 font-semibold text-indigo-600">
                                आज: {bsDate.bs_display_np} · FY {bsDate.fiscal_year}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                    <Button size="sm" onClick={seedCOA} className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                        <BookOpen className="h-3.5 w-3.5" /> Seed Chart of Accounts
                    </Button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Quick Stats Row ──────────────────────────────────────── */}
            {ie && bs && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Income"
                        value={`NPR ${ie.income.total.toLocaleString()}`}
                        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                        bg="from-emerald-50 to-teal-50"
                        iconBg="bg-emerald-100"
                        trend={ie.label_surplus === 'Surplus' ? 'up' : 'down'}
                    />
                    <StatCard
                        label="Total Expenditure"
                        value={`NPR ${ie.expenditure.total.toLocaleString()}`}
                        icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
                        bg="from-rose-50 to-pink-50"
                        iconBg="bg-rose-100"
                    />
                    <StatCard
                        label={ie.label_surplus}
                        value={`NPR ${Math.abs(ie.surplus_deficit).toLocaleString()}`}
                        icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
                        bg="from-indigo-50 to-purple-50"
                        iconBg="bg-indigo-100"
                    />
                    <StatCard
                        label="Total Assets"
                        value={`NPR ${bs.assets.total_assets.toLocaleString()}`}
                        icon={<Coins className="h-5 w-5 text-amber-600" />}
                        bg="from-amber-50 to-orange-50"
                        iconBg="bg-amber-100"
                    />
                </div>
            )}

            {/* ── Main Tabs ────────────────────────────────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto gap-1 flex-wrap">
                    {[
                        { value: 'statements', label: 'Financial Statements', icon: FileText },
                        { value: 'balance_sheet', label: 'Balance Sheet', icon: Scale },
                        { value: 'coa', label: 'Chart of Accounts', icon: BookOpen },
                        { value: 'tds', label: 'TDS Register', icon: Calculator },
                        { value: 'inventory', label: 'Jinshi (Inventory)', icon: Archive },
                        { value: 'funds', label: 'Fund Accounts', icon: Wallet },
                    ].map(({ value, label, icon: Icon }) => (
                        <TabsTrigger
                            key={value} value={value}
                            className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 gap-1.5 px-3 py-1.5"
                        >
                            <Icon className="h-3.5 w-3.5" /> {label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* ── Income & Expenditure Statement ──────────────────── */}
                <TabsContent value="statements">
                    {ie ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {/* Income */}
                            <Card className="rounded-2xl border-0 shadow-md bg-white">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">Income Statement</CardTitle>
                                            <p className="text-[10px] text-slate-400">Statement of Income & Expenditure — NAS NPO 2018</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    <SectionLabel>INCOME (आय)</SectionLabel>
                                    <LineItem label="Tuition & Fee Income" value={ie.income.fee_income} color="emerald" />
                                    <LineItem label="Government Grant" value={ie.income.government_grant} color="blue" />
                                    <LineItem label="Donations Received" value={ie.income.donations} color="violet" />
                                    <LineItem label="Other Income" value={ie.income.other_income} color="slate" />
                                    <TotalLine label="Total Income" value={ie.income.total} />

                                    <div className="border-t border-slate-100 pt-3 mt-3">
                                        <SectionLabel>EXPENDITURE (खर्च)</SectionLabel>
                                        <LineItem label="Staff Salary & Benefits" value={ie.expenditure.staff_salary} color="rose" />
                                        <LineItem label="Academic / Programme" value={ie.expenditure.supplies} color="orange" />
                                        <LineItem label="Repairs & Maintenance" value={ie.expenditure.maintenance} color="amber" />
                                        <LineItem label="Utilities (Power/Water)" value={ie.expenditure.utilities} color="yellow" />
                                        <LineItem label="Events & Activities" value={ie.expenditure.events} color="purple" />
                                        <LineItem label="Transport" value={ie.expenditure.transport} color="slate" />
                                        <LineItem label="Bank Charges / Gateway MSF" value={ie.expenditure.bank_charges_msf} color="red" />
                                        <LineItem label="Other Expenditure" value={ie.expenditure.other} color="slate" />
                                        <TotalLine label="Total Expenditure" value={ie.expenditure.total} />
                                    </div>

                                    <div className={`mt-4 p-4 rounded-xl border-2 ${ie.surplus_deficit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`font-black text-base ${ie.surplus_deficit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {ie.label_surplus} for the Period
                                            </span>
                                            <span className={`font-black text-xl ${ie.surplus_deficit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                NPR {Math.abs(ie.surplus_deficit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Expenditure breakdown visual */}
                            <Card className="rounded-2xl border-0 shadow-md bg-white">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <CardTitle className="text-base font-bold text-slate-900">Expenditure Breakdown</CardTitle>
                                    <p className="text-[10px] text-slate-400">% of total expenditure by category</p>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {[
                                        { label: 'Staff Salary', value: ie.expenditure.staff_salary, color: 'bg-rose-500' },
                                        { label: 'Supplies / Academic', value: ie.expenditure.supplies, color: 'bg-orange-500' },
                                        { label: 'Maintenance', value: ie.expenditure.maintenance, color: 'bg-amber-500' },
                                        { label: 'Utilities', value: ie.expenditure.utilities, color: 'bg-yellow-500' },
                                        { label: 'Events', value: ie.expenditure.events, color: 'bg-purple-500' },
                                        { label: 'Transport', value: ie.expenditure.transport, color: 'bg-blue-500' },
                                        { label: 'Gateway MSF', value: ie.expenditure.bank_charges_msf, color: 'bg-indigo-500' },
                                        { label: 'Other', value: ie.expenditure.other, color: 'bg-slate-400' },
                                    ].filter(r => r.value > 0).map(({ label, value, color }) => {
                                        const pct = ie.expenditure.total > 0 ? (value / ie.expenditure.total * 100) : 0;
                                        return (
                                            <div key={label}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600 font-medium">{label}</span>
                                                    <span className="text-slate-500">NPR {value.toLocaleString()} ({pct.toFixed(1)}%)</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {ie.expenditure.total === 0 && (
                                        <p className="text-center text-sm text-slate-400 py-8">No expenditure recorded yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : <EmptyState message="Income & Expenditure data unavailable." />}
                </TabsContent>

                {/* ── Balance Sheet ────────────────────────────────────── */}
                <TabsContent value="balance_sheet">
                    {bs ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {/* Assets */}
                            <Card className="rounded-2xl border-0 shadow-md bg-white">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Coins className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">Statement of Financial Position</CardTitle>
                                            <p className="text-[10px] text-slate-400">NAS NPO 2018 — Assets side</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-2">
                                    <SectionLabel>ASSETS (सम्पत्ति)</SectionLabel>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">Current Assets</p>
                                    <LineItem label="Cash & Bank" value={bs.assets.current_assets.cash_and_bank} color="emerald" />
                                    <LineItem label="Fees Receivable" value={bs.assets.current_assets.fees_receivable} color="blue" />
                                    <SubTotalLine label="Total Current Assets" value={bs.assets.current_assets.total_current} />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-3">Non-Current Assets</p>
                                    <LineItem label="Fixed Assets (Net)" value={bs.assets.non_current_assets.fixed_assets_net} color="violet" />
                                    <TotalLine label="Total Assets" value={bs.assets.total_assets} />

                                    <div className="border-t border-slate-100 pt-3 mt-3">
                                        <SectionLabel>LIABILITIES (दायित्व)</SectionLabel>
                                        <LineItem label="TDS Payable to IRD" value={bs.liabilities.current_liabilities.tds_payable} color="rose" />
                                        <TotalLine label="Total Liabilities" value={bs.liabilities.total_liabilities} />
                                    </div>

                                    <div className="border-t border-slate-100 pt-3 mt-3">
                                        <SectionLabel>ACCUMULATED FUND (सञ्चित कोष)</SectionLabel>
                                        <LineItem label="Net Accumulated Fund" value={bs.accumulated_fund.total} color="indigo" />
                                        <TotalLine label="Total Liabilities + Fund" value={bs.liabilities.total_liabilities + bs.accumulated_fund.total} />
                                    </div>

                                    <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm font-bold ${bs.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {bs.balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                        {bs.balanced ? 'Balance Sheet is balanced ✓' : 'Warning: Balance Sheet does not balance!'}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Restricted Funds */}
                            <Card className="rounded-2xl border-0 shadow-md bg-white">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <CardTitle className="text-base font-bold text-slate-900">Fund Composition</CardTitle>
                                    <p className="text-[10px] text-slate-400">Restricted vs Unrestricted fund breakdown</p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {bs.accumulated_fund.restricted_funds.length === 0 ? (
                                        <EmptyState message="No fund accounts configured yet. Add them in the Fund Accounts tab." />
                                    ) : (
                                        <div className="space-y-3">
                                            {bs.accumulated_fund.restricted_funds.map((f) => (
                                                <div key={f.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-2 w-2 rounded-full ${f.type === 'restricted' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                                                        <span className="text-sm font-medium text-slate-700">{f.name}</span>
                                                        <Badge className={`text-[9px] px-1.5 py-0 ${f.type === 'restricted' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'} border-0`}>
                                                            {f.type}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">NPR {f.balance.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : <EmptyState message="Balance Sheet data unavailable." />}
                </TabsContent>

                {/* ── Chart of Accounts ────────────────────────────────── */}
                <TabsContent value="coa">
                    <Card className="rounded-2xl border-0 shadow-md bg-white mt-4">
                        <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Chart of Accounts</CardTitle>
                                <p className="text-[10px] text-slate-400">NAS-compliant double-entry COA · {coa.length} accounts</p>
                            </div>
                            <Button size="sm" onClick={seedCOA} variant="outline" className="rounded-xl text-xs gap-1">
                                <BookOpen className="h-3 w-3" /> Seed Defaults
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {coa.length === 0 ? (
                                <EmptyState message="No accounts found. Click 'Seed Defaults' to create the standard Nepali school COA." />
                            ) : (
                                <div className="space-y-1">
                                    {(['asset', 'liability', 'equity', 'income', 'expenditure'] as const).map(type => {
                                        const group = coa.filter(a => a.account_type === type);
                                        if (!group.length) return null;
                                        const typeLabels: Record<string, string> = {
                                            asset: 'Assets (सम्पत्ति)', liability: 'Liabilities (दायित्व)',
                                            equity: 'Accumulated Fund (सञ्चित कोष)', income: 'Income (आय)',
                                            expenditure: 'Expenditure (खर्च)',
                                        };
                                        const typeColors: Record<string, string> = {
                                            asset: 'text-blue-700 bg-blue-50', liability: 'text-rose-700 bg-rose-50',
                                            equity: 'text-indigo-700 bg-indigo-50', income: 'text-emerald-700 bg-emerald-50',
                                            expenditure: 'text-orange-700 bg-orange-50',
                                        };
                                        return (
                                            <div key={type} className="mb-4">
                                                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg mb-1 ${typeColors[type]}`}>
                                                    {typeLabels[type]}
                                                </div>
                                                {group.map(acc => (
                                                    <div key={acc.account_id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 group">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-slate-400 w-12">{acc.account_code}</span>
                                                            <span className="text-sm font-medium text-slate-700">{acc.name}</span>
                                                            {acc.sub_type && <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-500 border-0">{acc.sub_type.replace('_', ' ')}</Badge>}
                                                        </div>
                                                        <span className={`text-sm font-bold ${acc.balance >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                                                            NPR {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TDS Register ─────────────────────────────────────── */}
                <TabsContent value="tds">
                    <div className="mt-4 space-y-4">
                        {tdsSummary && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                                    <CardContent className="p-5">
                                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Total TDS Withheld</p>
                                        <p className="text-3xl font-black mt-1">NPR {tdsSummary.total_tds.toLocaleString()}</p>
                                        <p className="text-indigo-200 text-xs mt-1">FY {tdsSummary.fiscal_year}</p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                                    <CardContent className="p-5">
                                        <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest">Deposited to IRD</p>
                                        <p className="text-3xl font-black mt-1">NPR {tdsSummary.deposited_tds.toLocaleString()}</p>
                                        <p className="text-emerald-200 text-xs mt-1">
                                            <CheckCircle2 className="inline h-3 w-3 mr-1" />Cleared
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className={`rounded-2xl border-0 shadow-md text-white ${tdsSummary.pending_tds > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                                    <CardContent className="p-5">
                                        <p className="text-rose-100 text-xs font-bold uppercase tracking-widest">Pending Deposit</p>
                                        <p className="text-3xl font-black mt-1">NPR {tdsSummary.pending_tds.toLocaleString()}</p>
                                        {tdsSummary.pending_tds > 0 && (
                                            <p className="text-rose-200 text-xs mt-1">
                                                <AlertCircle className="inline h-3 w-3 mr-1" />Deposit to IRD
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card className="rounded-2xl border-0 shadow-md bg-white">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-base font-bold text-slate-900">TDS Register</CardTitle>
                                <p className="text-[10px] text-slate-400">
                                    1.5% vendor TDS (Section 88) · 10% rent · 15% professional fee · Auto-calculated per IRD Nepal
                                </p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {tdsSummary && Object.keys(tdsSummary.by_payment_type).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(tdsSummary.by_payment_type).map(([type, data]) => (
                                            <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 capitalize">{type.replace('_', ' ')}</p>
                                                </div>
                                                <span className="text-sm font-bold text-indigo-700">NPR {data.total.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState message="No TDS entries recorded yet. Record vendor payments to auto-calculate TDS." />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Jinshi / Inventory ───────────────────────────────── */}
                <TabsContent value="inventory">
                    <Card className="rounded-2xl border-0 shadow-md bg-white mt-4">
                        <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Jinshi Register (जिन्सी)</CardTitle>
                                <p className="text-[10px] text-slate-400">Form 401 Capital · Form 403 Store · Form 405 Condemned · Nepal Govt depreciation rates</p>
                            </div>
                            {depSchedule && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400">Annual Depreciation</p>
                                    <p className="text-sm font-black text-rose-600">NPR {depSchedule.total_annual_dep.toLocaleString()}</p>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4">
                            {!depSchedule || depSchedule.items.length === 0 ? (
                                <EmptyState message="No inventory items recorded. Add capital assets to generate a depreciation schedule." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-slate-400 border-b border-slate-100">
                                                <th className="text-left py-2 px-3 font-bold">Item</th>
                                                <th className="text-left py-2 px-3 font-bold">Category</th>
                                                <th className="text-left py-2 px-3 font-bold">Form</th>
                                                <th className="text-right py-2 px-3 font-bold">Cost</th>
                                                <th className="text-right py-2 px-3 font-bold">Book Value</th>
                                                <th className="text-right py-2 px-3 font-bold">Annual Dep.</th>
                                                <th className="text-left py-2 px-3 font-bold">Condition</th>
                                                <th className="text-left py-2 px-3 font-bold">Purchase (BS)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {depSchedule.items.map((item) => (
                                                <tr key={item.item_id} className="border-b border-slate-50 hover:bg-slate-50">
                                                    <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                                                    <td className="py-2 px-3 text-slate-500 capitalize">{item.category.replace('_', ' ')}</td>
                                                    <td className="py-2 px-3">
                                                        <Badge className="text-[9px] bg-indigo-100 text-indigo-700 border-0">{item.form_type}</Badge>
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-600">{item.purchase_price.toLocaleString()}</td>
                                                    <td className="py-2 px-3 text-right font-bold text-slate-800">{item.book_value.toLocaleString()}</td>
                                                    <td className="py-2 px-3 text-right text-rose-600 font-semibold">{item.annual_dep.toLocaleString()}</td>
                                                    <td className="py-2 px-3">
                                                        <Badge className={`text-[9px] border-0 ${
                                                            item.condition === 'good' ? 'bg-emerald-100 text-emerald-700' :
                                                            item.condition === 'fair' ? 'bg-amber-100 text-amber-700' :
                                                            item.condition === 'poor' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>{item.condition}</Badge>
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-400">{item.purchase_date_bs}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50 font-bold">
                                                <td colSpan={5} className="py-2 px-3 text-slate-700">Total Annual Depreciation</td>
                                                <td className="py-2 px-3 text-right text-rose-700">
                                                    NPR {depSchedule.total_annual_dep.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Fund Accounts ────────────────────────────────────── */}
                <TabsContent value="funds">
                    <Card className="rounded-2xl border-0 shadow-md bg-white mt-4">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-base font-bold text-slate-900">Fund Accounts</CardTitle>
                            <p className="text-[10px] text-slate-400">
                                Restricted vs Unrestricted fund pots — NAS NPO 2018 Section 8 · Statement of Changes in Reserves
                            </p>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {funds.length === 0 ? (
                                <EmptyState message="No fund accounts set up. Create restricted funds (Scholarship, Building) and unrestricted (General) funds." />
                            ) : (
                                <div className="space-y-3">
                                    {['restricted', 'unrestricted', 'endowment'].map(type => {
                                        const group = funds.filter(f => f.fund_type === type);
                                        if (!group.length) return null;
                                        return (
                                            <div key={type}>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                                    {type === 'restricted' ? '🔒 Restricted Funds' : type === 'endowment' ? '🏛 Endowment Funds' : '🟢 Unrestricted Funds'}
                                                </p>
                                                {group.map(fund => (
                                                    <div key={fund.fund_id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-slate-800">{fund.name}</span>
                                                                <Badge className={`text-[9px] px-1.5 border-0 ${type === 'restricted' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                    {fund.fund_type_display}
                                                                </Badge>
                                                            </div>
                                                            {fund.purpose && <p className="text-xs text-slate-400 mt-0.5">{fund.purpose}</p>}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-base font-black text-slate-900">NPR {fund.current_balance.toLocaleString()}</p>
                                                            <p className="text-[10px] text-slate-400">Opening: NPR {fund.opening_balance.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, bg, iconBg, trend }: {
    label: string; value: string; icon: React.ReactNode; bg: string; iconBg: string;
    trend?: 'up' | 'down';
}) {
    return (
        <Card className="border-0 shadow-md overflow-hidden rounded-2xl">
            <CardContent className="p-5 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${bg} opacity-60`} />
                <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                        <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                            {icon}
                        </div>
                        {trend && (
                            trend === 'up'
                                ? <TrendingUp className="h-4 w-4 text-emerald-500" />
                                : <TrendingDown className="h-4 w-4 text-rose-500" />
                        )}
                    </div>
                    <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{children}</p>;
}

function LineItem({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
            <span className="text-sm text-slate-600">{label}</span>
            <span className={`text-sm font-semibold text-${color}-700`}>
                NPR {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        </div>
    );
}

function SubTotalLine({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between py-1.5 bg-slate-50 rounded-lg px-2 mt-1">
            <span className="text-xs font-bold text-slate-600">{label}</span>
            <span className="text-sm font-bold text-slate-800">NPR {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
    );
}

function TotalLine({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between py-2 border-t-2 border-slate-200 mt-1">
            <span className="text-sm font-black text-slate-800">{label}</span>
            <span className="text-base font-black text-slate-900">NPR {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Archive className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">{message}</p>
        </div>
    );
}
