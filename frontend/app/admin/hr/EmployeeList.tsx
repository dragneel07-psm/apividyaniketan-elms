// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { hrAPI, HREmployee } from '@/lib/api';
import {
    Search, UserPlus, UserCheck, UserX,
    ChevronRight, Building2, Briefcase
} from 'lucide-react';

const CONTRACT_COLORS: Record<string, string> = {
    permanent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    probationary: 'bg-amber-100 text-amber-700 border-amber-200',
    fixed_term: 'bg-blue-100 text-blue-700 border-blue-200',
    part_time: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CONTRACT_LABELS: Record<string, string> = {
    permanent: 'Permanent',
    probationary: 'Probationary',
    fixed_term: 'Fixed-Term',
    part_time: 'Part-Time',
};

export function EmployeeList() {
    const [employees, setEmployees] = useState<HREmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState<boolean | undefined>(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await hrAPI.getEmployees({ is_active: filterActive });
            setEmployees(Array.isArray(data) ? data : []);
        } catch {
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filterActive]);

    const filtered = employees.filter(e =>
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.designation.toLowerCase().includes(search.toLowerCase()) ||
        (e.employee_code || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleActive = async (emp: HREmployee) => {
        setActionLoading(emp.employee_id);
        try {
            if (emp.is_active) {
                await hrAPI.deactivateEmployee(emp.employee_id);
            } else {
                await hrAPI.reactivateEmployee(emp.employee_id);
            }
            await load();
        } catch {
            /* handle silently */
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search employees..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 border-slate-200 rounded-xl"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                        {[true, false, undefined].map((val, i) => (
                            <button
                                key={i}
                                onClick={() => setFilterActive(val)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filterActive === val
                                        ? 'bg-white shadow-sm text-indigo-700'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {val === true ? 'Active' : val === false ? 'Inactive' : 'All'}
                            </button>
                        ))}
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-2">
                        <UserPlus className="h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No employees found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(emp => (
                        <Card
                            key={emp.employee_id}
                            className={`border transition-all hover:shadow-md ${emp.is_active ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50 opacity-70'}`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm flex-shrink-0">
                                        {emp.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900">{emp.full_name}</span>
                                            {emp.employee_code && (
                                                <span className="text-xs text-slate-400 font-mono">#{emp.employee_code}</span>
                                            )}
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${CONTRACT_COLORS[emp.contract_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {CONTRACT_LABELS[emp.contract_type] ?? emp.contract_type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" /> {emp.designation}
                                            </span>
                                            {emp.department_name && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" /> {emp.department_name}
                                                </span>
                                            )}
                                            <span className="text-slate-400">{emp.email}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-slate-400 font-medium">Basic Salary</p>
                                            <p className="text-sm font-black text-slate-800">
                                                {Number(emp.basic_salary).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleActive(emp)}
                                            disabled={actionLoading === emp.employee_id}
                                            className={`h-8 px-3 rounded-lg text-xs font-bold border ${
                                                emp.is_active
                                                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                            }`}
                                        >
                                            {emp.is_active ? (
                                                <><UserX className="h-3.5 w-3.5 mr-1" /> Deactivate</>
                                            ) : (
                                                <><UserCheck className="h-3.5 w-3.5 mr-1" /> Reactivate</>
                                            )}
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-slate-300" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <p className="text-xs text-slate-400 text-right">
                Showing {filtered.length} of {employees.length} employees
            </p>
        </div>
    );
}

// Minimal Users icon fallback used above
function Users({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    );
}
