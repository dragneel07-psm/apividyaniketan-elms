// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { saasApi, Tenant } from "@/lib/api/saas";

interface ResetPasswordDialogProps {
    tenant: Tenant;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ tenant, open, onOpenChange }: ResetPasswordDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleReset = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            const tenantId = tenant.id || '';
            await saasApi.resetAdminPassword(tenantId, newPassword);
            toast.success(`Admin password for ${tenant.name} has been reset.`);
            setNewPassword("");
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-500" />
                        Reset Admin Password
                    </DialogTitle>
                    <DialogDescription>
                        Set a new administrative password for <strong>{tenant.name}</strong>.
                        This will override the existing school admin credentials.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Secure Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter at least 6 characters"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                            Tip: Users will be forced to log in again with this new password.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleReset} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Password
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
