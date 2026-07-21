// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { academicAPI, Assessment, AcademicClass, Subject } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Calendar, Clock, FileText, CheckCircle2, Loader2, Search, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AssessmentManager() {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
    const [publishTarget, setPublishTarget] = useState<Assessment | null>(null);
    const [publishRequestedState, setPublishRequestedState] = useState<boolean>(true);
    const [publishAutoUpgrade, setPublishAutoUpgrade] = useState<boolean>(true);
    const [publishMinScore, setPublishMinScore] = useState<string>('');
    const [publishMinAttendance, setPublishMinAttendance] = useState<string>('');
    const [publishManualPromoteInput, setPublishManualPromoteInput] = useState<string>('');
    const [publishManualHoldInput, setPublishManualHoldInput] = useState<string>('');
    const [publishing, setPublishing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Assessment>>({
        title: '',
        description: '',
        type: 'quiz',
        total_marks: 100,
        passing_marks: 40,
        duration_minutes: 60,
        blooms_level: 'remember',
        scheduled_at: '',
        subject: '',
        is_final_assessment: false,
    });

    const [selectedClassId, setSelectedClassId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assessmentsData, classesData, subjectsData] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getClasses(),
                academicAPI.getSubjects()
            ]);
            setAssessments(assessmentsData);
            setClasses(classesData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    const handleClassChange = (classId: string) => {
        setSelectedClassId(classId);
        // Reset subject when class changes
        setFormData(prev => ({ ...prev, subject: '' }));
    };

    // Filter subjects based on selected class
    const filteredSubjects = selectedClassId
        ? subjects.filter(s => s.academic_class.toString() === selectedClassId)
        : [];

    const handleOpenCreate = () => {
        setEditingAssessment(null);
        setSelectedClassId('');
        setFormData({
            title: '',
            description: '',
            type: 'quiz',
            total_marks: 100,
            passing_marks: 40,
            duration_minutes: 60,
            blooms_level: 'remember',
            scheduled_at: '',
            subject: '',
            is_final_assessment: false,
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (assessment: Assessment) => {
        setEditingAssessment(assessment);

        // Find class for this assessment's subject
        const subject = subjects.find(s => s.id.toString() === assessment.subject.toString());
        if (subject) {
            setSelectedClassId(subject.academic_class.toString());
        }

        setFormData({
            ...assessment,
            scheduled_at: assessment.scheduled_at ? new Date(assessment.scheduled_at).toISOString().slice(0, 16) : ''
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.subject || !formData.total_marks) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            const payload = {
                ...formData,
                due_date: formData.scheduled_at, // Ideally specific due date
                is_final_assessment: Boolean(formData.is_final_assessment),
            };

            if (editingAssessment?.id) {
                await academicAPI.updateAssessment(editingAssessment.id, payload);
                toast.success('Assessment updated successfully');
            } else {
                await academicAPI.createAssessment(payload);
                toast.success('Assessment created successfully');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save assessment');
        }
    };

    const openPublishDialog = (assessment: Assessment, publish: boolean) => {
        setPublishTarget(assessment);
        setPublishRequestedState(publish);
        setPublishAutoUpgrade(publish && Boolean(assessment.is_final_assessment));
        setPublishMinScore('');
        setPublishMinAttendance('');
        setPublishManualPromoteInput('');
        setPublishManualHoldInput('');
        setIsPublishDialogOpen(true);
    };

    const handlePublishSubmit = async () => {
        if (!publishTarget?.id) return;

        const scoreThreshold = publishMinScore.trim() === '' ? undefined : Number(publishMinScore);
        const attendanceThreshold = publishMinAttendance.trim() === '' ? undefined : Number(publishMinAttendance);
        if (scoreThreshold !== undefined && (Number.isNaN(scoreThreshold) || scoreThreshold < 0 || scoreThreshold > 100)) {
            toast.error('Min score percentage must be between 0 and 100');
            return;
        }
        if (attendanceThreshold !== undefined && (Number.isNaN(attendanceThreshold) || attendanceThreshold < 0 || attendanceThreshold > 100)) {
            toast.error('Min attendance percentage must be between 0 and 100');
            return;
        }

        const parseStudentIds = (raw: string) =>
            raw
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

        try {
            setPublishing(true);
            const response = await academicAPI.publishAssessmentResults(publishTarget.id, {
                publish: publishRequestedState,
                auto_upgrade_students: publishAutoUpgrade,
                promotion_rules: {
                    min_score_percentage: scoreThreshold,
                    min_attendance_percentage: attendanceThreshold,
                    manual_promote_student_ids: parseStudentIds(publishManualPromoteInput),
                    manual_hold_student_ids: parseStudentIds(publishManualHoldInput),
                },
            });
            if (publishRequestedState) {
                const promoted = response.student_promotion?.promoted_students ?? 0;
                if (response.is_final_assessment && publishAutoUpgrade) {
                    const held = response.student_promotion?.manual_held ?? 0;
                    const failedScore = response.student_promotion?.failed_score ?? 0;
                    const failedAttendance = response.student_promotion?.failed_attendance ?? 0;
                    toast.success(
                        `Results published. Promoted: ${promoted}, Held: ${held}, Failed(score): ${failedScore}, Failed(attendance): ${failedAttendance}`,
                    );
                } else {
                    toast.success('Results published successfully');
                }
            } else {
                toast.success('Results marked as unpublished');
            }
            setIsPublishDialogOpen(false);
            setPublishTarget(null);
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update result publish status');
        } finally {
            setPublishing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assessment?')) return;

        try {
            await academicAPI.deleteAssessment(id);
            toast.success('Assessment deleted');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete assessment');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'exam': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'quiz': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'assignment': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-indigo-600" /> Assessment Manager
                    </h1>
                    <p className="text-slate-500">Create and manage exams, quizzes, and assignments.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/academic/promotion-exceptions">
                        <Button variant="outline" className="gap-2">
                            <ShieldAlert className="h-4 w-4" /> Promotion Exceptions
                        </Button>
                    </Link>
                    <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 gap-2">
                        <Plus className="h-4 w-4" /> Create Assessment
                    </Button>
                </div>
            </header>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">All Assessments</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search assessments..." className="pl-9 bg-slate-50 border-slate-200" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Title & Type</TableHead>
                                <TableHead>Subject & Class</TableHead>
                                <TableHead>Marks</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Final</TableHead>
                                <TableHead>Results</TableHead>
                                <TableHead>Blooms Level</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assessments.map((assessment) => {
                                const subject = subjects.find(s => s.id.toString() === assessment.subject.toString());
                                const academicClass = subject ? classes.find(c => c.id === subject.academic_class) : null;

                                return (
                                    <TableRow key={assessment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="font-bold text-slate-900">{assessment.title}</div>
                                            <Badge variant="outline" className={`${getTypeColor(assessment.type)} capitalize border-transparent mt-1`}>
                                                {assessment.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{subject?.name || 'Unknown Subject'}</div>
                                            <div className="text-xs text-slate-500">{academicClass?.name || 'Unknown Class'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{assessment.total_marks} Marks</div>
                                            <div className="text-xs text-slate-500">Pass: {assessment.passing_marks}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {assessment.scheduled_at ? format(new Date(assessment.scheduled_at), 'MMM d, yyyy') : 'Unscheduled'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                                <Clock className="h-3 w-3" />
                                                {assessment.duration_minutes} mins
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {assessment.is_final_assessment ? (
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Final</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">No</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {assessment.results_published ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Published</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Draft</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-600 hover:bg-slate-200">
                                                {assessment.blooms_level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs text-slate-500 hover:text-indigo-600"
                                                    onClick={() => openPublishDialog(assessment, !Boolean(assessment.results_published))}
                                                >
                                                    {assessment.results_published ? 'Unpublish' : 'Publish'}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleOpenEdit(assessment)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => assessment.id && handleDelete(assessment.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {assessments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 font-medium">
                                        No assessments found. Create one to get started!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Academic Class</Label>
                                <Select value={selectedClassId} onValueChange={handleClassChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Subject</Label>
                                <Select
                                    value={formData.subject?.toString()}
                                    onValueChange={v => setFormData({ ...formData, subject: v })}
                                    disabled={!selectedClassId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSubjects.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Title</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Mid-Term Mathematics Exam"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: Assessment['type']) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="quiz">Quiz</SelectItem>
                                        <SelectItem value="exam">Exam</SelectItem>
                                        <SelectItem value="assignment">Assignment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Total Marks</Label>
                                <Input
                                    type="number"
                                    value={formData.total_marks}
                                    onChange={e => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Passing Marks</Label>
                                <Input
                                    type="number"
                                    value={formData.passing_marks}
                                    onChange={e => setFormData({ ...formData, passing_marks: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Scheduled Date</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.scheduled_at}
                                    onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Duration (mins)</Label>
                                <Input
                                    type="number"
                                    value={formData.duration_minutes}
                                    onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Blooms Level</Label>
                                <Select value={formData.blooms_level} onValueChange={v => setFormData({ ...formData, blooms_level: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="remember">Remember</SelectItem>
                                        <SelectItem value="understand">Understand</SelectItem>
                                        <SelectItem value="apply">Apply</SelectItem>
                                        <SelectItem value="analyze">Analyze</SelectItem>
                                        <SelectItem value="evaluate">Evaluate</SelectItem>
                                        <SelectItem value="create">Create</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Final Assessment</p>
                                <p className="text-xs text-slate-500">Final assessments can auto-upgrade students when results are published.</p>
                            </div>
                            <Switch
                                checked={Boolean(formData.is_final_assessment)}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_final_assessment: checked })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Description</Label>
                            <Textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Instructions for students..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <CheckCircle2 className="h-4 w-4" /> {editingAssessment ? 'Update Assessment' : 'Create Assessment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {publishRequestedState ? 'Publish Results' : 'Unpublish Results'}
                        </DialogTitle>
                        <DialogDescription>
                            {publishRequestedState
                                ? 'Publishing results makes assessment outcomes visible and can trigger class upgrades for final assessments.'
                                : 'Unpublishing will hide the published result status for this assessment.'}
                        </DialogDescription>
                    </DialogHeader>
                    {publishRequestedState && publishTarget?.is_final_assessment ? (
                        <div className="grid gap-3 rounded-md border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Auto-upgrade students</p>
                                    <p className="text-xs text-slate-500">
                                        Promote students of this assessment scope to the next class after publish.
                                    </p>
                                </div>
                                <Switch checked={publishAutoUpgrade} onCheckedChange={setPublishAutoUpgrade} />
                            </div>

                            {publishAutoUpgrade ? (
                                <div className="grid gap-3 rounded-md bg-slate-50 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Promotion Rules</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="publish_min_score">Min final score %</Label>
                                            <Input
                                                id="publish_min_score"
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="e.g. 40"
                                                value={publishMinScore}
                                                onChange={(event) => setPublishMinScore(event.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="publish_min_attendance">Min attendance %</Label>
                                            <Input
                                                id="publish_min_attendance"
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="e.g. 75"
                                                value={publishMinAttendance}
                                                onChange={(event) => setPublishMinAttendance(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="publish_manual_promote">Manual promote student IDs (comma-separated)</Label>
                                        <Input
                                            id="publish_manual_promote"
                                            placeholder="uuid-1, uuid-2"
                                            value={publishManualPromoteInput}
                                            onChange={(event) => setPublishManualPromoteInput(event.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="publish_manual_hold">Manual hold student IDs (comma-separated)</Label>
                                        <Input
                                            id="publish_manual_hold"
                                            placeholder="uuid-3, uuid-4"
                                            value={publishManualHoldInput}
                                            onChange={(event) => setPublishManualHoldInput(event.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsPublishDialogOpen(false);
                                setPublishTarget(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handlePublishSubmit} disabled={publishing}>
                            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {publishRequestedState ? 'Publish Results' : 'Unpublish Results'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
