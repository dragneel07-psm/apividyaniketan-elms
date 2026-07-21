// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth';
import { UserProfile } from '@/types/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Lock, Mail, Save, ShieldCheck, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { BadgesGallery } from '@/components/gamification/badges-gallery';
import { Switch } from '@/components/ui/switch';
import { gamificationAPI } from '@/lib/api';
import { PrivacyToggle } from './privacy-toggle';

const profileSchema = z.object({
    first_name: z.string().min(2, "First name is too short"),
    last_name: z.string().min(2, "Last name is too short"),
});

const passwordSchema = z.object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

export function ProfileView() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        reset: resetProfile,
        formState: { errors: profileErrors }
    } = useForm({
        resolver: zodResolver(profileSchema)
    });

    const {
        register: registerPass,
        handleSubmit: handlePassSubmit,
        reset: resetPass,
        formState: { errors: passErrors }
    } = useForm({
        resolver: zodResolver(passwordSchema)
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await authService.getProfile();
            setUser(data);
            resetProfile({
                first_name: data.first_name,
                last_name: data.last_name
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    };

    const onUpdateProfile = async (data: any) => {
        setIsSaving(true);
        try {
            const updated = await authService.updateProfile(data);
            setUser(updated);
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const onChangePassword = async (data: any) => {
        setIsSaving(true);
        try {
            await authService.changePassword({
                old_password: data.old_password,
                new_password: data.new_password
            });
            toast.success("Password changed successfully");
            resetPass();
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || "Failed to change password. Check your current password.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (!user) return <div className="text-center p-8">Failed to load profile.</div>;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-4 mb-8"
            >
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">{user.first_name} {user.last_name}</h1>
                    <p className="text-slate-400 capitalize flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        {user.role} Account
                    </p>
                </div>
            </motion.div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">Overview</TabsTrigger>
                    {user.role === 'student' && (
                        <TabsTrigger value="achievements" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white flex gap-2 items-center">
                            <Award className="w-4 h-4" /> Achievements
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="edit" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">Edit Profile</TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>Your personal information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-slate-400">First Name</Label>
                                    <div className="text-lg font-medium">{user.first_name}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-400">Last Name</Label>
                                    <div className="text-lg font-medium">{user.last_name}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-400">Email Address</Label>
                                    <div className="text-lg font-medium flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        {user.email}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-400">User ID</Label>
                                    <div className="text-sm font-mono text-slate-500">{user.user_id}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {user.role === 'student' && (
                    <TabsContent value="achievements">
                        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Achievements & Badges</CardTitle>
                                <CardDescription>Badges you've unlocked through your learning journey</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BadgesGallery />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="edit">
                    <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Edit Profile</CardTitle>
                            <CardDescription>Update your personal details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={handleProfileSubmit(onUpdateProfile)} id="profile-form">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name">First Name</Label>
                                            <Input id="first_name" className="bg-white/5 border-white/10" {...registerProfile('first_name')} />
                                            {/* @ts-ignore */}
                                            {profileErrors.first_name && <p className="text-red-400 text-xs">{profileErrors.first_name.message as string}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name">Last Name</Label>
                                            <Input id="last_name" className="bg-white/5 border-white/10" {...registerProfile('last_name')} />
                                            {/* @ts-ignore */}
                                            {profileErrors.last_name && <p className="text-red-400 text-xs">{profileErrors.last_name.message as string}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input value={user.email} disabled className="bg-white/5 border-white/10 opacity-50 cursor-not-allowed" />
                                        <p className="text-xs text-slate-500">Email cannot be changed.</p>
                                    </div>
                                </div>
                            </form>

                            {user.role === 'student' && (
                                <div className="pt-6 border-t border-white/10">
                                    <h3 className="text-lg font-medium mb-4">Privacy Settings</h3>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Public Leaderboard</Label>
                                            <p className="text-sm text-slate-400">
                                                Allow your name and score to appear on class leaderboards.
                                            </p>
                                        </div>
                                        <PrivacyToggle />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" form="profile-form" disabled={isSaving} className="bg-violet-600 hover:bg-violet-500">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card className="bg-white/5 border-white/10 text-white backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Ensure your account is secure</CardDescription>
                        </CardHeader>
                        <form onSubmit={handlePassSubmit(onChangePassword)}>
                            <CardContent className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="old_password">Current Password</Label>
                                    <Input type="password" id="old_password" className="bg-white/5 border-white/10" {...registerPass('old_password')} />
                                    {/* @ts-ignore */}
                                    {passErrors.old_password && <p className="text-red-400 text-xs">{passErrors.old_password.message as string}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new_password">New Password</Label>
                                    <Input type="password" id="new_password" className="bg-white/5 border-white/10" {...registerPass('new_password')} />
                                    {/* @ts-ignore */}
                                    {passErrors.new_password && <p className="text-red-400 text-xs">{passErrors.new_password.message as string}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                                    <Input type="password" id="confirm_password" className="bg-white/5 border-white/10" {...registerPass('confirm_password')} />
                                    {/* @ts-ignore */}
                                    {passErrors.confirm_password && <p className="text-red-400 text-xs">{passErrors.confirm_password.message as string}</p>}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isSaving} variant="destructive">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                    Update Password
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
