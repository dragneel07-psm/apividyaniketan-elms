// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { gamificationAPI } from "@/lib/api";

export function PrivacyToggle() {
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(true);
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const stats = await gamificationAPI.getMyStats();
                setIsPublic(stats.is_public);
                setProfileId(stats.id);
            } catch (error) {
                console.error("Failed to load gamification stats", error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const handleToggle = async (checked: boolean) => {
        if (!profileId) return;
        setIsPublic(checked); // Optimistic update
        try {
            await gamificationAPI.updateProfile(profileId, { is_public: checked });
            toast.success(checked ? "Profile is now public" : "Profile is now private");
        } catch (error) {
            console.error("Failed to update privacy", error);
            toast.error("Failed to update privacy settings");
            setIsPublic(!checked); // Revert
        }
    };

    if (loading) return <div className="h-6 w-10 bg-white/10 rounded-full animate-pulse" />;

    return (
        <Switch
            checked={isPublic}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-emerald-500"
        />
    );
}
