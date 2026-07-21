// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Shield, User, Globe, Mail, Loader2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { saasApi } from '@/lib/api/saas';
import { usersAPI, User as UserType } from '@/lib/api';
import { toast } from 'sonner';

type AccountForm = {
    user_id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
};

type PlatformForm = {
    site_name: string;
    support_email: string;
    default_language: string;
};

type PasswordForm = {
    old_password: string;
    new_password: string;
    confirm_password: string;
};

const EMPTY_ACCOUNT: AccountForm = {
    user_id: '',
    first_name: '',
    last_name: '',
    username: '',
    email: '',
};

const EMPTY_PLATFORM: PlatformForm = {
    site_name: '',
    support_email: '',
    default_language: 'en',
};

const EMPTY_PASSWORD: PasswordForm = {
    old_password: '',
    new_password: '',
    confirm_password: '',
};

export default function SaasProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [isSavingPlatform, setIsSavingPlatform] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [accountForm, setAccountForm] = useState<AccountForm>(EMPTY_ACCOUNT);
    const [platformForm, setPlatformForm] = useState<PlatformForm>(EMPTY_PLATFORM);
    const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD);

    const loadProfile = async () => {
        try {
            const [me, settings] = await Promise.all([usersAPI.getMe(), saasApi.getSettings()]);
            const user = me as UserType;
            setAccountForm({
                user_id: String(user.user_id || ''),
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || '',
                email: user.email || '',
            });
            setPlatformForm({
                site_name: settings.site_name || '',
                support_email: settings.support_email || '',
                default_language: settings.default_language || 'en',
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to load profile settings.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const saveAccountProfile = async () => {
        if (!accountForm.user_id) return;
        if (!accountForm.first_name || !accountForm.last_name || !accountForm.email) {
            toast.error('First name, last name, and email are required.');
            return;
        }

        setIsSavingAccount(true);
        try {
            await usersAPI.updateAccount(accountForm.user_id, {
                first_name: accountForm.first_name,
                last_name: accountForm.last_name,
                username: accountForm.username,
                email: accountForm.email,
            });
            toast.success('Account profile updated.');
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to update account profile.';
            toast.error(message);
        } finally {
            setIsSavingAccount(false);
        }
    };

    const savePlatformProfile = async () => {
        if (!platformForm.site_name || !platformForm.support_email) {
            toast.error('Site name and support email are required.');
            return;
        }

        setIsSavingPlatform(true);
        try {
            await saasApi.updateSettings({
                site_name: platformForm.site_name,
                support_email: platformForm.support_email,
                default_language: platformForm.default_language,
            });
            toast.success('Platform profile updated.');
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to update platform profile.';
            toast.error(message);
        } finally {
            setIsSavingPlatform(false);
        }
    };

    const updatePassword = async () => {
        if (!passwordForm.old_password || !passwordForm.new_password) {
            toast.error('Current and new password are required.');
            return;
        }
        if (passwordForm.new_password.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error('New password and confirmation do not match.');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await usersAPI.changeMyPassword(passwordForm.old_password, passwordForm.new_password);
            toast.success('Password updated successfully.');
            setPasswordForm(EMPTY_PASSWORD);
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to update password.';
            toast.error(message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10 max-w-5xl mx-auto space-y-8 min-h-full">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <User className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profile & Security</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your SaaS admin account and platform profile.</p>
                </div>
            </motion.div>

            <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-indigo-500" /> Account Profile</CardTitle>
                            <CardDescription>Details for the currently logged-in SaaS admin.</CardDescription>
                        </div>
                        <Badge variant="outline" className="uppercase">{'saas_admin'}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={accountForm.first_name} onChange={(e) => setAccountForm((p) => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={accountForm.last_name} onChange={(e) => setAccountForm((p) => ({ ...p, last_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Username</Label>
                        <Input value={accountForm.username} onChange={(e) => setAccountForm((p) => ({ ...p, username: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email</Label>
                        <Input type="email" value={accountForm.email} onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={saveAccountProfile} disabled={isSavingAccount} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isSavingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Account
                    </Button>
                </CardFooter>
            </Card>

            <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-emerald-500" /> Platform Profile</CardTitle>
                    <CardDescription>Live configuration used across the SaaS application.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Site Name</Label>
                        <Input value={platformForm.site_name} onChange={(e) => setPlatformForm((p) => ({ ...p, site_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Support Email</Label>
                        <Input type="email" value={platformForm.support_email} onChange={(e) => setPlatformForm((p) => ({ ...p, support_email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Default Language</Label>
                        <Select value={platformForm.default_language} onValueChange={(value) => setPlatformForm((p) => ({ ...p, default_language: value }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={savePlatformProfile} disabled={isSavingPlatform} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isSavingPlatform ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Platform
                    </Button>
                </CardFooter>
            </Card>

            <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" /> Security</CardTitle>
                    <CardDescription>Change your own SaaS admin password.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm((p) => ({ ...p, old_password: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))} />
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={updatePassword} disabled={isUpdatingPassword} className="bg-amber-600 hover:bg-amber-700 text-white">
                        {isUpdatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Update Password
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
