// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
export interface LoginCredentials {
    email: string;
    password: string;
    school_code?: string; // maps to x-tenant-id header
}

export interface RegisterData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role?: 'student' | 'teacher' | 'parent';
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface UserProfile {
    user_id: string; // Updated to match backend 'user_id'
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant?: string; // If exposed
    tenant_features?: Record<string, any>;
}

export interface RegisterResponse {
    message: string;
    verification_required?: boolean;
    user?: UserProfile;
}

export interface LoginResponse {
    // True when the session was established (httpOnly cookies set by the
    // /api/auth/login route handler). Tokens never reach browser JavaScript.
    ok?: boolean;
    user?: {
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        exp?: number;
    };
    // SaaS admin 2FA pre-flight fields (no session established in these cases)
    two_factor_required?: boolean;
    action?: 'setup_2fa' | 'enter_totp';
    message?: string;
}

export interface ChangePasswordData {
    old_password: string;
    new_password: string;
}

export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
    email?: string;
}
