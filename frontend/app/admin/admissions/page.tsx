// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Plus, Search, Trash2, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
    academicAPI,
    AcademicClass,
    AdmissionEnquiry,
    AdmissionEnquirySource,
    AdmissionEnquiryStatus,
    AdmissionPipeline,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type EnquiryForm = {
    first_name: string;
    last_name: string;
    guardian_name: string;
    email: string;
    phone_number: string;
    desired_class: string;
    desired_section_name: string;
    status: AdmissionEnquiryStatus;
    source: AdmissionEnquirySource;
    notes: string;
    follow_up_date: string;
};

type ConvertForm = {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    academic_class: string;
    section: string;
    username: string;
    password: string;
};

const STATUS_OPTIONS: Array<{ value: AdmissionEnquiryStatus; label: string }> = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'interested', label: 'Interested' },
    { value: 'application_started', label: 'Application Started' },
    { value: 'converted', label: 'Converted' },
    { value: 'closed', label: 'Closed' },
];

const SOURCE_OPTIONS: Array<{ value: AdmissionEnquirySource; label: string }> = [
    { value: 'walk_in', label: 'Walk In' },
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'social', label: 'Social Media' },
    { value: 'phone', label: 'Phone' },
    { value: 'other', label: 'Other' },
];

const EMPTY_ENQUIRY_FORM: EnquiryForm = {
    first_name: '',
    last_name: '',
    guardian_name: '',
    email: '',
    phone_number: '',
    desired_class: '',
    desired_section_name: '',
    status: 'new',
    source: 'walk_in',
    notes: '',
    follow_up_date: '',
};

const EMPTY_CONVERT_FORM: ConvertForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    academic_class: '',
    section: '',
    username: '',
    password: 'Student@123',
};

function statusBadgeClass(status: AdmissionEnquiryStatus): string {
    if (status === 'converted') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'new') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'closed') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (status === 'interested') return 'bg-violet-100 text-violet-700 border-violet-200';
    if (status === 'application_started') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
}

function prettyLabel(value: string): string {
    return value
        .split('_')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}

