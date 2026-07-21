// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface CourseCardProps {
    course: {
        course_id: string;
        subject: string;
        academic_class: string;
    };
    lessonCount?: number;
    assessmentCount?: number;
    studentCount?: number;
    onViewDetails?: () => void;
}

export function CourseCard({
    course,
    lessonCount,
    assessmentCount,
    studentCount,
    onViewDetails
}: CourseCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg">{course.subject}</CardTitle>
                        <CardDescription className="mt-1">
                            Class ID: {course.academic_class}
                        </CardDescription>
                    </div>
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        {lessonCount !== undefined && (
                            <div className="flex flex-col items-center p-2 bg-blue-50 rounded">
                                <span className="font-semibold text-blue-700">{lessonCount}</span>
                                <span className="text-xs text-muted-foreground">Lessons</span>
                            </div>
                        )}
                        {assessmentCount !== undefined && (
                            <div className="flex flex-col items-center p-2 bg-green-50 rounded">
                                <span className="font-semibold text-green-700">{assessmentCount}</span>
                                <span className="text-xs text-muted-foreground">Assessments</span>
                            </div>
                        )}
                        {studentCount !== undefined && (
                            <div className="flex flex-col items-center p-2 bg-purple-50 rounded">
                                <span className="font-semibold text-purple-700">{studentCount}</span>
                                <span className="text-xs text-muted-foreground">Students</span>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    {onViewDetails && (
                        <Button
                            onClick={onViewDetails}
                            variant="secondary"
                            className="w-full"
                        >
                            View Course
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
