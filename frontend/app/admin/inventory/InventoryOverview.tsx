// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inventoryAPI, InventoryDashboard } from '@/lib/api';
import { Package, Wrench, AlertTriangle, Archive, CheckCircle2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
    electronics: 'Electronics', furniture: 'Furniture', lab_equipment: 'Lab Equipment',
    sports: 'Sports', books: 'Books', vehicles: 'Vehicles', other: 'Other',
};

const STATUS_COLOR: Record<string, string> = {
    available: 'bg-emerald-500', in_use: 'bg-blue-500',
    maintenance: 'bg-amber-500', retired: 'bg-slate-400', lost: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
    available: 'Available', in_use: 'In Use',
    maintenance: 'Maintenance', retired: 'Retired', lost: 'Lost',
};

export function InventoryOverview() {
    const [data, setData] = useState<InventoryDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        inventoryAPI.getDashboard().then(setData).catch(() => null).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
            </div>
        </div>
    );

    const statCards = [
        { icon: <Package className="h-5 w-5 text-indigo-600" />, label: 'Total Assets', value: data?.total_assets ?? 0, color: 'bg-indigo-50' },
        { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, label: 'Available', value: data?.by_status?.find(s => s.status === 'available')?.count ?? 0, color: 'bg-emerald-50' },
        { icon: <Wrench className="h-5 w-5 text-amber-600" />, label: 'Open Maintenance', value: data?.open_maintenance ?? 0, color: 'bg-amber-50' },
        { icon: <AlertTriangle className="h-5 w-5 text-red-600" />, label: 'Low Stock Items', value: data?.low_stock_count ?? 0, color: 'bg-red-50' },
    ];

    const maxCategory = Math.max(1, ...(data?.by_category ?? []).map(c => c.count));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((c, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-5">
                            <div className={`h-10 w-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>{c.icon}</div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.label}</p>
                            <p className="text-2xl font-black text-slate-900">{c.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Status */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-slate-700">Assets by Status</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center gap-6 py-6">
                        {(data?.by_status ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400">No assets yet.</p>
                        ) : (
                            (data?.by_status ?? []).map(item => (
                                <div key={item.status} className="text-center">
                                    <div className={`h-14 w-14 rounded-2xl ${STATUS_COLOR[item.status] ?? 'bg-slate-300'} flex items-center justify-center mx-auto`}>
                                        <span className="text-xl font-black text-white">{item.count}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1.5">{STATUS_LABEL[item.status] ?? item.status}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Assets by Category */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-slate-700">Assets by Category</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(data?.by_category ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No assets yet.</p>
                        ) : (
                            (data?.by_category ?? []).map(item => (
                                <div key={item.category} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                                        <span className="text-slate-800">{item.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Low stock alert */}
            {(data?.low_stock_items ?? []).length > 0 && (
                <Card className="border-red-200 shadow-sm bg-red-50/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <CardTitle className="text-sm font-bold text-red-700">Low Stock Alert</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(data?.low_stock_items ?? []).map(item => (
                                <div key={item.stock_id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-red-100">
                                    <Archive className="h-4 w-4 text-red-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{item.name}</p>
                                        <p className="text-[10px] text-red-500">{Number(item.current_quantity)} {item.unit} left (min: {Number(item.minimum_quantity)})</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