export default function AdmissionsPage() {
    const [enquiries, setEnquiries] = useState<AdmissionEnquiry[]>([]);
    const [pipeline, setPipeline] = useState<AdmissionPipeline | null>(null);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | AdmissionEnquiryStatus>('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | AdmissionEnquirySource>('all');

    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
    const [editorForm, setEditorForm] = useState<EnquiryForm>(EMPTY_ENQUIRY_FORM);
    const [activeEnquiry, setActiveEnquiry] = useState<AdmissionEnquiry | null>(null);

    const [convertOpen, setConvertOpen] = useState(false);
    const [convertForm, setConvertForm] = useState<ConvertForm>(EMPTY_CONVERT_FORM);
    const [convertTarget, setConvertTarget] = useState<AdmissionEnquiry | null>(null);

    const selectedConvertClass = useMemo(
        () => classes.find((cls) => String(cls.id) === String(convertForm.academic_class)),
        [classes, convertForm.academic_class]
    );
    const convertSections = selectedConvertClass?.sections || [];

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadData = useCallback(
        async (isRefresh = false) => {
            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                const [enquiriesData, pipelineData, classesData] = await Promise.all([
                    academicAPI.getAdmissions({
                        status: statusFilter,
                        source: sourceFilter,
                        q: debouncedSearch || undefined,
                    }),
                    academicAPI.getAdmissionsPipeline(),
                    academicAPI.getClasses(),
                ]);

                setEnquiries(enquiriesData);
                setPipeline(pipelineData);
                setClasses(classesData.slice().sort((a, b) => (a.order || 0) - (b.order || 0)));
            } catch (error) {
                console.error('Failed to load admissions data:', error);
                toast.error('Failed to load admissions data.');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [statusFilter, sourceFilter, debouncedSearch]
    );

    useEffect(() => {
        loadData();
    }, [loadData]);

    function openCreateDialog() {
        setEditorMode('create');
        setActiveEnquiry(null);
        setEditorForm(EMPTY_ENQUIRY_FORM);
        setEditorOpen(true);
    }

    function openEditDialog(enquiry: AdmissionEnquiry) {
        setEditorMode('edit');
        setActiveEnquiry(enquiry);
        setEditorForm({
            first_name: enquiry.first_name || '',
            last_name: enquiry.last_name || '',
            guardian_name: enquiry.guardian_name || '',
            email: enquiry.email || '',
            phone_number: enquiry.phone_number || '',
            desired_class: enquiry.desired_class ? String(enquiry.desired_class) : '',
            desired_section_name: enquiry.desired_section_name || '',
            status: enquiry.status,
            source: enquiry.source,
            notes: enquiry.notes || '',
            follow_up_date: enquiry.follow_up_date || '',
        });
        setEditorOpen(true);
    }

    function openConvertDialog(enquiry: AdmissionEnquiry) {
        setConvertTarget(enquiry);
        setConvertForm({
            first_name: enquiry.first_name || '',
            last_name: enquiry.last_name || '',
            email: enquiry.email || '',
            phone_number: enquiry.phone_number || '',
            academic_class: enquiry.desired_class ? String(enquiry.desired_class) : '',
            section: '',
            username: '',
            password: 'Student@123',
        });
        setConvertOpen(true);
    }

    async function handleSaveEnquiry() {
        if (!editorForm.first_name.trim()) {
            toast.error('First name is required.');
            return;
        }
        if (!editorForm.phone_number.trim()) {
            toast.error('Phone number is required.');
            return;
        }

        const payload = {
            first_name: editorForm.first_name.trim(),
            last_name: editorForm.last_name.trim(),
            guardian_name: editorForm.guardian_name.trim(),
            email: editorForm.email.trim() || null,
            phone_number: editorForm.phone_number.trim(),
            desired_class: editorForm.desired_class ? Number(editorForm.desired_class) : null,
            desired_section_name: editorForm.desired_section_name.trim(),
            status: editorForm.status,
            source: editorForm.source,
            notes: editorForm.notes.trim() || null,
            follow_up_date: editorForm.follow_up_date || null,
        };

        try {
            setSaving(true);
            if (editorMode === 'create') {
                await academicAPI.createAdmission(payload);
                toast.success('Admission enquiry created.');
            } else if (activeEnquiry) {
                await academicAPI.updateAdmission(activeEnquiry.enquiry_id, payload);
                toast.success('Admission enquiry updated.');
            }
            setEditorOpen(false);
            await loadData(true);
        } catch (error) {
            console.error('Failed to save enquiry:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save enquiry.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteEnquiry(enquiry: AdmissionEnquiry) {
        if (!confirm(`Delete enquiry for ${enquiry.first_name} ${enquiry.last_name || ''}?`)) return;
        try {
            await academicAPI.deleteAdmission(enquiry.enquiry_id);
            toast.success('Enquiry deleted.');
            await loadData(true);
        } catch (error) {
            console.error('Failed to delete enquiry:', error);
            toast.error('Failed to delete enquiry.');
        }
    }

    async function handleConvertToStudent() {
        if (!convertTarget) return;
        if (!convertForm.email.trim()) {
            toast.error('Email is required for conversion.');
            return;
        }
        if (!convertForm.academic_class) {
            toast.error('Please select class before conversion.');
            return;
        }

        try {
            setConverting(true);
            await academicAPI.convertAdmissionToStudent(convertTarget.enquiry_id, {
                first_name: convertForm.first_name.trim(),
                last_name: convertForm.last_name.trim(),
                email: convertForm.email.trim(),
                phone_number: convertForm.phone_number.trim(),
                academic_class: Number(convertForm.academic_class),
                section: convertForm.section ? Number(convertForm.section) : undefined,
                username: convertForm.username.trim() || undefined,
                password: convertForm.password.trim() || undefined,
            });
            toast.success('Enquiry converted to student successfully.');
            setConvertOpen(false);
            await loadData(true);
        } catch (error) {
            console.error('Failed to convert enquiry:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to convert enquiry.');
        } finally {
            setConverting(false);
        }
    }

    const pipelineCards = [
        { key: 'new', label: 'New', value: pipeline?.new?.count || 0 },
        { key: 'contacted', label: 'Contacted', value: pipeline?.contacted?.count || 0 },
        { key: 'interested', label: 'Interested', value: pipeline?.interested?.count || 0 },
        { key: 'application_started', label: 'Application Started', value: pipeline?.application_started?.count || 0 },
        { key: 'converted', label: 'Converted', value: pipeline?.converted?.count || 0 },
        { key: 'closed', label: 'Closed', value: pipeline?.closed?.count || 0 },
    ];

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admissions Pipeline</h1>
                        <p className="text-slate-500 text-sm">Track enquiries, follow-ups, and convert to student profiles.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
                        {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Refresh
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Enquiry
                    </Button>
                </div>
            </header>

            {/* Step-by-step onboarding guide */}
            <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50">
                <CardContent className="p-5">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">How to admit a new student</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {[
                            { step: '1', title: 'New Enquiry', desc: 'Click "New Enquiry" and fill in the student\'s name, guardian, phone & preferred class.', color: 'bg-blue-500' },
                            { step: '2', title: 'Follow Up', desc: 'Update the status as you progress: Contacted → Interested → Application Started.', color: 'bg-amber-500' },
                            { step: '3', title: 'Convert to Student', desc: 'Click the green person-plus icon (✚) to create the student login account with email & password.', color: 'bg-emerald-500' },
                            { step: '4', title: 'Student Onboarded', desc: 'Status changes to Converted. Student can now log in at /login with their credentials.', color: 'bg-indigo-500' },
                        ].map((s, i, arr) => (
                            <div key={s.step} className="flex items-start gap-3 flex-1">
                                <div className={`h-7 w-7 rounded-full ${s.color} text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5`}>
                                    {s.step}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800">{s.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                                </div>
                                {i < arr.length - 1 && (
                                    <div className="hidden sm:flex items-center self-center text-slate-300 text-lg font-light shrink-0">›</div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                {pipelineCards.map((item) => (
                    <Card key={item.key}>
                        <CardContent className="p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.label}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Enquiries ({pipeline?.total || enquiries.length})</CardTitle>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                                className="pl-9"
                                placeholder="Search by student/guardian/contact..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                {SOURCE_OPTIONS.map((source) => (
                                    <SelectItem key={source.value} value={source.value}>
                                        {source.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student / Guardian</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Desired Class</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Follow-up</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : enquiries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                                        No admissions enquiries found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enquiries.map((enquiry) => (
                                    <TableRow key={enquiry.enquiry_id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {enquiry.first_name} {enquiry.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500">{enquiry.guardian_name || 'No guardian name'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{enquiry.phone_number}</div>
                                            <div className="text-xs text-slate-500">{enquiry.email || 'No email'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{enquiry.desired_class_name || 'Not selected'}</div>
                                            <div className="text-xs text-slate-500">{enquiry.desired_section_name || '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusBadgeClass(enquiry.status)}>{prettyLabel(enquiry.status)}</Badge>
                                        </TableCell>
                                        <TableCell>{prettyLabel(enquiry.source)}</TableCell>
                                        <TableCell>{enquiry.follow_up_date || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(enquiry)}>
                                                    <Pencil className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={enquiry.status === 'converted'}
                                                    onClick={() => openConvertDialog(enquiry)}
                                                >
                                                    <UserRoundPlus className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteEnquiry(enquiry)}>
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>{editorMode === 'create' ? 'Create Admission Enquiry' : 'Edit Admission Enquiry'}</DialogTitle>
                        <DialogDescription>
                            Capture prospective student details and follow-up status.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>First Name</Label>
                                <Input
                                    value={editorForm.first_name}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, first_name: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={editorForm.last_name}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, last_name: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Guardian Name</Label>
                                <Input
                                    value={editorForm.guardian_name}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, guardian_name: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Phone Number</Label>
                                <Input
                                    value={editorForm.phone_number}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={editorForm.email}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Follow-up Date</Label>
                                <Input
                                    type="date"
                                    value={editorForm.follow_up_date}
                                    onChange={(event) => setEditorForm((prev) => ({ ...prev, follow_up_date: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Desired Class</Label>
                                <Select
                                    value={editorForm.desired_class || 'none'}
                                    onValueChange={(value) =>
                                        setEditorForm((prev) => ({ ...prev, desired_class: value === 'none' ? '' : value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not selected</SelectItem>
                                        {classes.map((academicClass) => (
                                            <SelectItem key={academicClass.id} value={String(academicClass.id)}>
                                                {academicClass.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Desired Section</Label>
                                <Input
                                    placeholder="A / B / C"
                                    value={editorForm.desired_section_name}
                                    onChange={(event) =>
                                        setEditorForm((prev) => ({ ...prev, desired_section_name: event.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={editorForm.status}
                                    onValueChange={(value) => setEditorForm((prev) => ({ ...prev, status: value as AdmissionEnquiryStatus }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((statusOption) => (
                                            <SelectItem key={statusOption.value} value={statusOption.value}>
                                                {statusOption.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Source</Label>
                                <Select
                                    value={editorForm.source}
                                    onValueChange={(value) => setEditorForm((prev) => ({ ...prev, source: value as AdmissionEnquirySource }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SOURCE_OPTIONS.map((sourceOption) => (
                                            <SelectItem key={sourceOption.value} value={sourceOption.value}>
                                                {sourceOption.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Notes</Label>
                            <Textarea
                                rows={4}
                                placeholder="Add follow-up notes..."
                                value={editorForm.notes}
                                onChange={(event) => setEditorForm((prev) => ({ ...prev, notes: event.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEnquiry} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editorMode === 'create' ? 'Create Enquiry' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                <DialogContent className="sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle>Convert Enquiry to Student</DialogTitle>
                        <DialogDescription>
                            This will create or link a student account and mark this enquiry as converted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>First Name</Label>
                                <Input
                                    value={convertForm.first_name}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, first_name: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={convertForm.last_name}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, last_name: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={convertForm.email}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Phone Number</Label>
                                <Input
                                    value={convertForm.phone_number}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Class</Label>
                                <Select
                                    value={convertForm.academic_class || 'none'}
                                    onValueChange={(value) =>
                                        setConvertForm((prev) => ({
                                            ...prev,
                                            academic_class: value === 'none' ? '' : value,
                                            section: '',
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select class</SelectItem>
                                        {classes.map((academicClass) => (
                                            <SelectItem key={academicClass.id} value={String(academicClass.id)}>
                                                {academicClass.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Section</Label>
                                <Select
                                    value={convertForm.section || 'none'}
                                    onValueChange={(value) =>
                                        setConvertForm((prev) => ({ ...prev, section: value === 'none' ? '' : value }))
                                    }
                                    disabled={!convertForm.academic_class || convertSections.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Optional section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No section</SelectItem>
                                        {convertSections.map((section) => (
                                            <SelectItem key={section.id} value={String(section.id)}>
                                                {section.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Username (Optional)</Label>
                                <Input
                                    value={convertForm.username}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, username: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Password</Label>
                                <Input
                                    type="text"
                                    value={convertForm.password}
                                    onChange={(event) => setConvertForm((prev) => ({ ...prev, password: event.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={converting}>
                            Cancel
                        </Button>
                        <Button onClick={handleConvertToStudent} disabled={converting}>
                            {converting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Convert to Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
