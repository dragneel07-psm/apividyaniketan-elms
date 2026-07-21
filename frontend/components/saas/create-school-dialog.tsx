// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useCallback, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { coreAPI, saasApi, SubscriptionPlan } from "@/lib/api";

type CreateTenantPayload = Parameters<typeof coreAPI.createTenant>[0] & {
    admin_email: string;
    password: string;
    admin_first_name: string;
    admin_last_name: string;
    plan_id: string;
    type: string;
};

function getPlanValue(plan: SubscriptionPlan): string {
    return (plan.plan_id || plan.id || '').trim();
}

function resolveTenantTypeFromPlanName(planName: string): 'standard' | 'premium' | 'enterprise' {
    const normalized = planName.trim().toLowerCase();
    if (normalized === 'premium' || normalized.includes('premium')) return 'premium';
    if (normalized === 'enterprise' || normalized.includes('enterprise')) return 'enterprise';
    return 'standard';
}

export function CreateSchoolDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [subdomain, setSubdomain] = useState("");
    const [adminFirstName, setAdminFirstName] = useState("");
    const [adminLastName, setAdminLastName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    const availablePlans = plans.filter((plan) => getPlanValue(plan).length > 0);

    const loadPlans = useCallback(async () => {
        setPlansLoading(true);
        try {
            const data = await saasApi.getPlans();
            const activePlans = (Array.isArray(data) ? data : []).filter((plan) => plan.is_active);
            setPlans(activePlans);
            const firstValidPlanId = activePlans.map(getPlanValue).find((value) => value.length > 0) || '';
            if (!selectedPlanId && firstValidPlanId) {
                setSelectedPlanId(firstValidPlanId);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load subscription plans.");
        } finally {
            setPlansLoading(false);
        }
    }, [selectedPlanId]);

    useEffect(() => {
        if (!open) return;
        loadPlans();
    }, [open, loadPlans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !subdomain || !adminEmail || !adminPassword || !adminFirstName || !adminLastName || !selectedPlanId) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const selectedPlan = plans.find((plan) => getPlanValue(plan) === selectedPlanId);
        if (!selectedPlan) {
            toast.error("Please select a valid subscription type.");
            return;
        }

        setLoading(true);
        try {
            const payload: CreateTenantPayload = {
                name,
                subdomain,
                type: resolveTenantTypeFromPlanName(selectedPlan.name),
                plan_id: getPlanValue(selectedPlan),
                status: 'active',
                admin_email: adminEmail,
                password: adminPassword,
                admin_first_name: adminFirstName,
                admin_last_name: adminLastName,
            };
            await coreAPI.createTenant(payload);

            toast.success("School created successfully!");
            setOpen(false);

            // Notify parent to refresh list immediately
            onCreated();

            // Reset form
            setName("");
            setSubdomain("");
            setAdminEmail("");
            setAdminPassword("");
            setAdminFirstName("");
            setAdminLastName("");
            setSelectedPlanId("");
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Failed to create school.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Onboard New School
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Onboard New School</DialogTitle>
                    <DialogDescription>
                        Create a tenant and provision the first admin user.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                School Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="Greenwood High"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subdomain" className="text-right">
                                School Code
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="subdomain"
                                    value={subdomain}
                                    onChange={(e) => setSubdomain(e.target.value)}
                                    placeholder="e.g. greenwood"
                                />
                                <p className="text-[10px] text-slate-500">
                                    This will be used for logins (e.g. greenwood.domain.com)
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Type
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={plansLoading || availablePlans.length === 0}>
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select subscription type"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availablePlans.map((plan) => (
                                            <SelectItem key={getPlanValue(plan)} value={getPlanValue(plan)}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-slate-500">
                                    School starts with a mandatory 15-day trial on the selected subscription type.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="adminFirstName" className="text-right"> Admin First Name </Label>
                            <Input
                                id="adminFirstName"
                                value={adminFirstName}
                                onChange={(e) => setAdminFirstName(e.target.value)}
                                className="col-span-3"
                                placeholder="John"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="adminLastName" className="text-right"> Admin Last Name </Label>
                            <Input
                                id="adminLastName"
                                value={adminLastName}
                                onChange={(e) => setAdminLastName(e.target.value)}
                                className="col-span-3"
                                placeholder="Doe"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Admin Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="admin@greenwood.edu"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="col-span-3"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                "Create School"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
