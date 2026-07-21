// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client"

import { toast as sonnerToast } from "sonner"
import * as React from "react"

export type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
    action?: React.ReactNode
}

export type ToastActionElement = React.ReactNode

export function toast({ title, description, variant, action }: ToastProps) {
    if (variant === "destructive") {
        return sonnerToast.error(title, {
            description,
            action: action as any
        })
    }

    return sonnerToast.success(title, {
        description,
        action: action as any
    })
}

export function useToast() {
    return {
        toast,
        dismiss: (id?: string) => {
            // Sonner doesn't easily dismiss by arbitrary ID from here 
            // but we can just offer it as a no-op or handle it if needed
        }
    }
}
