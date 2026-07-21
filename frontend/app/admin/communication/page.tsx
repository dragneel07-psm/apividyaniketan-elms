// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    academicAPI, communicationAPI, AcademicClass, Notice,
    NotificationTemplate, BroadcastPayload,
} from '@/lib/api';
import { toast } from 'sonner';
import {
    Send, Users, User, School, Bell, FileText, History,
    LayoutTemplate, Plus, Pencil, Trash2, Eye, CheckCircle2,
    AlertCircle, Info, Megaphone, RefreshCw,
} from 'lucide-react';

const TABS = ['Compose', 'History', 'Templates', 'Notices'] as const;
type Tab = typeof TABS[number];

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-red-100 text-red-700',
};
const PRIORITY_ICONS: Record<string, React.ReactNode> = {
    low: <Info className="h-3 w-3" />,
    normal: <Bell className="h-3 w-3" />,
    high: <AlertCircle className="h-3 w-3" />,
};

// ── Compose Tab ───────────────────────────────────────────────────────────────
function ComposeTab() {
    const [target, setTarget] = useState<'all' | 'role' | 'class'>('all');
    const [role, setRole] = useState('parent');
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [classId, setClassId] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [channels, setChannels] = useState({ app: true, email: false });
    const [preview, setPreview] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        academicAPI.getClasses()
            .then((d) => setClasses(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    const toggleChannel = (ch: keyof typeof channels) =>
        setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

    const audience = target === 'all'
        ? 'All school users'
        : target === 'role'
            ? `All ${role}s`
            : classes.find((c) => String(c.id) === classId)?.name ?? 'Selected class';

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error('Subject and message are required');
            return;
        }
        if (target === 'class' && !classId) {
            toast.error('Please select a class');
            return;
        }

        setSending(true);
        try {
            // Create a notice record (appears in History / Notices board)
            await academicAPI.createNotice({
                title: subject.trim(),
                content: message.trim(),
                category: 'announcement',
                priority,
                target_audience: target === 'class' ? 'class' : 'school',
                target_class: target === 'class' ? Number(classId) : null,
            } as any);

            // Broadcast in-app notifications via the notifications endpoint
            if (channels.app) {
                const payload: BroadcastPayload = {
                    title: subject.trim(),
                    message: message.trim(),
                    target,
                    ...(target === 'role' ? { role } : {}),
                    ...(target === 'class' ? { class_id: classId } : {}),
                };
                const result = await communicationAPI.broadcast(payload);
                toast.success(`Announcement sent to ${result.sent_count} users`);
            } else {
                toast.success('Announcement published');
            }

            setSubject('');
            setMessage('');
            setClassId('');
            setPriority('normal');
            setPreview(false);
        } catch {
            toast.error('Failed to send announcement');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Composer */}
            <div className="lg:col-span-3 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Compose Announcement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Audience */}
                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <RadioGroup value={target} onValueChange={(v: any) => setTarget(v)} className="grid grid-cols-3 gap-2">
                                {([['all', 'All Users', School], ['role', 'By Role', Users], ['class', 'By Class', User]] as const).map(
                                    ([val, label, Icon]) => (
                                        <div key={val} className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${target === val ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                            <RadioGroupItem value={val} id={`t-${val}`} />
                                            <Label htmlFor={`t-${val}`} className="cursor-pointer flex items-center gap-1.5 text-sm">
                                                <Icon className="h-4 w-4" />{label}
                                            </Label>
                                        </div>
                                    )
                                )}
                            </RadioGroup>
                        </div>

                        {target === 'role' && (
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="parent">Parents</SelectItem>
                                        <SelectItem value="student">Students</SelectItem>
                                        <SelectItem value="teacher">Teachers</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {target === 'class' && (
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <Select value={classId} onValueChange={setClassId}>
                                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <div className="flex gap-2">
                                {(['low', 'normal', 'high'] as const).map((p) => (
                                    <button key={p} onClick={() => setPriority(p)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize ${priority === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <Label>Subject / Title</Label>
                            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Announcement subject..." />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message here..." rows={6} />
                            <p className="text-xs text-slate-400">{message.length} characters</p>
                        </div>

                        {/* Channels */}
                        <div className="space-y-2">
                            <Label>Send via</Label>
                            <div className="flex gap-3">
                                {([['app', 'In-App'], ['email', 'Email']] as const).map(([ch, label]) => (
                                    <label key={ch} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${channels[ch] ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                                        <input type="checkbox" className="sr-only" checked={channels[ch]} onChange={() => toggleChannel(ch)} />
                                        <Bell className="h-3.5 w-3.5" /> {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setPreview((p) => !p)}>
                                <Eye className="h-4 w-4 mr-2" /> {preview ? 'Hide' : 'Preview'}
                            </Button>
                            <Button onClick={handleSend} disabled={sending}>
                                <Send className="h-4 w-4 mr-2" />
                                {sending ? 'Sending...' : 'Send Announcement'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Preview / Tips */}
            <div className="lg:col-span-2 space-y-4">
                {preview && subject && (
                    <Card className="border-indigo-200 bg-indigo-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-indigo-700">Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
                                {PRIORITY_ICONS[priority]} {priority}
                            </div>
                            <p className="text-xs text-slate-500">To: {audience}</p>
                            <p className="font-semibold text-sm">{subject}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Broadcast Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-slate-500">
                        <p>• Use <span className="font-medium text-slate-700">All Users</span> for school-wide news.</p>
                        <p>• Use <span className="font-medium text-slate-700">By Role</span> to target parents, teachers, or students.</p>
                        <p>• Use <span className="font-medium text-slate-700">By Class</span> to reach a specific class and their parents.</p>
                        <p>• <span className="font-medium text-red-600">High priority</span> messages appear with a red badge in the app.</p>
                        <p>• In-App channel creates a push notification in the bell icon.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await academicAPI.getNotices();
            setNotices(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load announcement history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'all' ? notices : notices.filter((n: any) => n.category === filter);
    const categories = [...new Set(notices.map((n: any) => n.category).filter(Boolean))];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                        All
                    </button>
                    {categories.map((cat) => (
                        <button key={cat} onClick={() => setFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12 text-slate-400">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No announcements found.</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((n: any) => (
                        <Card key={n.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-sm truncate">{n.title}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[n.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {n.priority}
                                            </span>
                                            {n.category && (
                                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full capitalize">{n.category}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-2">{n.content}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                            <span>Audience: <span className="font-medium text-slate-600 capitalize">{n.target_audience}</span></span>
                                            <span>{new Date(n.published_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
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

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<{ open: boolean; editing: NotificationTemplate | null }>({ open: false, editing: null });
    const [form, setForm] = useState({ name: '', subject_template: '', body_template: '', type: 'app' as 'app' | 'email' | 'sms', is_active: true });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await communicationAPI.getTemplates();
            setTemplates(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load templates'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setForm({ name: '', subject_template: '', body_template: '', type: 'app', is_active: true });
        setDialog({ open: true, editing: null });
    };
    const openEdit = (t: NotificationTemplate) => {
        setForm({ name: t.name, subject_template: t.subject_template, body_template: t.body_template, type: t.type, is_active: t.is_active });
        setDialog({ open: true, editing: t });
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.body_template.trim()) {
            toast.error('Name and body are required');
            return;
        }
        setSaving(true);
        try {
            if (dialog.editing) {
                await communicationAPI.updateTemplate(dialog.editing.id, form);
                toast.success('Template updated');
            } else {
                await communicationAPI.createTemplate(form);
                toast.success('Template created');
            }
            setDialog({ open: false, editing: null });
            load();
        } catch { toast.error('Failed to save template'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this template?')) return;
        try {
            await communicationAPI.deleteTemplate(id);
            toast.success('Template deleted');
            setTemplates((prev) => prev.filter((t) => t.id !== id));
        } catch { toast.error('Failed to delete template'); }
    };

    const TYPE_COLORS: Record<string, string> = {
        app: 'bg-indigo-100 text-indigo-700',
        email: 'bg-emerald-100 text-emerald-700',
        sms: 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={openNew} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> New Template
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12 text-slate-400">Loading...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No templates yet. Create one to get started.</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map((t) => (
                        <Card key={t.id} className={`hover:shadow-sm transition-shadow ${!t.is_active ? 'opacity-60' : ''}`}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-sm">{t.name}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block uppercase ${TYPE_COLORS[t.type]}`}>{t.type}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(t.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                {t.subject_template && (
                                    <p className="text-xs font-medium text-slate-500">Subject: {t.subject_template}</p>
                                )}
                                <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 rounded p-2 font-mono">{t.body_template}</p>
                                <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{dialog.editing ? 'Edit Template' : 'New Template'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Fee Reminder" />
                        </div>
                        <div className="space-y-2">
                            <Label>Channel Type</Label>
                            <Select value={form.type} onValueChange={(v: any) => setForm((f) => ({ ...f, type: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="app">In-App</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="sms">SMS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.type === 'email' && (
                            <div className="space-y-2">
                                <Label>Subject Template</Label>
                                <Input value={form.subject_template} onChange={(e) => setForm((f) => ({ ...f, subject_template: e.target.value }))} placeholder="e.g. Dear {name}, your fee is due" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Body Template</Label>
                            <Textarea value={form.body_template} onChange={(e) => setForm((f) => ({ ...f, body_template: e.target.value }))} rows={5} placeholder="Use {name}, {amount}, {date} etc. as placeholders" />
                            <p className="text-xs text-slate-400">Available variables: {'{name}'}, {'{amount}'}, {'{date}'}, {'{class}'}</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                            Active
                        </label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Notices Board Tab ─────────────────────────────────────────────────────────
function NoticesBoardTab() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Notice | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', category: 'General', priority: 'normal' as 'low' | 'normal' | 'high', target_audience: 'school' as 'school' | 'class' | 'student', expiry_date: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await academicAPI.getNotices();
            setNotices(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load notices'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.title.trim() || !form.content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        setSaving(true);
        try {
            await academicAPI.createNotice({ ...form, expiry_date: form.expiry_date || undefined } as any);
            toast.success('Notice posted');
            setCreating(false);
            setForm({ title: '', content: '', category: 'General', priority: 'normal', target_audience: 'school', expiry_date: '' });
            load();
        } catch { toast.error('Failed to post notice'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this notice?')) return;
        try {
            await academicAPI.deleteNotice(id);
            toast.success('Notice deleted');
            setSelected(null);
            setNotices((prev) => prev.filter((n: any) => n.id !== id));
        } catch { toast.error('Failed to delete notice'); }
    };

    const CATEGORY_COLORS: Record<string, string> = {
        General: 'bg-slate-100 text-slate-600',
        Academic: 'bg-blue-100 text-blue-700',
        Event: 'bg-purple-100 text-purple-700',
        Holiday: 'bg-emerald-100 text-emerald-700',
        announcement: 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notice list */}
            <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{notices.length} notice{notices.length !== 1 ? 's' : ''}</p>
                    <Button size="sm" onClick={() => setCreating(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Post Notice
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12 text-slate-400">Loading...</div>
                ) : notices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No notices posted yet.</div>
                ) : (
                    notices.map((n: any) => (
                        <Card key={n.id}
                            className={`cursor-pointer hover:shadow-sm transition-shadow ${selected?.id === n.id ? 'ring-2 ring-indigo-500' : ''}`}
                            onClick={() => setSelected(n)}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-sm">{n.title}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[n.priority] ?? 'bg-slate-100'}`}>{n.priority}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[n.category] ?? 'bg-slate-100 text-slate-600'}`}>{n.category}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-1">{n.content}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(n.published_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Detail / Create pane */}
            <div>
                {creating ? (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Post New Notice</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs">Title</Label>
                                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Notice title" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Category</Label>
                                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="General / Academic / Event..." />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Priority</Label>
                                <Select value={form.priority} onValueChange={(v: any) => setForm((f) => ({ ...f, priority: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Audience</Label>
                                <Select value={form.target_audience} onValueChange={(v: any) => setForm((f) => ({ ...f, target_audience: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="school">Whole School</SelectItem>
                                        <SelectItem value="class">Specific Class</SelectItem>
                                        <SelectItem value="student">Specific Student</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Expiry Date (optional)</Label>
                                <Input type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Content</Label>
                                <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} placeholder="Notice content..." />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => setCreating(false)}>Cancel</Button>
                                <Button size="sm" className="flex-1" onClick={handleCreate} disabled={saving}>{saving ? 'Posting...' : 'Post'}</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : selected ? (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <CardTitle className="text-sm pr-2">{(selected as any).title}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 shrink-0" onClick={() => handleDelete((selected as any).id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[(selected as any).priority] ?? 'bg-slate-100'}`}>{(selected as any).priority}</span>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full capitalize">{(selected as any).category}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">{(selected as any).target_audience}</span>
                            </div>
                            <p className="text-slate-700 whitespace-pre-wrap">{(selected as any).content}</p>
                            <p className="text-xs text-slate-400">
                                Published: {new Date((selected as any).published_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {(selected as any).expiry_date && (
                                <p className="text-xs text-slate-400">Expires: {new Date((selected as any).expiry_date).toLocaleDateString()}</p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                        <Bell className="h-8 w-8 mb-2 opacity-30" />
                        Select a notice to view details
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunicationDashboard() {
    const [tab, setTab] = useState<Tab>('Compose');

    const TAB_ICONS: Record<Tab, React.ReactNode> = {
        Compose: <Megaphone className="h-4 w-4" />,
        History: <History className="h-4 w-4" />,
        Templates: <LayoutTemplate className="h-4 w-4" />,
        Notices: <FileText className="h-4 w-4" />,
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Communication Center</h2>
                <p className="text-muted-foreground">Send announcements, manage notices, and configure notification templates.</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                {TABS.map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        {TAB_ICONS[t]} {t}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'Compose' && <ComposeTab />}
            {tab === 'History' && <HistoryTab />}
            {tab === 'Templates' && <TemplatesTab />}
            {tab === 'Notices' && <NoticesBoardTab />}
        </div>
    );
}
