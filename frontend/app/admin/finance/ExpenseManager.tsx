// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { billingAPI, Expense } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Trash2, Loader2, Search, Receipt,
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
    { value: 'salary', label: 'Salaries' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'events', label: 'Events' },
    { value: 'transport', label: 'Transport' },
    { value: 'other', label: 'Other' },
];

const CAT_COLOR: Record<string, string> = {
    salary: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    utilities: 'bg-cyan-100 text-cyan-700',
    supplies: 'bg-emerald-100 text-emerald-700',
    events: 'bg-violet-100 text-violet-700',
    transport: 'bg-orange-100 text-orange-700',
    other: 'bg-slate-100 text-slate-600',
};

const BLANK_FORM = {
    title: '', amount: '', category: 'other', date: '', description: '',
};

export function ExpenseManager() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editExpense, setEditExpense] = useState<Expense | null>(null);
    const [form, setForm] = useState({ ...BLANK_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await billingAPI.getExpenses();
            setExpenses(Array.isArray(data) ? data : []);
        } catch { setExpenses([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openEdit = (exp: Expense) => {
        setEditExpense(exp);
        setForm({
            title: exp.title,
            amount: String(exp.amount),
            category: exp.category,
            date: exp.date,
            description: exp.description ?? '',
        });
        setFormOpen(true);
    };

    const filtered = expenses.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
            (e.description ?? '').toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || e.category === catFilter;
        return matchSearch && matchCat;
    });

    const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

    const handleSave = async (evt: React.FormEvent) => {
        evt.preventDefault();
        setSubmitting(true);
        try {
            const payload = { ...form, amount: parseFloat(form.amount) } as any;
            if (editExpense) {
                await billingAPI.updateExpense(editExpense.expense_id, payload);
                toast({ title: 'Expense updated.' });
            } else {
                await billingAPI.createExpense(payload);
                toast({ title: 'Expense recorded.' });
            }
            setFormOpen(false);
            setEditExpense(null);
            setForm({ ...BLANK_FORM });
            await load();
        } catch { toast({ title: 'Error', description: 'Failed to save expense.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        setSubmitting(true);
        try {
            await billingAPI.deleteExpense(id);
            toast({ title: 'Expense deleted.' });
            setDeleteId(null);
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 border-slate-200 rounded-xl w-48 text-sm" />
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-wrap">
                        <button onClick={() => setCatFilter('')}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!catFilter ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                            All
                        </button>
                        {EXPENSE_CATEGORIES.map(c => (
                            <button key={c.value} onClick={() => setCatFilter(c.value)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${catFilter === c.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {filtered.length > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total</p>
                            <p className="text-sm font-black text-orange-700">${totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    )}
                    <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditExpense(null); setForm({ ...BLANK_FORM }); } }}>
                        <DialogTrigger asChild>
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                                <Plus className="h-4 w-4" /> Log Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[460px]">
                            <DialogHeader><DialogTitle className="font-black">{editExpense ? 'Edit Expense' : 'Log Expense'}</DialogTitle></DialogHeader>
                            <form onSubmit={handleSave} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Title</label>
                                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="e.g. Electricity bill for March" className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Amount ($)</label>
                                        <Input type="number" step="0.01" min="0" value={form.amount}
                                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                            placeholder="0.00" className="rounded-xl border-slate-200 text-sm" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Date</label>
                                        <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                            className="rounded-xl border-slate-200 text-sm" required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Description (optional)</label>
                                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <Button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No expenses recorded.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(exp => (
                        <Card key={exp.expense_id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{exp.title}</span>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${CAT_COLOR[exp.category] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label ?? exp.category}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {exp.date}
                                            {exp.recorded_by_name && ` · ${exp.recorded_by_name}`}
                                            {exp.description && ` · ${exp.description}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-base font-black text-orange-700">${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <Button size="sm" variant="outline" onClick={() => openEdit(exp)}
                                            className="h-8 px-2 rounded-lg text-xs border-slate-200">Edit</Button>
                                        <Dialog open={deleteId === exp.expense_id} onOpenChange={o => setDeleteId(o ? exp.expense_id : null)}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[340px]">
                                                <DialogHeader><DialogTitle>Delete Expense</DialogTitle></DialogHeader>
                                                <div className="space-y-4 pt-2">
                                                    <p className="text-sm text-slate-600">Delete <strong>{exp.title}</strong> (${Number(exp.amount).toFixed(2)})? This cannot be undone.</p>
                                                    <Button onClick={() => handleDelete(exp.expense_id)} disabled={submitting}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
