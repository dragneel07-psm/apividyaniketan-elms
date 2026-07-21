// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { academicAPI, Subject } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, Upload, Trash } from 'lucide-react';

export default function CourseSettingsPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [course, setCourse] = useState<Subject | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [credits, setCredits] = useState('1.0');
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const loadCourse = async () => {
            try {
                const data = await academicAPI.getSubject(parseInt(courseId));
                setCourse(data);
                setName(data.name);
                setDescription(data.description || '');
                setCredits(data.credits?.toString() || '1.0');
                setIsActive(data.is_active || false);
            } catch (error) {
                console.error("Failed to load course settings", error);
                toast.error("Failed to load course details");
            } finally {
                setLoading(false);
            }
        };
        loadCourse();
    }, [courseId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!course) return;

        try {
            setSaving(true);
            await academicAPI.updateSubject(course.id, {
                name,
                description,
                credits: parseFloat(credits),
                is_active: isActive
            });
            toast.success("Course settings updated");
            router.refresh(); // Refresh to update layout header
        } catch (error) {
            console.error("Failed to update course", error);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;
    }

    return (
        <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Course Settings</h2>
                    <p className="text-slate-500">Manage generic information for this course</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* General Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Basic details shown to students</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Course Title</Label>
                            <Input
                                id="title"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Advanced Physics"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What will students learn in this course?"
                                rows={4}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="credits">Credits</Label>
                                <Input
                                    id="credits"
                                    type="number"
                                    step="0.1"
                                    value={credits}
                                    onChange={(e) => setCredits(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Media */}
                <Card>
                    <CardHeader>
                        <CardTitle>Course Media</CardTitle>
                        <CardDescription>Upload a thumbnail to attract students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer">
                            <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <Upload className="h-6 w-6 text-indigo-600" />
                            </div>
                            <p className="font-medium text-slate-900">Click to upload thumbnail</p>
                            <p className="text-sm text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. 2MB)</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Publishing */}
                <Card className={isActive ? "border-emerald-200 bg-emerald-50/10" : "border-amber-200 bg-amber-50/10"}>
                    <CardHeader>
                        <CardTitle>Publishing Status</CardTitle>
                        <CardDescription>Control visibility of this course</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">
                                    {isActive ? 'Published' : 'Draft Mode'}
                                </Label>
                                <p className="text-sm text-slate-500">
                                    {isActive
                                        ? 'This course is visible to all assigned students.'
                                        : 'Only you can see this course. Students cannot access it.'}
                                </p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-100">
                    <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" type="button" className="w-full sm:w-auto">
                            <Trash className="h-4 w-4 mr-2" /> Delete Course
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
