// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { academicAPI, liveSessionAPI, AcademicClass } from '@/lib/api';

interface StartInstantLiveClassDialogProps {
    trigger?: React.ReactNode;
}

export function StartInstantLiveClassDialog({ trigger }: StartInstantLiveClassDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assignedClasses, setAssignedClasses] = useState<AcademicClass[]>([]);
    
    const [formData, setFormData] = useState({
        academic_class: '',
        subject_name: '',
    });

    useEffect(() => {
        if (open) {
            // Backend already scopes /academic/classes/ to the teacher's
            // assigned_classes when role=teacher.
            academicAPI.getClasses()
                .then(setAssignedClasses)
                .catch(console.error);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get current year
            const currentYear = await academicAPI.getCurrentAcademicYear();
            if (!currentYear) throw new Error('No active academic year found.');

            // Calculate dates
            const now = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = days[now.getDay()];
            
            const startHour = String(now.getHours()).padStart(2, '0');
            const startMin = String(now.getMinutes()).padStart(2, '0');
            
            // Add 1 hour for end time
            now.setHours(now.getHours() + 1);
            const endHour = String(now.getHours()).padStart(2, '0');
            const endMin = String(now.getMinutes()).padStart(2, '0');

            // 1. Create the instant timetable slot
            const createdSlot = await academicAPI.createTimetable({
                academic_class: formData.academic_class,
                academic_year: currentYear.id,
                day_of_week: dayOfWeek,
                start_time: `${startHour}:${startMin}`,
                end_time: `${endHour}:${endMin}`,
                subject_name: formData.subject_name.trim() || 'Instant Live Session',
                room_number: 'Online',
                entry_type: 'extra',
                status: 'pending', // Backend will accept this!
            });

            // 2. Start the Live Session instantly
            const sessionData = await liveSessionAPI.start(createdSlot.timetable_id);
            
            toast.success('Live class started successfully!');
            setOpen(false);

            // 3. Open Jitsi in a new tab
            if (sessionData && sessionData.jitsi_url) {
                window.open(sessionData.jitsi_url, '_blank');
            } else {
                toast.error('Could not retrieve meeting URL.');
            }

        } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Failed to start instant live class');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                        <Video className="mr-3 h-5 w-5 text-indigo-500" /> Start Live Class
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-indigo-500" />
                            Start Instant Live Class
                        </DialogTitle>
                        <DialogDescription>
                            Quickly spin up a live meeting for your students right now. This will appear on their dashboard automatically.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4 mt-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="class" className="text-right">Class</Label>
                            <div className="col-span-3">
                                <Select 
                                    value={formData.academic_class} 
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, academic_class: val }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignedClasses.length === 0 && (
                                            <SelectItem value="disabled" disabled>No classes assigned</SelectItem>
                                        )}
                                        {assignedClasses.map((cls) => (
                                            <SelectItem key={cls.id} value={String(cls.id)}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subject" className="text-right">Subject / Topic</Label>
                            <Input
                                id="subject"
                                className="col-span-3"
                                placeholder="e.g. Extra Biology Revision"
                                value={formData.subject_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                                required
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.academic_class || !formData.subject_name} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Go Live Now
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
