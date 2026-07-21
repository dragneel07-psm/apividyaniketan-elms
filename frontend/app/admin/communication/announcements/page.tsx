// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { academicAPI, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Send, Users, User, School } from 'lucide-react';

export default function AnnouncementBlast() {
    const [target, setTarget] = useState<'all' | 'role' | 'class'>('all');
    const [role, setRole] = useState('parent');
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [classId, setClassId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        academicAPI.getClasses()
            .then((data) => setClasses(Array.isArray(data) ? data : []))
            .catch((error) => console.error('Failed to load classes for announcements', error));
    }, []);

    const handleSend = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error('Subject and message are required');
            return;
        }
        if (target === 'class' && !classId) {
            toast.error('Please select a class.');
            return;
        }

        setSending(true);
        try {
            const payload = {
                title: subject.trim(),
                content: target === 'role' ? `[Role: ${role}]\n${message.trim()}` : message.trim(),
                category: 'announcement',
                priority: 'normal' as const,
                target_audience: target === 'class' ? 'class' : 'school',
                target_class: target === 'class' ? Number(classId) : null,
            };

            await academicAPI.createNotice(payload as any);
            toast.success('Announcement published successfully.');
            setMessage('');
            setSubject('');
            setClassId('');
        } catch (error) {
            console.error('Failed to send announcement', error);
            toast.error('Failed to send announcement');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Make an Announcement</h2>
                <p className="text-muted-foreground">Send a broadcast message to school, role groups, or a class.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Target Audience</Label>
                        <RadioGroup defaultValue="all" value={target} onValueChange={(v: any) => setTarget(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-slate-50 w-full">
                                <RadioGroupItem value="all" id="r-all" />
                                <Label htmlFor="r-all" className="cursor-pointer flex items-center gap-2"><School className="h-4 w-4" /> All Users</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-slate-50 w-full">
                                <RadioGroupItem value="role" id="r-role" />
                                <Label htmlFor="r-role" className="cursor-pointer flex items-center gap-2"><Users className="h-4 w-4" /> Specific Role</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-slate-50 w-full">
                                <RadioGroupItem value="class" id="r-class" />
                                <Label htmlFor="r-class" className="cursor-pointer flex items-center gap-2"><User className="h-4 w-4" /> Specific Class</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {target === 'role' && (
                        <div className="space-y-2">
                            <Label>Select Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="parent">Parents</SelectItem>
                                    <SelectItem value="student">Students</SelectItem>
                                    <SelectItem value="teacher">Teachers</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {target === 'class' && (
                        <div className="space-y-2">
                            <Label>Select Class</Label>
                            <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Announcement Title" />
                    </div>

                    <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here..." rows={6} />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSend} disabled={sending}>
                            <Send className="mr-2 h-4 w-4" />
                            {sending ? 'Sending...' : 'Send Announcement'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
