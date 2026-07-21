// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import api from './api';
import {
    LoginCredentials,
    RegisterData,
    LoginResponse,
    RegisterResponse,
    UserProfile,
    UpdateProfileData,
    ChangePasswordData
} from '@/types/auth';
import { setSessionUser, removeTokens, isAuthenticated, getUser } from '@/lib/auth';
import { getTenantFromSubdomain } from '@/lib/tenant';

function setTenantCookie(tenantId: string) {
    if (typeof window === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    const host = (window.location.hostname || '').trim().toLowerCase();
    const useSharedManyaltechDomain =
        tenantId === 'public' && (host === 'manyaltech.com' || host === 'www.manyaltech.com');
    const encodedTenantId = encodeURIComponent(tenantId);
    const secureAttr = isSecure ? 'secure; ' : '';

    if (useSharedManyaltechDomain) {
        // Canonical public SaaS cookie: shared domain only.
        document.cookie = `tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=${encodedTenantId}; path=/; domain=.manyaltech.com; ${secureAttr}samesite=lax`;
    } else {
        // Canonical tenant/local cookie: host-scoped only.
        document.cookie = `tenant_id=; path=/; domain=.manyaltech.com; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        document.cookie = `tenant_id=${encodedTenantId}; path=/; ${secureAttr}samesite=lax`;
    }
}

export const authService = {
    async login(credentials: LoginCredentials & { totp_code?: string }) {
        // Pull school_code out — it's a header, not a POST body field
        const { school_code, totp_code, ...body } = credentials;
        const normalizedBody: Record<string, string> = {
            ...body,
            email: body.email?.trim().toLowerCase(),
            password: body.password,
        };
        // Include TOTP code in body when provided (required for saas_admin 2FA)
        if (totp_code) {
            normalizedBody.totp_code = totp_code;
        }

        // Determine tenant: explicit school_code > subdomain detection > 'public'
        const tenantId = school_code?.trim() ||
            (typeof window !== 'undefined'
                ? (
                    (localStorage.getItem('tenant_id') || '').trim()
                    || getTenantFromSubdomain(window.location.hostname)
                )
                : null) ||
            'public';

        // Keep tenant cache in sync before login so request-level fallbacks can't use stale tenant.
        if (typeof window !== 'undefined') {
            localStorage.setItem('tenant_id', tenantId);
        }

        // Always same-origin (baseURL: '') — the Next.js route handler stores
        // the token pair in httpOnly cookies and strips it from the response.
        const response = await api.post<LoginResponse>('/api/auth/login', normalizedBody, {
            baseURL: '',
            headers: { 'x-tenant-id': tenantId },
        });

        if (response.data.ok) {
            // Cache the non-secret identity payload + school_code so layouts
            // and subsequent requests resolve role/tenant synchronously.
            if (typeof window !== 'undefined') {
                if (response.data.user) {
                    setSessionUser(response.data.user);
                }
                localStorage.setItem('tenant_id', tenantId);
                setTenantCookie(tenantId);
                if (response.data.user?.role) {
                    localStorage.setItem('user_role', response.data.user.role);
                }
            }
        }
        return response.data;
    },

    async register(data: RegisterData) {
        // SaaS Admin registration always goes to the 'public' schema
        const tenantId = 'public';

        const response = await api.post<RegisterResponse>('/api/users/register/', data, {
            headers: { 'x-tenant-id': tenantId },
        });
        return response.data;
    },

    async verifyEmail(uidb64: string, token: string) {
        const response = await api.post('/api/users/verify-email/', { uidb64, token }, {
            headers: { 'x-tenant-id': 'public' },
        });
        return response.data;
    },

    async getProfile() {
        const response = await api.get<UserProfile>('/api/users/accounts/me/');
        return response.data;
    },

    async updateProfile(data: UpdateProfileData) {
        const response = await api.patch<UserProfile>('/api/users/accounts/me/', data);
        return response.data;
    },

    async changePassword(data: ChangePasswordData) {
        const response = await api.post('/api/users/accounts/change-password/', data);
        return response.data;
    },

    logout() {
        // removeTokens clears the client cache and expires the httpOnly
        // cookies via POST /api/auth/logout.
        removeTokens();
    },

    isAuthenticated,
    getUser,
};
