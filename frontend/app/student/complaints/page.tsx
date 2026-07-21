// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    MessageSquareWarning, PlusCircle, Loader2,
    CheckCircle2, Clock, AlertCircle, Ban,
} from 'lucide-react';
import { complaintAPI, Complaint } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

const STATUS_BADGE: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500',
};

const PRIORITY_BADGE: Record<string, string> = {
    low: 'bg-slate-100 text-slate-500',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
};

const CATEGORIES = [
    { value: 'academic', label: 'Academic' },
    { value: 'facility', label: 'Facility' },
    { value: 'staff', label: 'Staff Conduct' },
    { value: 'billing', label: 'Billing' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' },
];

export default function StudentComplaintsPage() {
    const { t, locale } = useTranslation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [anonymous, setAnonymous] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const data = await complaintAPI.getComplaints();
            setComplaints(Array.isArray(data) ? data : []);
        } catch {
            toast.error(t('student.complaints.errorLoad'));
        } finally {
            setLoading(false);
        }
    };

    const openDialog = () => {
        setCategory(''); setTitle(''); setDescription('');
        setPriority('medium'); setAnonymous(false);
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!category || !title.trim() || !description.trim()) {
            toast.error(t('student.complaints.errorRequiredFields'));
            return;
        }
        setSubmitting(true);
        try {
            await complaintAPI.submitComplaint({ category, title, description, priority, anonymous });
            toast.success(t('student.complaints.successSubmitted'));
            setDialogOpen(false);
            loadComplaints();
        } catch {
            toast.error(t('student.complaints.errorSubmit'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <MessageSquareWarning className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">{t('student.nav.studentPortal')}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('student.complaints.pageTitle')}</h1>
                    <p className="text-slate-500 font-medium">{t('student.complaints.subtitle')}</p>
                </div>
                <Button onClick={openDialog} className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0">
                    <PlusCircle className="h-4 w-4" /> {t('student.complaints.reportIssue')}
                </Button>
            </div>

            {/* List */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <MessageSquareWarning className="h-4 w-4 text-indigo-500" /> {t('student.complaints.submittedComplaints')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                        </div>
                    ) : complaints.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">{t('student.complaints.noComplaints')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {complaints.map(c => (
                                <div key={c.complaint_id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-wrap items-start gap-2 mb-2">
                                        <span className="font-bold text-slate-900 flex-1">{c.title}</span>
                                        <Badge className={`text-xs font-bold ${PRIORITY_BADGE[c.priority]}`}>
                                            {c.priority.charAt(0).toUpperCase() + c.priority.slice(1)}
                                        </Badge>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[c.status]}`}>
                                            {c.status === 'open' && <AlertCircle className="h-3 w-3" />}
                                            {c.status === 'in_progress' && <Clock className="h-3 w-3" />}
                                            {c.status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
                                            {c.status === 'closed' && <Ban className="h-3 w-3" />}
                                            {c.status.replace('_', ' ').charAt(0).toUpperCase() + c.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                                        <Badge variant="outline" className="capitalize text-xs">{c.category}</Badge>
                                        <span>{formatDate(new Date(c.created_at), locale)}</span>
                                        {c.resolution_note && (
                                            <span className="text-emerald-600 font-semibold">{t('student.complaints.resolution')}: {c.resolution_note}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black text-slate-900">
                            <MessageSquareWarning className="h-5 w-5 text-indigo-600" /> {t('student.complaints.dialogTitle')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="font-bold">{t('student.complaints.labelCategory')} <span className="text-red-500">*</span></Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-bold">{t('student.complaints.labelPriority')}</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('student.complaints.priorityLow')}</SelectItem>
                                        <SelectItem value="medium">{t('student.complaints.priorityMedium')}</SelectItem>
                                        <SelectItem value="high">{t('student.complaints.priorityHigh')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">{t('student.complaints.labelTitle')} <span className="text-red-500">*</span></Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('student.complaints.placeholderTitle')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">{t('student.complaints.labelDescription')} <span className="text-red-500">*</span></Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('student.complaints.placeholderDescription')} rows={4} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-sm font-bold text-slate-700">{t('student.complaints.anonymousLabel')}</p>
                                <p className="text-xs text-slate-400">{t('student.complaints.anonymousHint')}</p>
                            </div>
                            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            {submitting ? t('student.complaints.submitting') : t('student.complaints.submit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
