// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tenant } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ManageFeaturesDialogProps {
    tenant: Tenant;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: () => void;
}

export function ManageFeaturesDialog({ tenant, open, onOpenChange, onUpdated }: ManageFeaturesDialogProps) {
    // Initialize feature toggles safely
    const initialFeatures = tenant.features || {};
    const features: Record<string, boolean> = {
        student_ai_chatbot: initialFeatures.student_ai_chatbot ?? false,
        student_gamification: initialFeatures.student_gamification ?? false,
        parent_attendance: initialFeatures.parent_attendance ?? false,
        parent_fees: initialFeatures.parent_fees ?? false,
        teacher_ai_grading: initialFeatures.teacher_ai_grading ?? false,
        teacher_reports: initialFeatures.teacher_reports ?? false,
    };

    const handleClose = () => {
        toast.info("These capabilities are plan-entitled and read-only from this screen.");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Features: {tenant.name}</DialogTitle>
                    <DialogDescription>
                        Enable or disable specific platform modules for this school.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Students */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Student Features (Plan-Controlled)</h4>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="s_ai" className="flex flex-col space-y-1">
                                <span>AI Chatbot Tutor</span>
                                <span className="font-normal text-xs text-slate-500">Allow students to chat with the AI assistant.</span>
                            </Label>
                            <Switch id="s_ai" checked={features.student_ai_chatbot} disabled />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="s_game" className="flex flex-col space-y-1">
                                <span>Gamification</span>
                                <span className="font-normal text-xs text-slate-500">Enable points, badges, and leaderboards.</span>
                            </Label>
                            <Switch id="s_game" checked={features.student_gamification} disabled />
                        </div>
                    </div>

                    {/* Teachers */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Teacher Features (Plan-Controlled)</h4>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="t_ai" className="flex flex-col space-y-1">
                                <span>AI Auto-Grading</span>
                                <span className="font-normal text-xs text-slate-500">Allow teachers to automate exam grading via AI.</span>
                            </Label>
                            <Switch id="t_ai" checked={features.teacher_ai_grading} disabled />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="t_rep" className="flex flex-col space-y-1">
                                <span>Advanced Reports</span>
                                <span className="font-normal text-xs text-slate-500">Access to predictive analytics graphs in dashboard.</span>
                            </Label>
                            <Switch id="t_rep" checked={features.teacher_reports} disabled />
                        </div>
                    </div>

                    {/* Parents */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Parent Portal Features (Plan-Controlled)</h4>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="p_att" className="flex flex-col space-y-1">
                                <span>View Attendance</span>
                                <span className="font-normal text-xs text-slate-500">Allow parents to view daily attendance logs.</span>
                            </Label>
                            <Switch id="p_att" checked={features.parent_attendance} disabled />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="p_fee" className="flex flex-col space-y-1">
                                <span>Fee Management</span>
                                <span className="font-normal text-xs text-slate-500">Show fee tracking and payment history to parents.</span>
                            </Label>
                            <Switch id="p_fee" checked={features.parent_fees} disabled />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handleClose}>
                        Plan-Controlled
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
