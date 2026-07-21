// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ledgerAPI, LedgerAccount, LedgerStatement } from '@/lib/api';
import { toast } from 'sonner';
import {
    BookOpen,
    Landmark,
    Plus,
    Loader2,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Filter,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(n);
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank',
    mobile_banking: 'Mobile Banking',
    other: 'Other',
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    cash: 'bg-teal-100 text-teal-700 border-teal-200',
    bank: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    mobile_banking: 'bg-violet-100 text-violet-700 border-violet-200',
    other: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Account form ─────────────────────────────────────────────────────────────

interface AccountFormState {
    name: string;
    account_type: 'cash' | 'bank' | 'mobile_banking' | 'other';
    bank_name: string;
    account_number: string;
    opening_balance: string;
}

const EMPTY_ACCOUNT: AccountFormState = {
    name: '',
    account_type: 'cash',
    bank_name: '',
    account_number: '',
    opening_balance: '0',
};

// ── Entry form ────────────────────────────────────────────────────────────────

interface EntryFormState {
    date: string;
    entry_type: 'credit' | 'debit';
    amount: string;
    description: string;
    reference: string;
}

const EMPTY_ENTRY: EntryFormState = {
    date: new Date().toISOString().slice(0, 10),
    entry_type: 'credit',
    amount: '',
    description: '',
    reference: '',
};

// ── Main component ────────────────────────────────────────────────────────────

export function LedgerManager() {
    // Accounts
    const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);

    // Statement
    const [statement, setStatement] = useState<LedgerStatement | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Dialogs
    const [accountDialogOpen, setAccountDialogOpen] = useState(false);
    const [entryDialogOpen, setEntryDialogOpen] = useState(false);

    const [accountForm, setAccountForm] = useState<AccountFormState>(EMPTY_ACCOUNT);
    const [accountSubmitting, setAccountSubmitting] = useState(false);

    const [entryForm, setEntryForm] = useState<EntryFormState>(EMPTY_ENTRY);
    const [entrySubmitting, setEntrySubmitting] = useState(false);

    // ── Load accounts ──

    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            const data = await ledgerAPI.getAccounts();
            setAccounts(Array.isArray(data) ? data : []);
        } catch {
            setAccounts([]);
            toast.error('Failed to load ledger accounts');
        } finally {
            setAccountsLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    // ── Load statement ──

    const loadStatement = async (accountId: string) => {
        setStatementLoading(true);
        try {
            const params: { from?: string; to?: string } = {};
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;
            const data = await ledgerAPI.getStatement(accountId, params);
            setStatement(data);
        } catch {
            setStatement(null);
            toast.error('Failed to load account statement');
        } finally {
            setStatementLoading(false);
        }
    };

    const handleSelectAccount = (acc: LedgerAccount) => {
        setSelectedAccount(acc);
        loadStatement(acc.account_id);
    };

    const handleFilterStatement = () => {
        if (selectedAccount) loadStatement(selectedAccount.account_id);
    };

    // ── Account actions ──

    const handleCreateAccount = async () => {
        if (!accountForm.name.trim()) {
            toast.error('Account name is required');
            return;
        }
        setAccountSubmitting(true);
        try {
            await ledgerAPI.createAccount({
                name: accountForm.name.trim(),
                account_type: accountForm.account_type,
                bank_name: accountForm.bank_name.trim() || undefined,
                account_number: accountForm.account_number.trim() || undefined,
                opening_balance: parseFloat(accountForm.opening_balance) || 0,
            });
            toast.success('Ledger account created');
            setAccountForm(EMPTY_ACCOUNT);
            setAccountDialogOpen(false);
            loadAccounts();
        } catch {
            toast.error('Failed to create account');
        } finally {
            setAccountSubmitting(false);
        }
    };

    // ── Entry actions ──

    const handleAddEntry = async () => {
        if (!selectedAccount || !entryForm.amount || !entryForm.description.trim()) {
            toast.error('Amount and description are required');
            return;
        }
        setEntrySubmitting(true);
        try {
            await ledgerAPI.createEntry({
                account: selectedAccount.account_id,
                date: entryForm.date,
                entry_type: entryForm.entry_type,
                amount: parseFloat(entryForm.amount),
                description: entryForm.description.trim(),
                reference: entryForm.reference.trim() || undefined,
            });
            toast.success('Entry recorded');
            setEntryForm(EMPTY_ENTRY);
            setEntryDialogOpen(false);
            loadStatement(selectedAccount.account_id);
            loadAccounts(); // refresh balances
        } catch {
            toast.error('Failed to record entry');
        } finally {
            setEntrySubmitting(false);
        }
    };

    // ── Render ──

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-black text-slate-900">Cash Ledger</h2>
                </div>
                <Button
                    size="sm"
                    onClick={() => setAccountDialogOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" /> Add Account
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ── Left: Accounts list (2/5 width) ── */}
                <div className="lg:col-span-2">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl h-full">
                        <CardHeader className="pb-3 border-b border-slate-100 bg-indigo-50/30">
                            <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-indigo-500" />
                                Accounts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {accountsLoading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                                </div>
                            ) : accounts.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm px-4">
                                    No ledger accounts. Add one to start tracking.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-50">
                                    {accounts.map((acc) => {
                                        const isSelected = selectedAccount?.account_id === acc.account_id;
                                        const typeColor = ACCOUNT_TYPE_COLORS[acc.account_type] ?? ACCOUNT_TYPE_COLORS.other;
                                        return (
                                            <li
                                                key={acc.account_id}
                                                onClick={() => handleSelectAccount(acc)}
                                                className={`px-4 py-3.5 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-indigo-50 border-l-2 border-indigo-500'
                                                        : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                                {acc.name}
                                                            </p>
                                                            {!acc.is_active && (
                                                                <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            )}
                                                        </div>
                                                        {acc.bank_name && (
                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                {acc.bank_name}
                                                                {acc.account_number && ` · ${acc.account_number}`}
                                                            </p>
                                                        )}
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            Opening: NPR {fmt(acc.opening_balance)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <Badge
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}
                                                        >
                                                            {ACCOUNT_TYPE_LABELS[acc.account_type]}
                                                        </Badge>
                                                        <span className={`text-sm font-black ${acc.current_balance >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                                                            NPR {fmt(acc.current_balance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right: Statement (3/5 width) ── */}
                <div className="lg:col-span-3">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl h-full">
                        <CardHeader className="pb-3 border-b border-slate-100 bg-teal-50/30">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-teal-600" />
                                    {selectedAccount ? `${selectedAccount.name} — Statement` : 'Select an account'}
                                </CardTitle>
                                {selectedAccount && (
                                    <Button
                                        size="sm"
                                        onClick={() => setEntryDialogOpen(true)}
                                        className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded-xl h-7 px-2.5 gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add Entry
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {!selectedAccount ? (
                                <div className="text-center py-16 text-slate-400 text-sm">
                                    Select an account from the left to view its statement.
                                </div>
                            ) : (
                                <>
                                    {/* Date filter */}
                                    <div className="flex items-end gap-2 flex-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <Filter className="h-4 w-4 text-slate-400 mt-auto mb-1" />
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-500">From</Label>
                                            <Input
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                className="rounded-lg h-8 text-xs w-36"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-500">To</Label>
                                            <Input
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                className="rounded-lg h-8 text-xs w-36"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleFilterStatement}
                                            className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5"
                                        >
                                            <RefreshCw className="h-3 w-3" /> Apply
                                        </Button>
                                    </div>

                                    {/* Statement table */}
                                    {statementLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
                                        </div>
                                    ) : !statement || statement.entries.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 text-sm">
                                            No entries found for the selected period.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="text-left px-3 py-2.5 font-black text-slate-500 uppercase tracking-wider">Date</th>
                                                        <th className="text-left px-3 py-2.5 font-black text-slate-500 uppercase tracking-wider">Description</th>
                                                        <th className="text-left px-3 py-2.5 font-black text-slate-500 uppercase tracking-wider">Ref</th>
                                                        <th className="text-right px-3 py-2.5 font-black text-red-500 uppercase tracking-wider">Debit</th>
                                                        <th className="text-right px-3 py-2.5 font-black text-teal-600 uppercase tracking-wider">Credit</th>
                                                        <th className="text-right px-3 py-2.5 font-black text-slate-500 uppercase tracking-wider">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {statement.entries.map((entry) => (
                                                        <tr key={entry.entry_id} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                                                {entry.date}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-700 font-medium max-w-[160px] truncate">
                                                                {entry.description}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-400 max-w-[80px] truncate">
                                                                {entry.reference || '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                {entry.debit != null ? (
                                                                    <span className="font-bold text-red-600 flex items-center justify-end gap-0.5">
                                                                        <TrendingDown className="h-3 w-3" />
                                                                        {fmt(entry.debit)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right">
                                                                {entry.credit != null ? (
                                                                    <span className="font-bold text-teal-600 flex items-center justify-end gap-0.5">
                                                                        <TrendingUp className="h-3 w-3" />
                                                                        {fmt(entry.credit)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                                                                {fmt(entry.balance)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {/* Closing balance row */}
                                            <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-t border-indigo-100 rounded-b-xl">
                                                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                    Closing Balance
                                                </div>
                                                <span className={`text-sm font-black ${statement.closing_balance >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                                                    NPR {fmt(statement.closing_balance)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Account status badge */}
                                    {selectedAccount && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {selectedAccount.is_active ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Active
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" /> Inactive
                                                </Badge>
                                            )}
                                            <span>Current Balance:</span>
                                            <span className={`font-black ${selectedAccount.current_balance >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                                                NPR {fmt(selectedAccount.current_balance)}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Add Account Dialog ── */}
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Landmark className="h-5 w-5 text-indigo-600" />
                            New Ledger Account
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Account Name *</Label>
                            <Input
                                placeholder="e.g. Main Cash Register"
                                value={accountForm.name}
                                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Account Type *</Label>
                            <Select
                                value={accountForm.account_type}
                                onValueChange={(v) =>
                                    setAccountForm((f) => ({ ...f, account_type: v as AccountFormState['account_type'] }))
                                }
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                    <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Bank Name (optional)</Label>
                                <Input
                                    placeholder="e.g. NMB Bank"
                                    value={accountForm.bank_name}
                                    onChange={(e) => setAccountForm((f) => ({ ...f, bank_name: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Account No. (optional)</Label>
                                <Input
                                    placeholder="e.g. 0123456789"
                                    value={accountForm.account_number}
                                    onChange={(e) => setAccountForm((f) => ({ ...f, account_number: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Opening Balance (NPR)</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={accountForm.opening_balance}
                                onChange={(e) => setAccountForm((f) => ({ ...f, opening_balance: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAccountDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateAccount}
                            disabled={accountSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5"
                        >
                            {accountSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add Entry Dialog ── */}
            <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <BookOpen className="h-5 w-5 text-teal-600" />
                            Record Entry — {selectedAccount?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Date *</Label>
                                <Input
                                    type="date"
                                    value={entryForm.date}
                                    onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Type *</Label>
                                <Select
                                    value={entryForm.entry_type}
                                    onValueChange={(v) =>
                                        setEntryForm((f) => ({ ...f, entry_type: v as 'credit' | 'debit' }))
                                    }
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credit">
                                            <span className="text-teal-600 font-bold">Credit (In)</span>
                                        </SelectItem>
                                        <SelectItem value="debit">
                                            <span className="text-red-600 font-bold">Debit (Out)</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Amount (NPR) *</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={entryForm.amount}
                                onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Description *</Label>
                            <Textarea
                                placeholder="What is this transaction for?"
                                value={entryForm.description}
                                onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                                rows={2}
                                className="rounded-xl resize-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600">Reference (optional)</Label>
                            <Input
                                placeholder="Voucher no., invoice, etc."
                                value={entryForm.reference}
                                onChange={(e) => setEntryForm((f) => ({ ...f, reference: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEntryDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddEntry}
                            disabled={entrySubmitting}
                            className={`text-white rounded-xl gap-1.5 ${
                                entryForm.entry_type === 'credit'
                                    ? 'bg-teal-600 hover:bg-teal-700'
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {entrySubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {entryForm.entry_type === 'credit' ? (
                                <><TrendingUp className="h-3.5 w-3.5" /> Record Credit</>
                            ) : (
                                <><TrendingDown className="h-3.5 w-3.5" /> Record Debit</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
