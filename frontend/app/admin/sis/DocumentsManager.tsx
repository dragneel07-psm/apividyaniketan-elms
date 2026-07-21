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
import { sisAPI, StudentDocument } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    FileText, Plus, X, Eye, Search, Loader2, CheckCircle2,
} from 'lucide-react';

const DOC_TYPES = [
    { value: 'transfer_certificate', label: 'Transfer Certificate' },
    { value: 'character_certificate', label: 'Character Certificate' },
    { value: 'bonafide_certificate', label: 'Bonafide Certificate' },
    { value: 'fee_receipt_summary', label: 'Fee Receipt Summary' },
    { value: 'custom', label: 'Custom Document' },
];

const DOC_TYPE_COLOR: Record<string, string> = {
    transfer_certificate: 'bg-violet-100 text-violet-700',
    character_certificate: 'bg-blue-100 text-blue-700',
    bonafide_certificate: 'bg-emerald-100 text-emerald-700',
    fee_receipt_summary: 'bg-amber-100 text-amber-700',
    custom: 'bg-slate-100 text-slate-600',
};

export function DocumentsManager() {
    const [documents, setDocuments] = useState<StudentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [issueOpen, setIssueOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        student: '', document_type: 'transfer_certificate',
        issued_date: '', reason: '', remarks: '',
        marks_as_transferred: false,
    });
    const { toast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const data = await sisAPI.getDocuments(typeFilter ? { document_type: typeFilter } : undefined);
            setDocuments(Array.isArray(data) ? data : []);
        } catch { setDocuments([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [typeFilter]);

    const filtered = documents.filter(d =>
        d.student_name.toLowerCase().includes(search.toLowerCase()) ||
        d.document_number.toLowerCase().includes(search.toLowerCase())
    );

    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await sisAPI.issueDocument(form as any);
            toast({ title: 'Document issued successfully.' });
            setIssueOpen(false);
            setForm({ student: '', document_type: 'transfer_certificate', issued_date: '', reason: '', remarks: '', marks_as_transferred: false });
            await load();
        } catch { toast({ title: 'Error', description: 'Failed to issue document.', variant: 'destructive' }); }
        finally { setSubmitting(false); }
    };

    const handlePreview = async (id: string) => {
        setPreviewLoading(true);
        try {
            const data = await sisAPI.previewDocument(id);
            setPreviewDoc(data);
        } catch { toast({ title: 'Error', description: 'Failed to load preview.', variant: 'destructive' }); }
        finally { setPreviewLoading(false); }
    };

    const handleCancel = async (id: string) => {
        setSubmitting(true);
        try {
            await sisAPI.cancelDocument(id, cancelReason);
            toast({ title: 'Document cancelled.' });
            setCancelId(null);
            setCancelReason('');
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
                        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 border-slate-200 rounded-xl w-48 text-sm" />
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-wrap">
                        {[{ value: '', label: 'All' }, ...DOC_TYPES].map(t => (
                            <button key={t.value} onClick={() => setTypeFilter(t.value)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${typeFilter === t.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 gap-2">
                            <Plus className="h-4 w-4" /> Issue Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader><DialogTitle className="font-black">Issue New Document</DialogTitle></DialogHeader>
                        <form onSubmit={handleIssue} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student ID</label>
                                <Input value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
                                    placeholder="Student UUID..." className="rounded-xl border-slate-200 text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Document Type</label>
                                    <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                                        {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Issue Date</label>
                                    <Input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                                        className="rounded-xl border-slate-200 text-sm" required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reason / Purpose</label>
                                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                    rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (optional)</label>
                                <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                                    rows={2} className="rounded-xl border-slate-200 text-sm resize-none" />
                            </div>
                            {form.document_type === 'transfer_certificate' && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.marks_as_transferred}
                                        onChange={e => setForm(f => ({ ...f, marks_as_transferred: e.target.checked }))}
                                        className="rounded" />
                                    <span className="text-sm text-slate-700 font-medium">Mark student as transferred</span>
                                </label>
                            )}
                            <div className="flex gap-3 pt-1">
                                <Button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Issue Document
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIssueOpen(false)} className="rounded-xl">Cancel</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Preview dialog */}
            <Dialog open={!!previewDoc} onOpenChange={o => !o && setPreviewDoc(null)}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-black">Document Preview</DialogTitle></DialogHeader>
                    {previewDoc && (
                        <div className="space-y-4 pt-2">
                            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
                                <div className="text-center border-b border-slate-200 pb-4">
                                    <p className="font-black text-lg text-slate-900">{previewDoc.school_name ?? 'School Name'}</p>
                                    <p className="text-xs text-slate-500 mt-1">{previewDoc.document_type_display}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">No. {previewDoc.document_number}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    {Object.entries(previewDoc).filter(([k]) => !['school_name', 'document_type_display', 'document_number'].includes(k)).map(([key, value]) => (
                                        <div key={key}>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
                                            <p className="text-slate-700 font-medium text-xs">{String(value) || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">This is a preview. Print or export functionality can be added.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {loading ? (
                <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-14 text-center">
                        <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No documents found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(doc => (
                        <Card key={doc.document_id} className={`border-slate-200 shadow-sm ${doc.is_cancelled ? 'opacity-60' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-900 text-sm">{doc.student_name}</span>
                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${DOC_TYPE_COLOR[doc.document_type] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {doc.document_type_display}
                                            </Badge>
                                            {doc.is_cancelled && <Badge className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-600">Cancelled</Badge>}
                                            {doc.marks_as_transferred && <Badge className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700">Transferred</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {doc.document_number} · Issued {doc.issued_date}
                                            {doc.issued_by_name && ` · by ${doc.issued_by_name}`}
                                        </p>
                                        {doc.reason && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{doc.reason}</p>}
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => handlePreview(doc.document_id)}
                                            disabled={previewLoading}
                                            className="h-8 px-2 rounded-lg text-xs border-slate-200 text-slate-600 hover:bg-slate-50">
                                            {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                        </Button>
                                        {!doc.is_cancelled && (
                                            <Dialog open={cancelId === doc.document_id} onOpenChange={o => setCancelId(o ? doc.document_id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50">
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[380px]">
                                                    <DialogHeader><DialogTitle>Cancel Document</DialogTitle></DialogHeader>
                                                    <div className="space-y-3 pt-2">
                                                        <p className="text-sm text-slate-600">This will mark the document as cancelled. This action cannot be undone.</p>
                                                        <Textarea placeholder="Reason for cancellation..."
                                                            value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                                                            rows={3} className="rounded-xl border-slate-200 text-sm resize-none" />
                                                        <Button onClick={() => handleCancel(doc.document_id)} disabled={submitting}
                                                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
                                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                            Confirm Cancellation
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        {doc.is_cancelled && (
                                            <CheckCircle2 className="h-5 w-5 text-slate-300 mt-1.5" />
                                        )}
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
