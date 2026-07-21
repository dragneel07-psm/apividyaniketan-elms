'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Award, Download, Loader2 } from 'lucide-react';
import { academicAPI, StudentTermResult } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TermResultsList({ title = 'Published Results' }: { title?: string }) {
  const [rows, setRows] = useState<StudentTermResult[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { academicAPI.getTermResults().then(setRows).catch(e => toast.error(e instanceof Error ? e.message : 'Unable to load results')).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  return <div className="space-y-6 p-6 md:p-8"><div><h1 className="flex items-center gap-2 text-3xl font-bold"><Award className="text-indigo-600" />{title}</h1><p className="text-slate-500">Official term results published under Nepal letter-grading rules.</p></div>
    {rows.length===0?<Card><CardContent className="py-16 text-center text-slate-500">No term result has been published yet.</CardContent></Card>:rows.map(row=><Card key={row.term_result_id}><CardHeader className="flex-row items-start justify-between"><div><CardTitle>{row.term_name}</CardTitle><CardDescription>{row.student_name} · {row.academic_year} · Marksheet {row.marksheet_number}</CardDescription></div><div className="flex items-center gap-2"><Badge variant={row.result_status==='GRD'?'default':'destructive'}>{row.result_status}</Badge><Button variant="outline" size="sm" onClick={()=>academicAPI.downloadTermMarksheet(row.term_result_id,row.marksheet_number)}><Download/>Print marksheet</Button></div></CardHeader><CardContent><div className="mb-4 grid grid-cols-3 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">GPA</p><b className="text-xl">{row.gpa??'NG'}</b></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total</p><b>{row.total_obtained}/{row.total_full_marks}</b></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Published</p><b>{new Date(row.published_at).toLocaleDateString()}</b></div></div><Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead><TableHead>GP</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{(row.snapshot?.subjects||[]).map((s,i)=><TableRow key={`${s.subject_name}-${i}`}><TableCell>{s.subject_name}</TableCell><TableCell>{s.obtained}/{s.full_marks}</TableCell><TableCell>{s.grade}</TableCell><TableCell>{s.grade_point}</TableCell><TableCell>{s.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>)}
  </div>;
}
