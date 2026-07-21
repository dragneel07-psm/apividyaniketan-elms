// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { KeyRound, Loader2, LogOut, Settings, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { removeTokens } from '@/lib/auth';
import { authService } from '@/services/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DashboardProfileMenuProps {
    firstName?: string;
    lastName?: string;
    roleLabel?: string;
    avatarUrl?: string;
    settingsHref: string;
    profileHref?: string;
    logoutHref?: string;
    showName?: boolean;
    className?: string;
}

function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error !== 'object' || error === null) return 'Failed to change password.';

    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (typeof data !== 'object' || data === null) return 'Failed to change password.';

    const payload = data as Record<string, unknown>;
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;

    for (const value of Object.values(payload)) {
        if (typeof value === 'string' && value.trim()) return value;
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
            return value[0];
        }
    }

    return 'Failed to change password.';
}

export function DashboardProfileMenu({
    firstName,
    lastName,
    roleLabel = 'User',
    avatarUrl,
    settingsHref,
    profileHref,
    logoutHref = '/login',
    showName = true,
    className,
}: DashboardProfileMenuProps) {
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const displayName = useMemo(() => {
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        if (fullName) return fullName;
        return roleLabel;
    }, [firstName, lastName, roleLabel]);

    const initials = useMemo(() => {
        const first = (firstName || '').trim().charAt(0);
        const last = (lastName || '').trim().charAt(0);
        const combined = `${first}${last}`.toUpperCase();
        if (combined) return combined;
        return roleLabel.trim().charAt(0).toUpperCase() || 'U';
    }, [firstName, lastName, roleLabel]);

    const handleLogout = () => {
        removeTokens();
        window.location.href = logoutHref;
    };

    const resetPasswordState = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New password and confirm password don't match.");
            return;
        }

        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }

        setSubmitting(true);
        try {
            await authService.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
            toast.success('Password changed successfully.');
            setPasswordDialogOpen(false);
            resetPasswordState();
        } catch (error) {
            toast.error(extractErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                            className,
                        )}
                    >
                        {showName && (
                            <div className="hidden text-right md:block">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
                                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{roleLabel}</p>
                            </div>
                        )}
                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                            <AvatarImage src={avatarUrl} alt={displayName} />
                            <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="space-y-0.5">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs font-normal capitalize text-slate-500">{roleLabel}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profileHref && (
                        <DropdownMenuItem asChild>
                            <Link href={profileHref} className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                View Profile
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                        <Link href={settingsHref} className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)} className="gap-2">
                        <KeyRound className="h-4 w-4" />
                        Change Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="gap-2 text-red-600 focus:text-red-600">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
                open={passwordDialogOpen}
                onOpenChange={(open) => {
                    setPasswordDialogOpen(open);
                    if (!open) resetPasswordState();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Update your account password to keep your dashboard secure.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-current-password">Current Password</Label>
                            <Input
                                id="profile-current-password"
                                type="password"
                                value={oldPassword}
                                onChange={(event) => setOldPassword(event.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profile-new-password">New Password</Label>
                            <Input
                                id="profile-new-password"
                                type="password"
                                minLength={8}
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profile-confirm-password">Confirm New Password</Label>
                            <Input
                                id="profile-confirm-password"
                                type="password"
                                minLength={8}
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPasswordDialogOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
