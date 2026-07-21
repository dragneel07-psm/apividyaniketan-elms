// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { ProfileView } from '@/components/profile/profile-view';

export default function AdminProfilePage() {
    return (
        <div className="relative min-h-screen bg-[#0a0a0c] p-6 lg:p-10">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
            </div>
            <div className="relative z-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight">Your Profile</h1>
                    <p className="text-slate-400">Manage your account settings and security</p>
                </div>
                <ProfileView />
            </div>
        </div>
    );
}
