// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicAPI, usersAPI, Teacher, AcademicClass, User } from '@/lib/api';
import { Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AssignClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AssignClassDialog({ open, onOpenChange, onSuccess }: AssignClassDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);

    // Selection
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            loadData();
            // Reset state
            setSelectedTeacherId('');
            setSelectedClassIds([]);
        }
    }, [open]);

    // When teacher changes, pre-fill their assigned classes
    useEffect(() => {
        if (selectedTeacherId) {
            const teacher = teachers.find(t => t.id === selectedTeacherId);
            if (teacher && teacher.assigned_classes) {
                // If assigned_classes contains IDs
                if (Array.isArray(teacher.assigned_classes)) {
                    const normalized = teacher.assigned_classes
                        .map((value) => (typeof value === 'number' ? value.toString() : (value as any).id?.toString()))
                        .filter(Boolean);
                    setSelectedClassIds(normalized);
                }
            } else {
                setSelectedClassIds([]);
            }
        }
    }, [selectedTeacherId, teachers]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tData, cData, uData] = await Promise.all([
                academicAPI.getTeachers(),
                academicAPI.getClasses(),
                usersAPI.getAccounts()
            ]);
            setTeachers(tData);
            setClasses(cData);
            setUsers(uData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const handleSubmit = async () => {
        if (!selectedTeacherId) return;
        setSubmitting(true);
        try {
            await academicAPI.updateTeacher(selectedTeacherId, {
                assigned_classes: selectedClassIds.map(id => parseInt(id))
            });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const getTeacherName = (t: Teacher) => {
        const user = users.find(u => u.user_id === t.user_id);
        return user ? `${user.first_name} ${user.last_name}` : 'Unknown Teacher';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Classes to Teacher</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Teacher Selection */}
                    <div className="space-y-2">
                        <Label>Select Teacher</Label>
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a teacher..." />
                            </SelectTrigger>
                            <SelectContent>
                                {teachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {getTeacherName(t)} ({t.designation})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Class Selection */}
                    <div className="space-y-2">
                        <Label>Assign Classes</Label>
                        <div className="border rounded-md p-4">
                            <div className="h-[200px] pr-4 overflow-y-auto">
                                {loading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    <div className="space-y-2">
                                        {classes.map((cls) => {
                                            const isSelected = selectedClassIds.includes(cls.id.toString());
                                            return (
                                                <div
                                                    key={cls.id}
                                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}
                                                    onClick={() => toggleClass(cls.id.toString())}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">{cls.name}</Badge>
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {selectedClassIds.length} classes selected
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!selectedTeacherId || submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Assignments
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
