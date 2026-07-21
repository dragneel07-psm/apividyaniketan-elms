// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import { toast } from 'sonner';

interface SystemConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SystemConfigDialog({ open, onOpenChange }: SystemConfigDialogProps) {
    const [config, setConfig] = useState({
        schoolName: '',
        contactEmail: '',
        maintenanceMode: false,
    });

    useEffect(() => {
        if (open) {
            void loadConfig();
        }
    }, [open]);

    const loadConfig = async () => {
        try {
            const me = await usersAPI.getMe();
            const cachedTenantName = typeof window !== 'undefined' ? localStorage.getItem('tenant_name') : null;
            const tenantSchema = (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null) || me.tenant || 'school';
            setConfig({
                schoolName: (cachedTenantName || '').trim() || tenantSchema,
                contactEmail: me.email || '',
                maintenanceMode: false,
            });
        } catch (error) {
            console.error('Failed to load system configuration:', error);
            toast.error('Failed to load system configuration.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-600" />
                        System Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Review school-level configuration. Platform-wide settings are managed from the SaaS admin portal.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">School Name</Label>
                        <Input
                            id="name"
                            value={config.schoolName}
                            readOnly
                            disabled
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Support Email</Label>
                        <Input
                            id="email"
                            value={config.contactEmail}
                            readOnly
                            disabled
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">System Status</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${config.maintenanceMode ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <span className="text-sm text-slate-600">{config.maintenanceMode ? 'Maintenance Mode' : 'Operational'}</span>
                            <Switch
                                checked={config.maintenanceMode}
                                disabled
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
