// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, usersAPI } from '@/lib/api';
import { Loader2, Save, Phone, MapPin, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface MyProfileDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function MyProfileDialog({ user, open, onOpenChange, onSuccess }: MyProfileDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        address: '',
        bio: '',
        date_of_birth: '',
        old_password: '', // Added
        new_password: ''  // Added
    });

    useEffect(() => {
        if (user && open) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone_number: user.phone_number || '',
                address: user.address || '',
                bio: user.bio || '',
                date_of_birth: user.date_of_birth || '',
                old_password: '',  // Reset on open
                new_password: ''   // Reset on open
            });
        }
    }, [user, open]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // 1. Update Profile
            await usersAPI.updateAccount(user.user_id, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone_number: formData.phone_number,
                address: formData.address,
                bio: formData.bio,
                date_of_birth: formData.date_of_birth || undefined
            });

            // 2. Change Password (if provided)
            if (formData.old_password && formData.new_password) {
                await usersAPI.changeMyPassword(formData.old_password, formData.new_password);
            }

            toast.success('Profile updated successfully');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to update profile: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Update Your Profile</DialogTitle>
                    <DialogDescription>
                        Complete your profile information. This helps the school keep your records up to date.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-6 mt-4">
                    {/* Basic Info (Read Only/Edit) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="flex items-center gap-2">
                                <Phone className="h-4 w-4" /> Phone Number
                            </Label>
                            <Input
                                id="phone"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                placeholder="+977 98..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Address
                            </Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Street, City, Province..."
                                className="h-20"
                            />
                        </div>
                    </div>

                    {/* Personal Detail */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dob" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Date of Birth
                            </Label>
                            <Input
                                id="dob"
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Change Password */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Label className="text-base font-semibold">Change Password</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="old_password">Current Password</Label>
                                <Input
                                    id="old_password"
                                    type="password"
                                    value={formData.old_password}
                                    onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new_password">New Password</Label>
                                <Input
                                    id="new_password"
                                    type="password"
                                    value={formData.new_password}
                                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bio" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Bio / About Me
                        </Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us a bit about yourself..."
                            className="h-24"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
