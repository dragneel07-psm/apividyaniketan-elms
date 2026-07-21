// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { InventoryOverview } from './InventoryOverview';
import { AssetRegistry } from './AssetRegistry';
import { MaintenanceLog } from './MaintenanceLog';
import { StockManager } from './StockManager';
import { LayoutDashboard, Package, Wrench, Archive } from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'stock', label: 'Consumables', icon: Archive },
] as const;

type TabId = typeof TABS[number]['id'];

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900">Inventory & Asset Management</h1>
                <p className="text-sm text-slate-500 mt-1">Track assets, maintenance requests, and consumable stock</p>
            </div>

            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                            }`}>
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && <InventoryOverview />}
            {activeTab === 'assets' && <AssetRegistry />}
            {activeTab === 'maintenance' && <MaintenanceLog />}
            {activeTab === 'stock' && <StockManager />}
        </div>
    );
}
