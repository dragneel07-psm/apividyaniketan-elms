// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/api'; // Using generic apiRequest as billingAPI/academicAPI might not cover this
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Save, X, Mail, MessageSquare, Bell } from 'lucide-react';

interface NotificationTemplate {
    id: number;
    name: string;
    subject_template: string;
    body_template: string;
    type: 'email' | 'sms' | 'app';
    is_active: boolean;
}

export default function NotificationTemplates() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<NotificationTemplate>>({
        name: '',
        subject_template: '',
        body_template: '',
        type: 'email',
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await apiRequest<NotificationTemplate[]>('/notifications/templates/');
            setTemplates(data);
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (template?: NotificationTemplate) => {
        if (template) {
            setEditingId(template.id);
            setFormData({ ...template });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                subject_template: '',
                body_template: '',
                type: 'email',
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.body_template) {
            toast.error('Name and Body are required');
            return;
        }

        try {
            if (editingId) {
                await apiRequest(`/notifications/templates/${editingId}/`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                toast.success('Template updated');
            } else {
                await apiRequest('/notifications/templates/', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast.success('Template created');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('Failed to save template');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await apiRequest(`/notifications/templates/${id}/`, { method: 'DELETE' });
            toast.success('Template deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
            case 'sms': return <MessageSquare className="h-4 w-4 text-green-500" />;
            default: return <Bell className="h-4 w-4 text-amber-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Notification Templates</h2>
                    <p className="text-muted-foreground">Manage automated message formats.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Template
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Subject / Content Preview</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : templates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No templates found. Create one properly communicate!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                templates.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(template.type)}
                                                <span className="capitalize">{template.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{template.name}</TableCell>
                                        <TableCell>
                                            <div className="max-w-md truncate">
                                                {template.type === 'email' ? (
                                                    <span className="font-semibold text-xs text-slate-500 block mb-1">
                                                        Sub: {template.subject_template}
                                                    </span>
                                                ) : null}
                                                <span className="text-slate-600">{template.body_template}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                                ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {template.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(template)}>
                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Template' : 'New Template'}</DialogTitle>
                        <DialogDescription>Define the message structure. Use {'{variable}'} for dynamic content.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Template Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Fee Due Reminder"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type">Channel Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val: 'email' | 'sms' | 'app') => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="sms">SMS</SelectItem>
                                    <SelectItem value="app">In-App Notification</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'email' && (
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Email Subject</Label>
                                <Input
                                    id="subject"
                                    value={formData.subject_template}
                                    onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                                    placeholder="e.g. Important: Fees Due for {student_name}"
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="body">Message Body</Label>
                            <Textarea
                                id="body"
                                value={formData.body_template}
                                onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                                placeholder="Dear {parent_name}, please pay {amount} by {due_date}."
                                rows={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Supported variables: {'{student_name}, {parent_name}, {amount}, {due_date}'}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>
                            <Save className="mr-2 h-4 w-4" /> Save Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
