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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { inventoryAPI, ConsumableStock } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Archive, ArrowUp, ArrowDown, AlertTriangle, Loader2, Trash2 } from 'lucide-react';

const UNITS = [
    { value: 'pcs', label: 'Pieces' }, { value: 'box', label: 'Boxes' },
    { value: 'ream', label: 'Reams' }, { value: 'litre', label: 'Litres' },
    { value: 'kg', label: 'Kilograms' }, { value: 'set', label: 'Sets' }, { value: 'other', label: 'Other' },
];
const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' }, { value: 'furniture', label: 'Furniture' },
    { value: 'lab_equipment', label: 'Lab Equipment' }, { value: 'sports', label: 'Sports' },
    { value: 'books', label: 'Books' }, { value: 'vehicles', label: 'Vehicles' }, { value: 'other', label: 'Other' },
];

const BLANK = {
    name: '', category: 'other', unit: 'pcs',
    current_quantity: '', minimum_quantity: '', location: '', notes: '',
};

export function StockManager() {
    const [items, setItems] = useState<ConsumableStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [lowOnly, setLowOnly] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editItem, setEditItem] = useState<ConsumableStock | null>(null);
    const [form, setForm] = useState({ ...BLANK });
    const [submitting, setSubmitting] = useState(false);
    const [qtyDialog, setQtyDialog] = useState<{ id: string; type: 'restock' | 'consume' } | null>(null);
    const [qty, setQty] = useState('');
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await inventoryAPI.getStock(lowOnly);
            setItems(Array.isArray(data) ? data : []);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [lowOnly]);

    const openEdit = (item: ConsumableStock) => {
        setEditItem(item);
        setForm({
            name: item.name, category: item.category, unit: item.unit,
            current_quantity: String(item.current_quantity),
            minimum_quantity: String(item.minimum_quantity),
            location: item.location, notes: item.notes,
        });
        setFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = {
                ...form,
                current_quantity: parseFloat(form.current_quantity) || 0,
                minimum_quantity: parseFloat(form.minimum_quantity) || 0,
            };
            if (editItem) { await inventoryAPI.updateStock(editItem.stock_id, payload); toast({ title: 'Stock item updated.' }); }
            else { await inventoryAPI.createStock(payload); toast({ title: 'Stock item added.' }); }
            setFormOpen(false); setEditItem(null); setForm({ ...BLANK }); await load();
        } catch { toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleQtyAction = async () => {
        if (!qtyDialog || !qty) return;
        setSubmitting(true);
        try {
            const q = parseFloat(qty);
            if (qtyDialog.type === 'restock') {
                await inventoryAPI.restock(qtyDialog.id, q);
                toast({ title: `Restocked +${q}` });
            } else {
                await inventoryAPI.consume(qtyDialog.id, q);
                toast({ title: `Consumed -${q}` });
            }
            setQtyDialog(null); setQty(''); await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            // Use updateStock as a soft indicator - actually call deleteStock if available
            // For now we'll call update with a workaround; ideally add deleteStock to inventoryAPI
            toast({ title: 'To delete, use the backend admin or add a delete endpoint.' });
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="rounded" />
                    <span className="text-sm font-bold text-slate-700">Show low stock only</span>
                    {lowOnly && items.length > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-[10px] font-bold">{items.length} items</Badge>
                    )}
                </label>
                <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditItem(null); setForm({ ...BLANK }); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> Add Stock Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[460px]">
                        <DialogHeader><DialogTitle className="font-black">{editItem ? 'Edit Stock Item' : 'Add Stock Item'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Name</label>
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. A4 Copy Paper" className="rounded-xl border-slate-200 text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
                                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Current Qty</label>
                                    <Input type="number" step="0.01" value={form.current_quantity} onChange={e => setForm(f => ({ ...f, current_quantity: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Min Qty (reorder)</label>
                                    <Input type="number" step="0.01" value={form.minimum_quantity} onChange={e => setForm(f => ({ ...f, minimum_quantity: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Location</label>
                                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Storeroom A" className="rounded-xl border-slate-200 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label>
                                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Qty action dialog */}
            <Dialog open={!!qtyDialog} onOpenChange={o => !o && setQtyDialog(null)}>
                <DialogContent className="sm:max-w-[320px]">
                    <DialogHeader>
                        <DialogTitle>{qtyDialog?.type === 'restock' ? 'Restock Item' : 'Record Consumption'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
                            <Input type="number" step="0.01" min="0.01" value={qty} onChange={e => setQty(e.target.value)} className="rounded-xl border-slate-200 text-sm" autoFocus />
                        </div>
                        <Button onClick={handleQtyAction} disabled={submitting || !qty}
                            className={`w-full rounded-xl font-bold text-white ${qtyDialog?.type === 'restock' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {qtyDialog?.type === 'restock' ? 'Add Stock' : 'Record Use'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
            ) : items.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <Archive className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">{lowOnly ? 'No low-stock items.' : 'No stock items found.'}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {items.map(item => (
                        <Card key={item.stock_id} className={`border-slate-200 shadow-sm ${item.is_low ? 'border-l-4 border-l-red-400' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.is_low ? 'bg-red-50' : 'bg-teal-50'}`}>
                                        <Archive className={`h-5 w-5 ${item.is_low ? 'text-red-500' : 'text-teal-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                            <Badge className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600">{item.category_display}</Badge>
                                            {item.is_low && <Badge className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Low Stock</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            <span className={`font-bold ${item.is_low ? 'text-red-600' : 'text-slate-700'}`}>{Number(item.current_quantity)}</span>
                                            {' '}{item.unit_display} · Min: {Number(item.minimum_quantity)} {item.unit_display}
                                            {item.location && ` · ${item.location}`}
                                            {item.last_restocked && ` · Last restocked: ${item.last_restocked}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <Button size="sm" variant="outline"
                                            onClick={() => { setQtyDialog({ id: item.stock_id, type: 'restock' }); setQty(''); }}
                                            className="h-8 px-2 rounded-lg text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                                            <ArrowUp className="h-3.5 w-3.5 mr-1" /> Add
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            onClick={() => { setQtyDialog({ id: item.stock_id, type: 'consume' }); setQty(''); }}
                                            className="h-8 px-2 rounded-lg text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
                                            <ArrowDown className="h-3.5 w-3.5 mr-1" /> Use
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="h-8 px-2 rounded-lg text-xs border-slate-200">Edit</Button>
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
