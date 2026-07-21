// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usersAPI } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ChangePasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    userName: string
}

export function ChangePasswordDialog({
    open,
    onOpenChange,
    userId,
    userName,
}: ChangePasswordDialogProps) {
    const [newPassword, setNewPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPassword) return

        setIsSubmitting(true)
        try {
            await usersAPI.resetUserPassword(userId, newPassword)
            toast.success("Password changed successfully")
            setNewPassword("")
            onOpenChange(false)
        } catch (error: unknown) {
            // Error handling is built into apiRequest, but we catch here to stop loading
            // toast.error(error.message) is redundant if apiRequest handles it generally, 
            // but explicit error handling is safer for UI feedback.
            const message = error instanceof Error ? error.message : "Failed to reset password"
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Enter a new password for <span className="font-semibold">{userName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="text" // Visible text for admin convenience? Or password type? Usually admin sets it so they need to see it.
                                // Let's stick to 'text' for now as requested in similar admin panels often to avoid typos, 
                                // but can switch to 'password' if security is strict. 'text' is better for "Set Password" flow.
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !newPassword}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
