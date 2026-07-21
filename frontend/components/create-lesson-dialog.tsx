// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { academicAPI, AcademicClass } from '@/lib/api';
import { ClipboardList, Loader2 } from 'lucide-react';

interface CreateLessonDialogProps {
    trigger?: React.ReactNode;
}

export function CreateLessonDialog({ trigger }: CreateLessonDialogProps) {
    const [open, setOpen] = useState(false);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            setLoading(true);
            academicAPI.getClasses()
                .then(setClasses)
                .catch(err => console.error("Failed to fetch classes", err))
                .finally(() => setLoading(false));
        }
    };

    const handleCreate = () => {
        if (!selectedClassId) return;
        setCreating(true);
        setOpen(false);
        router.push(`/teacher/classes/${selectedClassId}/lessons/new`);
        setCreating(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                        <ClipboardList className="mr-2 h-4 w-4" /> Create Lesson
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Lesson</DialogTitle>
                    <DialogDescription>
                        Select the class for which you want to create a new lesson plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="class-select" className="text-right">
                            Class
                        </Label>
                        <div className="col-span-3">
                            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loading ? (
                                        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading classes...
                                        </div>
                                    ) : classes.length === 0 ? (
                                        <div className="p-2 text-sm text-center text-muted-foreground">No classes found</div>
                                    ) : (
                                        classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id.toString()}>
                                                {cls.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!selectedClassId || creating || loading}>
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
