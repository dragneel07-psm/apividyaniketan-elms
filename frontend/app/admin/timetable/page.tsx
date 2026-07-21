// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ManageScheduleDialog } from '@/components/manage-schedule-dialog';

export default function AdminTimetablePage() {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-indigo-600" />
                    Timetable Management
                </h1>
                <p className="text-slate-500">
                    Create optimized class schedules, clone timetable templates, and approve teacher extra class requests.
                </p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>School Timetable Control Center</CardTitle>
                    <CardDescription>
                        Main timetable can be managed by admin/management staff. Teachers can submit extra classes that require approval.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Open Timetable Manager
                    </Button>
                </CardContent>
            </Card>

            <ManageScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
