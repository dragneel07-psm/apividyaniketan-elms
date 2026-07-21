// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
// lib/auth.ts
//
// Auth tokens live in httpOnly cookies set by /api/auth/* route handlers —
// they are intentionally NOT readable from client-side JavaScript. The only
// client-side session state is the non-secret identity payload (role, name,
// expiry) cached at login so layouts can render synchronously.
import { jwtDecode } from "jwt-decode";

export type StaffRole =
    | 'accountant'
    | 'librarian'
    | 'receptionist'
    | 'hr_manager'
    | 'hostel_warden'
    | 'transport_manager'
    | '';

export interface UserPayload {
    user_id: string;
    username: string;
    role: string;
    staff_role: StaffRole;
    email: string;
    first_name: string;
    last_name: string;
    tenant_id: string;
    tenant_schema: string;
    exp: number;
}

const USER_INFO_KEY = 'user_info';
// Legacy keys from the pre-httpOnly flow; still read as a migration fallback
// and always cleared on logout.
const LEGACY_ACCESS_KEY = 'access_token';
const LEGACY_REFRESH_KEY = 'refresh_token';

export const setSessionUser = (user: Partial<UserPayload> & { exp?: number }) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    // The old flow stored tokens here; make sure they cannot linger.
    localStorage.removeItem(LEGACY_ACCESS_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
};

export const getUser = (): UserPayload | null => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(USER_INFO_KEY);
    if (stored) {
        try {
            return JSON.parse(stored) as UserPayload;
        } catch {
            localStorage.removeItem(USER_INFO_KEY);
        }
    }

    // Migration fallback: sessions created before the httpOnly cookie flow
    // still have a decodable token in localStorage.
    const legacyToken = localStorage.getItem(LEGACY_ACCESS_KEY);
    if (legacyToken) {
        try {
            return jwtDecode<UserPayload>(legacyToken);
        } catch {
            return null;
        }
    }
    return null;
};

export const isAuthenticated = (): boolean => {
    const user = getUser();
    if (!user) return false;
    return user.exp * 1000 > Date.now();
};

function clearLegacyCookies() {
    const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const sharedDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.manyaltech.com';
    for (const name of ['access_token', 'refresh_token', 'tenant_id']) {
        document.cookie = `${name}=; path=/; ${expired}`;
        document.cookie = `${name}=; path=/; domain=${sharedDomain}; ${expired}`;
    }
}

/**
 * Ends the session: clears the client-side identity cache, clears any legacy
 * JS-visible cookies, and asks the server to expire the httpOnly cookies.
 * Kept under its historical name because call sites across all layouts use it.
 */
export const removeTokens = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(LEGACY_ACCESS_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('user_role');
    clearLegacyCookies();

    // keepalive lets the request finish even when logout triggers navigation.
    try {
        void fetch('/api/auth/logout', { method: 'POST', keepalive: true });
    } catch {
        // Best effort — middleware redirects to login regardless once cookies expire.
    }
};
