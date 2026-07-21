// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicAPI, Student } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface StudentProfileSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    onSuccess?: () => void;
}

export function StudentProfileSettings({ open, onOpenChange, studentId, onSuccess }: StudentProfileSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Student>>({
        learning_style: 'visual',
        daily_study_goal: 30,
        ai_explanation_level: 'normal',
        language_preference: 'en'
    });

    const loadStudentProfile = useCallback(async () => {
        setLoading(true);
        try {
            const student = await academicAPI.getStudent(studentId);
            setFormData({
                learning_style: student.learning_style || 'visual',
                daily_study_goal: student.daily_study_goal || 30,
                ai_explanation_level: student.ai_explanation_level || 'normal',
                language_preference: student.language_preference || 'en'
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (open && studentId) {
            loadStudentProfile();
        }
    }, [open, studentId, loadStudentProfile]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await academicAPI.updateStudent(studentId, formData);
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Personalize Your Learning</DialogTitle>
                    <DialogDescription>
                        Customize how the AI Tutor and dashboard adapt to your needs.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6 py-4">

                            <div className="grid gap-2">
                                <Label>Preferred Learning Style</Label>
                                <Select
                                    value={formData.learning_style}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, learning_style: value as any })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visual">Visual (Video-first)</SelectItem>
                                        <SelectItem value="reading">Reading (Text-first)</SelectItem>
                                        <SelectItem value="practice">Practice (Quiz-first)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    This changes how courses are recommended and displayed.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>AI Explanation Level</Label>
                                <Select
                                    value={formData.ai_explanation_level}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, ai_explanation_level: value as any })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="simple">Simple (ELI5)</SelectItem>
                                        <SelectItem value="normal">Normal (Standard)</SelectItem>
                                        <SelectItem value="exam">Exam-Oriented (Technical)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Changes how the AI Tutor responses to your questions.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Daily Study Goal (Minutes)</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="number"
                                        min="10"
                                        max="300"
                                        value={formData.daily_study_goal}
                                        onChange={(e) => setFormData({ ...formData, daily_study_goal: parseInt(e.target.value) || 0 })}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">minutes per day</span>
                                </div>
                            </div>

                        </div>

                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Preferences
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
