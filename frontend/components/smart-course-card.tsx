// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlayCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartCourseCardProps {
    course: {
        title: string;
        description?: string;
    };
    progress?: number;
    nextLesson?: string;
    weakTopics?: string[];
}

export function SmartCourseCard({ course, progress = 0, nextLesson, weakTopics = [] }: SmartCourseCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg line-clamp-1">{course.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="font-medium text-blue-600">{progress}% Complete</span>
                            <span className="text-muted-foreground">12/40 Lessons</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* Next Lesson */}
                    <div className="bg-slate-50 p-3 rounded-lg border flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Next Up</p>
                            <p className="text-sm font-medium truncate">{nextLesson || "Introduction to Module"}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <PlayCircle className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* AI Insights - Only show if there are weak topics */}
                    {weakTopics.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>
                                <strong>Focus needed:</strong> {weakTopics.join(", ")}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
