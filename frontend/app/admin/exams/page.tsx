// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ClipboardList, Users, Calendar, Plus,
    Printer, Loader2, Search, Trash2,
    Settings2, MapPin, Info
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { academicAPI, reportsAPI, downloadReport, Exam, Assessment, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';

export default function ExamManagementPage() {
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [downloadingTickets, setDownloadingTickets] = useState<string | null>(null);

    // Create Form State
    const [formData, setFormData] = useState({
        assessment: '',
        hall_ticket_prefix: 'EXAM',
        exam_center: '',
        seating_capacity: 30,
        instructions: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [examsData, assessmentsData, classesData] = await Promise.all([
                academicAPI.getExams(),
                academicAPI.getAssessments(),
                academicAPI.getClasses()
            ]);

            setExams(examsData);
            // Only show 'exam' type assessments that aren't already linked to an exam
            const existingExamAssessmentIds = examsData.map(e => e.assessment);
            setAssessments(assessmentsData.filter(a =>
                a.type === 'exam' && !existingExamAssessmentIds.includes(a.assessment_id)
            ));
            setClasses(classesData);
        } catch (error) {
            console.error("Failed to load exam data", error);
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = async () => {
        if (!formData.assessment) {
            toast.error("Please select an assessment");
            return;
        }

        setSubmitting(true);
        try {
            await academicAPI.createExam(formData);
            toast.success("Exam scheduled successfully");
            setShowCreateDialog(false);
            setFormData({
                assessment: '',
                hall_ticket_prefix: 'EXAM',
                exam_center: '',
                seating_capacity: 30,
                instructions: ''
            });
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create exam");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateHallTickets = async (examId: string) => {
        try {
            toast.info("Allocating seats...");
            const response = await academicAPI.generateHallTickets(examId);
            toast.success(response.message || "Seating allocated successfully");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to allocate seating");
        }
    };

    const handleDownloadBulkHallTickets = async (exam: Exam) => {
        if (!exam.seating_arrangements || exam.seating_arrangements.length === 0) {
            toast.error("No hall tickets generated yet. Please allocate seating first.");
            return;
        }

        try {
            setDownloadingTickets(exam.exam_id);
            toast.info("Generating hall tickets ZIP...");

            await downloadReport(
                reportsAPI.getBulkHallTicketsZIP(exam.exam_id),
                `hall_tickets_${exam.assessment_details?.title.replace(/\s+/g, '_')}.zip`,
            );
            toast.success(`Downloading ${exam.seating_arrangements.length} hall tickets`);
        } catch (error: any) {
            console.error("Failed to download hall tickets", error);
            toast.error(error.message || "Failed to download hall tickets");
        } finally {
            setDownloadingTickets(null);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!confirm("Are you sure? This will delete the exam and all hall tickets.")) return;
        try {
            await academicAPI.deleteExam(examId);
            toast.success("Exam removed");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete exam");
        }
    };

    const filteredExams = exams.filter(exam =>
        exam.assessment_details?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.exam_center?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p>Loading Exam Logistics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-indigo-600" /> Exam Management
                    </h1>
                    <p className="text-slate-500">Schedule exams, manage seating, and generate hall tickets</p>
                </div>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Schedule Exam
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Schedule New Exam</DialogTitle>
                            <DialogDescription>
                                Link an existing exam-type assessment to logistics management.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Assessment (Exam Type)</Label>
                                <Select
                                    value={formData.assessment}
                                    onValueChange={(v) => setFormData({ ...formData, assessment: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an assessment..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assessments.length === 0 ? (
                                            <div className="p-2 text-sm text-slate-500">No unlinked exams found. Create one in Assessments.</div>
                                        ) : (
                                            assessments.map(a => (
                                                <SelectItem key={a.assessment_id} value={a.assessment_id}>
                                                    {a.title} ({a.subject_name})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Hall Ticket Prefix</Label>
                                    <Input
                                        value={formData.hall_ticket_prefix}
                                        onChange={(e) => setFormData({ ...formData, hall_ticket_prefix: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Seating Capacity</Label>
                                    <Input
                                        type="number"
                                        value={formData.seating_capacity}
                                        onChange={(e) => setFormData({ ...formData, seating_capacity: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Exam Center</Label>
                                <Input
                                    placeholder="e.g. Main Hall, Room 402"
                                    value={formData.exam_center}
                                    onChange={(e) => setFormData({ ...formData, exam_center: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Instructions (Optional)</Label>
                                <Input
                                    placeholder="Enter exam rules..."
                                    value={formData.instructions}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateExam} disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Schedule Exam
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-indigo-100 bg-indigo-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-900">Total Exams</CardTitle>
                        <ClipboardList className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">{exams.length}</div>
                        <p className="text-xs text-indigo-700 mt-1">Scheduled for this term</p>
                    </CardContent>
                </Card>
                <Card className="border-emerald-100 bg-emerald-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Hall Tickets</CardTitle>
                        <Printer className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            {exams.reduce((acc, e) => acc + (e.seating_arrangements?.length || 0), 0)}
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">Generated and ready</p>
                    </CardContent>
                </Card>
                <Card className="border-amber-100 bg-amber-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">Active Centers</CardTitle>
                        <MapPin className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">
                            {new Set(exams.map(e => e.exam_center)).size}
                        </div>
                        <p className="text-xs text-amber-700 mt-1">Unique locations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Exam List */}
            <Card className="border-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Exam Schedule</CardTitle>
                            <CardDescription>View and manage logistical details for all upcoming exams</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search exams..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredExams.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No exams scheduled yet.</p>
                                <p className="text-sm">Click "Schedule Exam" to get started.</p>
                            </div>
                        ) : (
                            filteredExams.map(exam => (
                                <div key={exam.exam_id} className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all gap-6">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-800">{exam.assessment_details?.title}</h3>
                                                <Badge variant={exam.is_published ? "default" : "secondary"}>
                                                    {exam.is_published ? "Published" : "Draft"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">
                                                {exam.assessment_details?.subject_name} • {exam.exam_center || 'Location TBD'}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center text-xs text-slate-400">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {exam.seating_arrangements?.length || 0} Registered
                                                </div>
                                                <div className="flex items-center text-xs text-slate-400">
                                                    <Settings2 className="h-3 w-3 mr-1" />
                                                    Capacity: {exam.seating_capacity}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                            onClick={() => handleGenerateHallTickets(exam.exam_id)}
                                        >
                                            <Settings2 className="h-4 w-4 mr-2" /> Allocate Seats
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                            onClick={() => handleDownloadBulkHallTickets(exam)}
                                            disabled={downloadingTickets === exam.exam_id || !exam.seating_arrangements || exam.seating_arrangements.length === 0}
                                        >
                                            {downloadingTickets === exam.exam_id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Downloading...
                                                </>
                                            ) : (
                                                <>
                                                    <Printer className="h-4 w-4 mr-2" /> Download ZIP
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            onClick={() => handleDeleteExam(exam.exam_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
