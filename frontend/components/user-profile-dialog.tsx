// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, usersAPI, academicAPI, AcademicClass } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, User as UserIcon, Briefcase, Edit2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function UserProfileDialog({ user, open, onOpenChange, onSuccess }: UserProfileDialogProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<AcademicClass[]>([]);

    // Form State
    const [formData, setFormData] = useState<{
        first_name: string;
        last_name: string;
        email: string;
        role: User['role'];
        username: string;
    }>({
        first_name: '',
        last_name: '',
        email: '',
        role: 'student',
        username: ''
    });

    // Enrollment state (for students)
    const [currentClass, setCurrentClass] = useState<string>('');
    const [studentProfileId, setStudentProfileId] = useState<string>('');

    useEffect(() => {
        if (user && open) {
            setFormData({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                username: user.username
            });
            setIsEditing(false);

            // If student, fetch enrollment details
            if (user.role === 'student') {
                loadStudentDetails(user.user_id);
                loadClasses();
            }
        }
    }, [user, open]);

    const loadClasses = async () => {
        try {
            const data = await academicAPI.getClasses();
            setClasses(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load classes", e);
        }
    };

    const loadStudentDetails = async (userId: string) => {
        try {
            const students = await academicAPI.getStudents();
            const profile = (Array.isArray(students) ? students : []).find(s => s.user_id === userId);
            if (profile) {
                setStudentProfileId(profile.id);
                setCurrentClass(profile.academic_class?.toString() || '');
            }
        } catch (e) {
            console.error("Failed to load student profile", e);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Update User Account (Name, Role, Email)
            await usersAPI.updateAccount(user.user_id, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                role: formData.role
            });

            // 2. Update Enrollment (if student and class changed)
            if (formData.role === 'student' && studentProfileId && currentClass) {
                await academicAPI.updateStudent(studentProfileId, {
                    academic_class: parseInt(currentClass)
                });
            }

            // If role changed from non-student to student, we might need to create a profile
            // This is complex, for now we assume simple updates.

            toast.success('User profile updated successfully');
            setIsEditing(false);
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to update: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'teacher': return 'bg-blue-100 text-blue-800';
            case 'student': return 'bg-green-100 text-green-800';
            case 'parent': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Helper to display friendly role names
    const getDisplayRole = (role: string) => {
        if (role === 'admin') return 'Principal';
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-4">
                        <DialogTitle>User Profile</DialogTitle>
                        {!isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit User
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header with Name and Role */}
                    <div className="flex items-center gap-4 pb-4 border-b">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                            {formData.first_name?.[0]}{formData.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="First Name"
                                    />
                                    <Input
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Last Name"
                                    />
                                </div>
                            ) : (
                                <h2 className="text-2xl font-bold">{user.first_name} {user.last_name}</h2>
                            )}

                            {isEditing ? (
                                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}>
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="admin">Principal (Admin)</SelectItem>
                                        <SelectItem value="parent">Parent</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium mt-1 ${getRoleBadgeColor(user.role)}`}>
                                    {getDisplayRole(user.role)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* User Details */}
                    <div className="grid gap-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Username</p>
                                        <p className="font-medium text-slate-700">{user.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        {isEditing ? (
                                            <Input
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="h-8 mt-1"
                                            />
                                        ) : (
                                            <p className="font-medium">{user.email}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Enrollment Section (Dynamic based on Role) */}
                                {(formData.role === 'student' || user.role === 'student') && (
                                    <div className="flex items-center gap-3 pt-2 border-t mt-2">
                                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-sm text-muted-foreground">Enrolled Class</p>
                                            {isEditing ? (
                                                <Select value={currentClass} onValueChange={setCurrentClass}>
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue placeholder="Assign Class..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {classes.map(c => (
                                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <p className="font-medium">
                                                    {classes.find(c => c.id.toString() === currentClass)?.name || 'No Class Assigned'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {isEditing && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                                <X className="h-4 w-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
