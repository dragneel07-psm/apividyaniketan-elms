// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrainCircuit, MessageSquare, FileDown } from 'lucide-react';
import { Result, Assessment, Subject, reportsAPI, downloadReport } from '@/lib/api';

// Extended type to include details joined from other calls
export interface ResultWithDetails extends Result {
    assessmentDetails?: Assessment;
    subjectDetails?: Subject;
    percentage?: number;
}

interface ResultListProps {
    results: ResultWithDetails[];
}

export function ResultList({ results }: ResultListProps) {
    if (results.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed">
                No results available yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <div key={result.result_id || result.id} className="flex flex-col gap-3 p-4 rounded-lg border bg-white hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${(result.percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                                (result.percentage || 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                                    'bg-orange-100 text-orange-700'
                                }`}>
                                {result.percentage}%
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 line-clamp-1">
                                    {result.assessmentDetails?.title || result.assessment_title || 'Assessment'}
                                </h4>
                                <p className="text-sm text-slate-500 font-medium">
                                    {result.subjectDetails?.name || 'Subject'} • {new Date(result.submitted_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="font-bold text-lg text-slate-900">
                                {result.score} <span className="text-sm text-slate-400 font-normal">/ {result.assessmentDetails?.total_marks || 100}</span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    {(result.ai_feedback || result.teacher_feedback) && (
                        <div className="mt-1 flex flex-col gap-2 bg-slate-50 p-3 rounded-md text-sm">
                            {result.teacher_feedback && (
                                <div className="flex gap-2 items-start">
                                    <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <span className="font-semibold text-slate-700">Teacher: </span>
                                        <span className="text-slate-600">{result.teacher_feedback}</span>
                                    </div>
                                </div>
                            )}
                            {result.ai_feedback && (
                                <div className="flex gap-2 items-start">
                                    <BrainCircuit className="h-4 w-4 text-indigo-500 mt-0.5" />
                                    <div>
                                        <span className="font-semibold text-indigo-700">AI Insight: </span>
                                        <span className="text-slate-600">{result.ai_feedback}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-2 h-8 px-2"
                            onClick={() => {
                                const resultPk = result.id || result.result_id;
                                const path = reportsAPI.getResultCardPDF(result.student.toString(), resultPk);
                                const filename = `Result_Card_${result.assessmentDetails?.title || 'Report'}.pdf`;
                                downloadReport(path, filename);
                            }}
                        >
                            <FileDown className="h-4 w-4" />
                            Download Result Card
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
