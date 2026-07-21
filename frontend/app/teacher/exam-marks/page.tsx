'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Loader2, Send, ShieldCheck } from 'lucide-react';
import { academicAPI, ExamSubjectConfiguration } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SecureExamMarksPage() {
  const [batches, setBatches] = useState<ExamSubjectConfiguration[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{grade:string;grade_point:number;status:string;percentage:number}|null>(null);
  const [form, setForm] = useState({ code:'', theory_marks:'', internal_marks:'', practical_marks:'', attendance_status:'present', examiner_remarks:'' });
  async function load(){ try { setBatches(await academicAPI.getExamSubjects()); } catch(e){ toast.error(e instanceof Error?e.message:'Unable to load assigned batches'); } }
  useEffect(()=>{void load();},[]);
  async function save(){ if(!form.code.trim()) return toast.error('Enter the confidential answer-paper code.'); setBusy(true); try { const data=await academicAPI.enterCodedMarks({code:form.code,...Object.fromEntries(['theory_marks','internal_marks','practical_marks'].filter(k=>form[k as keyof typeof form] !== '').map(k=>[k,Number(form[k as keyof typeof form])])),attendance_status:form.attendance_status,examiner_remarks:form.examiner_remarks}); setResult(data.calculated); toast.success('Marks saved by anonymous paper code.'); setForm(f=>({...f,code:'',theory_marks:'',internal_marks:'',practical_marks:'',examiner_remarks:''})); } catch(e){toast.error(e instanceof Error?e.message:'Could not save marks');} finally{setBusy(false);} }
  async function submit(id:string){ if(!window.confirm('Submit this complete marks batch for independent verification? It will no longer be editable.')) return; try{await academicAPI.submitExamMarks(id);toast.success('Batch submitted to Exam Controller.');await load();}catch(e){toast.error(e instanceof Error?e.message:'Submission failed');}}
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="text-indigo-600"/>Secure Exam Marks</h1><p className="text-slate-500">Enter checked written-paper marks using anonymous codes. Student identity remains hidden during marking.</p></div>
    <Card className="max-w-3xl"><CardHeader><CardTitle className="flex gap-2"><KeyRound/>Coded mark entry</CardTitle><CardDescription>Component limits and Nepal grading thresholds are validated by the server.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-3"><Label>Answer-paper code</Label><Input autoComplete="off" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="FIR-10A-MATH-XXXXXXXX"/></div>
      {(['theory_marks','internal_marks','practical_marks'] as const).map(k=><div key={k}><Label>{k.replaceAll('_',' ')}</Label><Input type="number" min="0" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>)}
      <div><Label>Attendance</Label><Select value={form.attendance_status} onValueChange={v=>setForm(f=>({...f,attendance_status:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="withheld">Withheld</SelectItem><SelectItem value="exempt">Exempt</SelectItem></SelectContent></Select></div>
      <div className="md:col-span-2"><Label>Examiner remarks</Label><Input value={form.examiner_remarks} onChange={e=>setForm(f=>({...f,examiner_remarks:e.target.value}))}/></div>
      <Button className="md:col-span-3" disabled={busy} onClick={save}>{busy?<Loader2 className="animate-spin"/>:<ShieldCheck/>} Save coded marks</Button>
      {result&&<div className="md:col-span-3 rounded-lg bg-indigo-50 p-4 text-sm">Calculated: <b>{result.grade}</b> · GP {result.grade_point} · {result.percentage}% · {result.status}</div>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>My assigned batches</CardTitle><CardDescription>Submit only after all coded papers are entered.</CardDescription></CardHeader><CardContent className="space-y-3">{batches.map(b=><div key={b.exam_subject_id} className="flex items-center justify-between rounded-lg border p-4"><div><b>{b.subject_name}</b><div className="text-sm text-slate-500">{b.class_name} - {b.section_name} · {b.paper_count||0} papers</div></div><div className="flex items-center gap-2"><Badge variant="secondary">{b.marking_status}</Badge>{b.marking_status==='draft'&&<Button size="sm" onClick={()=>submit(b.exam_subject_id)}><Send/> Submit</Button>}</div></div>)}</CardContent></Card>
  </div>;
}
