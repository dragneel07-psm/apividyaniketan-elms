'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Award, CheckCircle2, FileKey2, Loader2, Plus, ShieldCheck } from 'lucide-react';
import { academicAPI, AcademicClass, AcademicYear, ExamSubjectConfiguration, ExamTerm, Subject, Teacher } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyTerm = { name: '', academic_year: '', exam_type: 'first_terminal', start_date: '', end_date: '' };
const emptySubject = { term: '', subject: '', section: '', examiner: '', theory_full_marks: '75', internal_full_marks: '25', practical_full_marks: '0', credit_hours: '1' };

export default function ResultProcessingPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [configs, setConfigs] = useState<ExamSubjectConfiguration[]>([]);
  const [termForm, setTermForm] = useState(emptyTerm);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => classes.flatMap(c => (c.sections || []).map(s => ({ ...s, className: c.name }))), [classes]);

  async function load() {
    try {
      const [yearRows, termRows, classRows, subjectRows, teacherRows, configRows] = await Promise.all([
        academicAPI.getAcademicYears(), academicAPI.getExamTerms(), academicAPI.getClasses(),
        academicAPI.getSubjects(), academicAPI.getTeachers(), academicAPI.getExamSubjects(),
      ]);
      setYears(yearRows); setTerms(termRows); setClasses(classRows); setSubjects(subjectRows); setTeachers(teacherRows); setConfigs(configRows);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load result processing'); }
  }

  useEffect(() => { void load(); }, []);

  async function createTerm() {
    if (!termForm.name || !termForm.academic_year || !termForm.start_date || !termForm.end_date) return toast.error('Complete all exam term fields.');
    setBusy(true);
    try {
      await academicAPI.ensureNepal2081Profile();
      await academicAPI.createExamTerm({ ...termForm, academic_year: Number(termForm.academic_year), exam_type: termForm.exam_type as ExamTerm['exam_type'] });
      setTermForm(emptyTerm); toast.success('Exam term created with Nepal 2081 grading rules.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create exam term'); } finally { setBusy(false); }
  }

  async function addSubject() {
    if (!subjectForm.term || !subjectForm.subject || !subjectForm.section) return toast.error('Select term, subject and section.');
    setBusy(true);
    try {
      await academicAPI.createExamSubject({
        term: subjectForm.term, subject: Number(subjectForm.subject), section: Number(subjectForm.section),
        examiner: subjectForm.examiner || null, theory_full_marks: subjectForm.theory_full_marks,
        internal_full_marks: subjectForm.internal_full_marks, practical_full_marks: subjectForm.practical_full_marks,
        credit_hours: subjectForm.credit_hours,
      });
      setSubjectForm({ ...emptySubject, term: subjectForm.term }); toast.success('Subject and examiner configured.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not configure subject'); } finally { setBusy(false); }
  }

  async function generateCodes(id: string) {
    try {
      const data = await academicAPI.generateAnswerPaperCodes(id);
      if (data.generated.length) {
        const csv = ['Student,Code', ...data.generated.map(r => `"${r.student_name}",${r.code}`)].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `confidential-paper-codes-${id}.csv`; anchor.click(); URL.revokeObjectURL(url);
      }
      toast.success(`${data.generated.length} confidential codes generated.`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Code generation failed'); }
  }

  async function verify(id: string) {
    try { await academicAPI.verifyExamMarks(id); toast.success('Marks independently verified.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Verification failed'); }
  }

  async function publish(term: ExamTerm) {
    if (!window.confirm(`Publish ${term.name}? Published results and marks are immutable.`)) return;
    try { const readiness = await academicAPI.getExamTermReadiness(term.term_id); if (!readiness.ready) return toast.error('Every subject batch must be verified first.'); const out = await academicAPI.publishExamTerm(term.term_id); toast.success(`${out.student_count} results published.`); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Publication failed'); }
  }

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold flex items-center gap-2"><Award className="text-indigo-600" /> Result Processing</h1><p className="text-slate-500 mt-1">Nepal Government letter grading, coded marking, independent verification and controlled publication.</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Create examination term</CardTitle><CardDescription>Nepal Letter Grading Directive 2078, Fourth Amendment 2081.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Name</Label><Input value={termForm.name} onChange={e => setTermForm(v => ({...v,name:e.target.value}))} placeholder="First Terminal Examination" /></div>
        <div><Label>Academic year</Label><Select value={termForm.academic_year} onValueChange={v => setTermForm(f=>({...f,academic_year:v}))}><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Type</Label><Select value={termForm.exam_type} onValueChange={v=>setTermForm(f=>({...f,exam_type:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unit_test">Unit Test</SelectItem><SelectItem value="first_terminal">First Terminal</SelectItem><SelectItem value="second_terminal">Second Terminal</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="pre_board">Pre-board</SelectItem></SelectContent></Select></div>
        <div><Label>Start</Label><Input type="date" value={termForm.start_date} onChange={e=>setTermForm(f=>({...f,start_date:e.target.value}))}/></div><div><Label>End</Label><Input type="date" value={termForm.end_date} onChange={e=>setTermForm(f=>({...f,end_date:e.target.value}))}/></div>
        <Button className="md:col-span-2" disabled={busy} onClick={createTerm}>{busy?<Loader2 className="animate-spin"/>:<Plus/>} Create term</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Configure subject paper</CardTitle><CardDescription>Assign an examiner and component-wise full marks.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Term</Label><Select value={subjectForm.term} onValueChange={v=>setSubjectForm(f=>({...f,term:v}))}><SelectTrigger><SelectValue placeholder="Select term"/></SelectTrigger><SelectContent>{terms.filter(t=>t.status!=='published').map(t=><SelectItem key={t.term_id} value={t.term_id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Subject</Label><Select value={subjectForm.subject} onValueChange={v=>setSubjectForm(f=>({...f,subject:v}))}><SelectTrigger><SelectValue placeholder="Select subject"/></SelectTrigger><SelectContent>{subjects.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Section</Label><Select value={subjectForm.section} onValueChange={v=>setSubjectForm(f=>({...f,section:v}))}><SelectTrigger><SelectValue placeholder="Select section"/></SelectTrigger><SelectContent>{sections.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.className} - {s.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Examiner</Label><Select value={subjectForm.examiner} onValueChange={v=>setSubjectForm(f=>({...f,examiner:v}))}><SelectTrigger><SelectValue placeholder="Select teacher"/></SelectTrigger><SelectContent>{teachers.map(t=><SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}</SelectContent></Select></div>
        {(['theory_full_marks','internal_full_marks','practical_full_marks','credit_hours'] as const).map(k=><div key={k}><Label>{k.replaceAll('_',' ')}</Label><Input type="number" min="0" value={subjectForm[k]} onChange={e=>setSubjectForm(f=>({...f,[k]:e.target.value}))}/></div>)}
        <Button className="md:col-span-2" disabled={busy} onClick={addSubject}><Plus/> Add subject paper</Button>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Secure marking batches</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Term / Subject</TableHead><TableHead>Class</TableHead><TableHead>Examiner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Controls</TableHead></TableRow></TableHeader><TableBody>{configs.map(c=><TableRow key={c.exam_subject_id}><TableCell><b>{c.subject_name}</b><div className="text-xs text-slate-500">{terms.find(t=>t.term_id===c.term)?.name}</div></TableCell><TableCell>{c.class_name} - {c.section_name}</TableCell><TableCell>{c.examiner_name||'Unassigned'}</TableCell><TableCell><Badge variant={c.marking_status==='verified'?'default':'secondary'}>{c.marking_status}</Badge></TableCell><TableCell className="text-right space-x-2"><Button size="sm" variant="outline" onClick={()=>generateCodes(c.exam_subject_id)}><FileKey2/> Codes</Button>{c.marking_status==='submitted'&&<Button size="sm" onClick={()=>verify(c.exam_subject_id)}><ShieldCheck/> Verify</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle>Publication</CardTitle><CardDescription>Publication is allowed only after every paper is marked, submitted and independently verified.</CardDescription></CardHeader><CardContent className="space-y-3">{terms.map(t=><div key={t.term_id} className="flex items-center justify-between rounded-lg border p-4"><div><b>{t.name}</b><div className="text-sm text-slate-500">{t.academic_year_name} · {t.status}</div></div>{t.status==='published'?<Badge><CheckCircle2 className="mr-1 h-3 w-3"/>Published</Badge>:<Button onClick={()=>publish(t)}>Publish verified results</Button>}</div>)}</CardContent></Card>
  </div>;
}
