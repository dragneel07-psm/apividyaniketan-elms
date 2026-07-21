// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { AlertTriangle, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { saasApi, Tenant } from "@/lib/api/saas";

interface DeleteTenantDialogProps {
    tenant: Tenant;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after successful deletion (e.g. to refresh the list). If not provided, navigates to /saas/schools. */
    onDeleted?: () => void;
}

export function DeleteTenantDialog({ tenant, open, onOpenChange, onDeleted }: DeleteTenantDialogProps) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const reset = () => {
        setPassword('');
        setShowPassword(false);
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) reset();
        onOpenChange(value);
    };

    const handleDelete = async () => {
        if (!password) {
            toast.error('Please enter your password to confirm.');
            return;
        }

        setIsDeleting(true);
        try {
            const tenantId = String(tenant.id || tenant.tenant_id || '');
            await saasApi.deleteTenant(tenantId, password);
            toast.success(`"${tenant.name}" has been permanently deleted.`);
            onOpenChange(false);
            reset();
            if (onDeleted) {
                onDeleted();
            } else {
                router.push('/saas/schools');
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to delete tenant.';
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                        Delete Tenant
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-3 pt-1">
                            <div className="flex gap-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-red-700 dark:text-red-300">
                                    <p className="font-semibold">This action is permanent and cannot be undone.</p>
                                    <p className="mt-1 text-red-600 dark:text-red-400">
                                        All data for <strong>{tenant.name}</strong> — including students, lessons,
                                        results, and billing records — will be permanently erased.
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">
                                Enter your SaaS admin password to confirm deletion.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-3">
                    <div className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Tenant: </span>
                        <span className="font-semibold text-slate-800 dark:text-white">{tenant.name}</span>
                        <span className="ml-2 text-xs font-mono text-slate-400">({tenant.subdomain})</span>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="delete-confirm-password">Your Password</Label>
                        <div className="relative">
                            <Input
                                id="delete-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') void handleDelete(); }}
                                placeholder="Enter your SaaS admin password"
                                className="pr-10"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || !password}
                    >
                        {isDeleting
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
                            : <><Trash2 className="mr-2 h-4 w-4" />Delete Permanently</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
