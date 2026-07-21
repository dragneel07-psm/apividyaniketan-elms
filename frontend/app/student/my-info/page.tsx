// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building2, Bus, MapPin, Phone, User, DoorOpen,
    BedDouble, Loader2, Info, Calendar, DollarSign,
} from 'lucide-react';
import { hostelAPI, transportAPI, HostelAllotment, TransportAssignment } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatCurrency } from '@/lib/i18n/format';

export default function StudentMyInfoPage() {
    const { t, locale } = useTranslation();
    const [allotment, setAllotment] = useState<HostelAllotment | null | 'none'>('none');
    const [transport, setTransport] = useState<TransportAssignment | null | 'none'>('none');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [allotments, assignments] = await Promise.all([
                    hostelAPI.getAllotments({ is_active: true }),
                    transportAPI.getAssignments({ is_active: true }),
                ]);
                // API returns my own allotment/assignment since backend filters by student
                setAllotment(allotments.length > 0 ? allotments[0] : null);
                setTransport(assignments.length > 0 ? assignments[0] : null);
            } catch {
                toast.error(t('student.myInfo.loadingError'));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <Info className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.myInfo.sectionLabel')}</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.myInfo.pageTitle')}</h1>
                <p className="text-slate-500 font-medium">{t('student.myInfo.subtitle')}</p>
            </div>

            {/* Hostel Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black text-slate-900">{t('student.myInfo.hostelTitle')}</CardTitle>
                        <p className="text-sm text-slate-500">{t('student.myInfo.hostelSubtitle')}</p>
                    </div>
                </CardHeader>
                <CardContent>
                    {allotment === null ? (
                        <div className="py-8 text-center text-slate-400">
                            <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No hostel allotment found.</p>
                            <p className="text-sm mt-1">Contact administration if you expected one.</p>
                        </div>
                    ) : typeof allotment === 'object' && allotment ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InfoRow icon={<Building2 className="h-4 w-4 text-emerald-500" />} label="Block" value={(allotment as any).block_name || '—'} />
                            <InfoRow icon={<DoorOpen className="h-4 w-4 text-emerald-500" />} label="Room" value={(allotment as any).room_number || allotment.room} />
                            <InfoRow icon={<Calendar className="h-4 w-4 text-emerald-500" />} label="Check-in Date" value={allotment.check_in_date} />
                            <InfoRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Check-out Date" value={allotment.check_out_date || 'Current resident'} />
                            {allotment.remarks && (
                                <div className="sm:col-span-2">
                                    <InfoRow icon={<Info className="h-4 w-4 text-slate-400" />} label="Remarks" value={allotment.remarks} />
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <Badge className="bg-emerald-100 text-emerald-700 font-bold">Active</Badge>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Transport Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <Bus className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black text-slate-900">Transport Assignment</CardTitle>
                        <p className="text-sm text-slate-500">Your bus route and pickup details</p>
                    </div>
                </CardHeader>
                <CardContent>
                    {transport === null ? (
                        <div className="py-8 text-center text-slate-400">
                            <Bus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No transport assignment found.</p>
                            <p className="text-sm mt-1">Contact administration if you expected one.</p>
                        </div>
                    ) : typeof transport === 'object' && transport ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InfoRow icon={<Bus className="h-4 w-4 text-sky-500" />} label="Route" value={(transport as any).route_name || transport.route} />
                            <InfoRow icon={<MapPin className="h-4 w-4 text-sky-500" />} label="Pickup Stop" value={transport.pickup_stop || '—'} />
                            <InfoRow icon={<Calendar className="h-4 w-4 text-sky-500" />} label="Active From" value={transport.active_from} />
                            <InfoRow icon={<DollarSign className="h-4 w-4 text-sky-500" />} label="Monthly Fee" value={transport.monthly_fee ? `NPR ${Number(transport.monthly_fee).toLocaleString()}` : '—'} />
                            <div className="sm:col-span-2">
                                <Badge className="bg-sky-100 text-sky-700 font-bold">Active</Badge>
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
        </div>
    );
}
