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
import { inventoryAPI, InventoryAsset } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Package, UserCheck, RotateCcw, Wrench, Loader2, Trash2 } from 'lucide-react';

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' }, { value: 'furniture', label: 'Furniture' },
    { value: 'lab_equipment', label: 'Lab Equipment' }, { value: 'sports', label: 'Sports' },
    { value: 'books', label: 'Books' }, { value: 'vehicles', label: 'Vehicles' }, { value: 'other', label: 'Other' },
];
const STATUS_COLOR: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700', in_use: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700', retired: 'bg-slate-100 text-slate-600', lost: 'bg-red-100 text-red-700',
};
const CONDITION_COLOR: Record<string, string> = {
    new: 'bg-indigo-100 text-indigo-700', good: 'bg-emerald-100 text-emerald-700',
    fair: 'bg-amber-100 text-amber-700', poor: 'bg-red-100 text-red-700',
};

const BLANK = {
    name: '', asset_tag: '', category: 'other', description: '', serial_number: '',
    brand: '', model_number: '', purchase_date: '', purchase_price: '',
    warranty_expiry: '', location: '', status: 'available', condition: 'good', notes: '',
};

export function AssetRegistry() {
    const [assets, setAssets] = useState<InventoryAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editAsset, setEditAsset] = useState<InventoryAsset | null>(null);
    const [form, setForm] = useState({ ...BLANK });
    const [submitting, setSubmitting] = useState(false);
    const [assignOpen, setAssignOpen] = useState<string | null>(null);
    const [assignForm, setAssignForm] = useState({ assigned_to_location: '', assigned_date: '', expected_return_date: '', notes: '' });
    const [maintenanceOpen, setMaintenanceOpen] = useState<string | null>(null);
    const [maintForm, setMaintForm] = useState({ title: '', description: '', priority: 'medium', estimated_cost: '' });
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await inventoryAPI.getAssets(search ? { search } : undefined);
            setAssets(Array.isArray(data) ? data : []);
        } catch { setAssets([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = assets.filter(a => {
        const matchCat = !catFilter || a.category === catFilter;
        const matchStatus = !statusFilter || a.status === statusFilter;
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.asset_tag.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchStatus && matchSearch;
    });

    const openEdit = (asset: InventoryAsset) => {
        setEditAsset(asset);
        setForm({
            name: asset.name, asset_tag: asset.asset_tag, category: asset.category,
            description: asset.description, serial_number: asset.serial_number,
            brand: asset.brand, model_number: asset.model_number,
            purchase_date: asset.purchase_date ?? '', purchase_price: asset.purchase_price?.toString() ?? '',
            warranty_expiry: asset.warranty_expiry ?? '', location: asset.location,
            status: asset.status, condition: asset.condition, notes: asset.notes,
        });
        setFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload: any = { ...form };
            if (!payload.purchase_price) delete payload.purchase_price; else payload.purchase_price = parseFloat(payload.purchase_price);
            if (!payload.purchase_date) delete payload.purchase_date;
            if (!payload.warranty_expiry) delete payload.warranty_expiry;
            if (editAsset) { await inventoryAPI.updateAsset(editAsset.asset_id, payload); toast({ title: 'Asset updated.' }); }
            else { await inventoryAPI.createAsset(payload); toast({ title: 'Asset created.' }); }
            setFormOpen(false); setEditAsset(null); setForm({ ...BLANK }); await load();
        } catch { toast({ title: 'Error', description: 'Failed to save asset.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleAssign = async (assetId: string) => {
        setSubmitting(true);
        try {
            await inventoryAPI.assignAsset(assetId, { ...assignForm } as any);
            toast({ title: 'Asset assigned.' });
            setAssignOpen(null);
            setAssignForm({ assigned_to_location: '', assigned_date: '', expected_return_date: '', notes: '' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleReturn = async (assetId: string) => {
        try { await inventoryAPI.returnAsset(assetId); toast({ title: 'Asset returned.' }); await load(); }
        catch { toast({ title: 'Error', variant: 'destructive' }); }
    };

    const handleMaintenanceRequest = async (assetId: string) => {
        setSubmitting(true);
        try {
            const payload: any = { asset: assetId, ...maintForm };
            if (!payload.estimated_cost) delete payload.estimated_cost;
            else payload.estimated_cost = parseFloat(payload.estimated_cost);
            await inventoryAPI.createMaintenanceRequest(payload);
            toast({ title: 'Maintenance request created.' });
            setMaintenanceOpen(null);
            setMaintForm({ title: '', description: '', priority: 'medium', estimated_cost: '' });
            await load();
        } catch { toast({ title: 'Error', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        try { await inventoryAPI.deleteAsset(id); toast({ title: 'Asset deleted.' }); await load(); }
        catch { toast({ title: 'Error', variant: 'destructive' }); }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                            className="pl-9 border-slate-200 rounded-xl w-48 text-sm" />
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-wrap">
                        <button onClick={() => setCatFilter('')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${!catFilter ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>All</button>
                        {CATEGORIES.map(c => (
                            <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? '' : c.value)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${catFilter === c.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white font-bold text-slate-600">
                        <option value="">All Statuses</option>
                        <option value="available">Available</option>
                        <option value="in_use">In Use</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="retired">Retired</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
                <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditAsset(null); setForm({ ...BLANK }); } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> Add Asset
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle className="font-black">{editAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Name</label>
                                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Asset Tag</label>
                                    <Input value={form.asset_tag} onChange={e => setForm(f => ({ ...f, asset_tag: e.target.value }))} placeholder="e.g. COMP-042" className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Brand</label>
                                    <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Serial Number</label>
                                    <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Purchase Date</label>
                                    <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Purchase Price</label>
                                    <Input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Condition</label>
                                    <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        <option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Warranty Expiry</label>
                                    <Input type="date" value={form.warranty_expiry} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Location</label>
                                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Lab 2, Room 101" className="rounded-xl border-slate-200 text-sm" />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label>
                                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Asset
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="rounded-xl">Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Asset List */}
            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center"><Package className="h-8 w-8 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-medium">No assets found.</p></CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(asset => (
                        <Card key={asset.asset_id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <Package className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{asset.name}</span>
                                            {asset.asset_tag && <span className="text-[10px] font-bold text-slate-400">{asset.asset_tag}</span>}
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${STATUS_COLOR[asset.status]}`}>{asset.status_display}</Badge>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${CONDITION_COLOR[asset.condition]}`}>{asset.condition_display}</Badge>
                                            <Badge className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600">{asset.category_display}</Badge>
                                            {asset.open_maintenance_count > 0 && <Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700">{asset.open_maintenance_count} open issue{asset.open_maintenance_count > 1 ? 's' : ''}</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {asset.location && `${asset.location} · `}
                                            {asset.brand && `${asset.brand} · `}
                                            {asset.active_assignment && `Assigned to: ${asset.active_assignment.assigned_to_name ?? asset.active_assignment.assigned_to_location}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                        {asset.status === 'available' && (
                                            <Dialog open={assignOpen === asset.asset_id} onOpenChange={o => setAssignOpen(o ? asset.asset_id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                                                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Assign
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[400px]">
                                                    <DialogHeader><DialogTitle>Assign Asset</DialogTitle></DialogHeader>
                                                    <div className="space-y-3 pt-2">
                                                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Assign To (Location / Person)</label>
                                                            <Input value={assignForm.assigned_to_location} onChange={e => setAssignForm(f => ({ ...f, assigned_to_location: e.target.value }))} placeholder="e.g. Lab 3, John Smith" className="rounded-xl border-slate-200 text-sm" /></div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Assign Date</label>
                                                                <Input type="date" value={assignForm.assigned_date} onChange={e => setAssignForm(f => ({ ...f, assigned_date: e.target.value }))} className="rounded-xl border-slate-200 text-sm" required /></div>
                                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Expected Return</label>
                                                                <Input type="date" value={assignForm.expected_return_date} onChange={e => setAssignForm(f => ({ ...f, expected_return_date: e.target.value }))} className="rounded-xl border-slate-200 text-sm" /></div>
                                                        </div>
                                                        <Button onClick={() => handleAssign(asset.asset_id)} disabled={submitting || !assignForm.assigned_date} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Assign
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        {asset.status === 'in_use' && (
                                            <Button size="sm" variant="outline" onClick={() => handleReturn(asset.asset_id)} className="h-8 px-2 rounded-lg text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
                                            </Button>
                                        )}
                                        {asset.status !== 'maintenance' && asset.status !== 'retired' && (
                                            <Dialog open={maintenanceOpen === asset.asset_id} onOpenChange={o => setMaintenanceOpen(o ? asset.asset_id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                                                        <Wrench className="h-3.5 w-3.5 mr-1" /> Issue
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[400px]">
                                                    <DialogHeader><DialogTitle>Log Maintenance Issue</DialogTitle></DialogHeader>
                                                    <div className="space-y-3 pt-2">
                                                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Title</label>
                                                            <Input value={maintForm.title} onChange={e => setMaintForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl border-slate-200 text-sm" required /></div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Priority</label>
                                                                <select value={maintForm.priority} onChange={e => setMaintForm(f => ({ ...f, priority: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                                                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                                                                </select></div>
                                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Est. Cost</label>
                                                                <Input type="number" step="0.01" value={maintForm.estimated_cost} onChange={e => setMaintForm(f => ({ ...f, estimated_cost: e.target.value }))} className="rounded-xl border-slate-200 text-sm" /></div>
                                                        </div>
                                                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                                                            <Textarea value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} rows={2} className="rounded-xl border-slate-200 text-sm resize-none" /></div>
                                                        <Button onClick={() => handleMaintenanceRequest(asset.asset_id)} disabled={submitting || !maintForm.title} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold">
                                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Log Issue
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => openEdit(asset)} className="h-8 px-2 rounded-lg text-xs border-slate-200">Edit</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleDelete(asset.asset_id)} className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
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
