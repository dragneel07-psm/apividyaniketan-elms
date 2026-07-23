// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, LucideIcon, Plus, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUploadInput } from '@/components/admin/image-upload-input';

interface SiteContentBase {
    id: number;
    order: number;
    is_active: boolean;
}

export interface FieldSchema<T> {
    name: keyof T & string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'image';
    options?: { value: string; label: string }[];
    required?: boolean;
}

interface ContentCrudApi<T> {
    list(): Promise<T[]>;
    create(data: FormData | Partial<T>): Promise<T>;
    update(id: number, data: FormData | Partial<T>): Promise<T>;
    remove(id: number): Promise<void>;
}

interface ContentCrudPageProps<T extends SiteContentBase> {
    title: string;
    description: string;
    icon: LucideIcon;
    api: ContentCrudApi<T>;
    fields: FieldSchema<T>[];
    columns: { key: keyof T & string; label: string }[];
    emptyDefaults: Partial<T>;
    getRowTitle: (item: T) => string;
}

type FormState<T> = Partial<T> & { [key: string]: unknown };

export function ContentCrudPage<T extends SiteContentBase>({
    title,
    description,
    icon: Icon,
    api,
    fields,
    columns,
    emptyDefaults,
    getRowTitle,
}: ContentCrudPageProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [formData, setFormData] = useState<FormState<T>>({ order: 0, is_active: true, ...emptyDefaults });
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        setLoading(true);
        try {
            setItems(await api.list());
        } catch (error) {
            console.error(error);
            toast.error(`Failed to load ${title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openCreate = () => {
        setEditingItem(null);
        setFormData({ order: items.length, is_active: true, ...emptyDefaults });
        setDialogOpen(true);
    };

    const openEdit = (item: T) => {
        setEditingItem(item);
        setFormData({ ...item } as unknown as FormState<T>);
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        const missing = fields.find((f) => f.required && f.type !== 'image' && !formData[f.name]);
        if (missing) {
            toast.error(`Please fill in ${missing.label.toLowerCase()}`);
            return;
        }

        const hasNewImage = fields.some((f) => f.type === 'image' && formData[f.name] instanceof File);
        let payload: FormData | Partial<T>;
        if (hasNewImage) {
            const fd = new FormData();
            for (const [key, value] of Object.entries(formData)) {
                if (value === undefined || value === null) continue;
                if (value instanceof File) {
                    fd.append(key, value);
                } else {
                    fd.append(key, String(value));
                }
            }
            payload = fd;
        } else {
            const { ...rest } = formData;
            for (const f of fields) {
                if (f.type === 'image') delete rest[f.name];
            }
            payload = rest as Partial<T>;
        }

        setSaving(true);
        try {
            if (editingItem) {
                await api.update(editingItem.id, payload);
                toast.success(`${title} updated`);
            } else {
                await api.create(payload);
                toast.success(`${title} created`);
            }
            setDialogOpen(false);
            await loadItems();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to save — please check the form and try again`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: T) => {
        if (!confirm(`Delete "${getRowTitle(item)}"? This cannot be undone.`)) return;
        try {
            await api.remove(item.id);
            toast.success('Deleted');
            loadItems();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete');
        }
    };

    const renderCell = (item: T, key: keyof T & string) => {
        const value = item[key];
        if (typeof value === 'boolean') {
            return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>;
        }
        return <span className="line-clamp-2">{String(value ?? '')}</span>;
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black text-slate-900">
                        <Icon className="h-8 w-8 text-indigo-600" /> {title}
                    </h1>
                    <p className="text-slate-500">{description}</p>
                </div>
                <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4" /> Add {title.replace(/s$/, '')}
                </Button>
            </header>

            <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="border-b bg-white">
                    <CardTitle className="text-lg font-bold">All entries</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                                <TableHead>Order</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>{renderCell(item, col.key)}</TableCell>
                                    ))}
                                    <TableCell className="text-sm text-slate-500">{item.order}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_active ? 'default' : 'outline'}>
                                            {item.is_active ? 'Active' : 'Hidden'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                onClick={() => handleDelete(item)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 3} className="h-32 text-center text-slate-400">
                                        No entries yet — add the first one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? `Edit ${title.replace(/s$/, '')}` : `Add ${title.replace(/s$/, '')}`}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-2">
                        {fields.map((field) => (
                            <div key={field.name} className="grid gap-1.5">
                                <Label htmlFor={field.name}>{field.label}</Label>
                                {field.type === 'textarea' && (
                                    <Textarea
                                        id={field.name}
                                        value={String(formData[field.name] ?? '')}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        className="min-h-[100px]"
                                    />
                                )}
                                {field.type === 'text' && (
                                    <Input
                                        id={field.name}
                                        value={String(formData[field.name] ?? '')}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    />
                                )}
                                {field.type === 'number' && (
                                    <Input
                                        id={field.name}
                                        type="text"
                                        value={String(formData[field.name] ?? '')}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    />
                                )}
                                {field.type === 'date' && (
                                    <Input
                                        id={field.name}
                                        type="date"
                                        value={String(formData[field.name] ?? '')}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    />
                                )}
                                {field.type === 'select' && (
                                    <Select
                                        value={String(formData[field.name] ?? '')}
                                        onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
                                    >
                                        <SelectTrigger id={field.name}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {field.type === 'image' && (
                                    <ImageUploadInput
                                        value={(formData[field.name] as File) ?? null}
                                        existingUrl={(formData[`${field.name}_url`] as string) ?? null}
                                        onChange={(file) => setFormData({ ...formData, [field.name]: file })}
                                    />
                                )}
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="grid gap-1.5">
                                <Label htmlFor="order">Display order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={String(formData.order ?? 0)}
                                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <Switch
                                    id="is_active"
                                    checked={Boolean(formData.is_active)}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label htmlFor="is_active">Visible on site</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingItem ? 'Save changes' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
