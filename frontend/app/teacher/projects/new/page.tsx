// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useCreateProject } from '@/services/projects';

export default function NewProjectPage() {
    const router = useRouter();
    const createMut = useCreateProject();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [sectionId, setSectionId] = useState<string>('');
    const [minSize, setMinSize] = useState<string>('');
    const [maxSize, setMaxSize] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');

    const submit = async () => {
        if (!title.trim()) {
            toast({ title: 'Title is required', variant: 'destructive' });
            return;
        }
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                is_group: isGroup,
                section: isGroup ? Number(sectionId) || null : null,
                min_group_size: isGroup && minSize ? Number(minSize) : null,
                max_group_size: isGroup && maxSize ? Number(maxSize) : null,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
            };
            const created = await createMut.mutateAsync(payload);
            toast({ title: 'Project created' });
            router.push(`/teacher/projects/${created.project_id}`);
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({
                title: 'Could not create project',
                description: detail || 'Please review the fields and try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">New project</h1>
                <p className="text-sm text-slate-500">
                    Save and add members + tasks once it&apos;s created.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Solar System Model"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Goals, expectations, deliverables…"
                            rows={4}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="due_date">Due date</Label>
                        <Input
                            id="due_date"
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Project type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                        <div>
                            <p className="text-sm font-medium text-slate-800">Group project</p>
                            <p className="text-xs text-slate-500">
                                Multiple students collaborate; one is designated as leader.
                            </p>
                        </div>
                        <Switch checked={isGroup} onCheckedChange={setIsGroup} />
                    </div>
                    {isGroup && (
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="section">Primary section (optional)</Label>
                                <Input
                                    id="section"
                                    value={sectionId}
                                    onChange={(e) => setSectionId(e.target.value)}
                                    placeholder="Leave blank for cross-class"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="min_size">Min group size</Label>
                                <Input
                                    id="min_size"
                                    type="number"
                                    min={1}
                                    value={minSize}
                                    onChange={(e) => setMinSize(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="max_size">Max group size</Label>
                                <Input
                                    id="max_size"
                                    type="number"
                                    min={1}
                                    value={maxSize}
                                    onChange={(e) => setMaxSize(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button onClick={submit} disabled={createMut.isPending}>
                    {createMut.isPending ? 'Creating…' : 'Create project'}
                </Button>
            </div>
        </div>
    );
}
