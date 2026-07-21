// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
// ─── Color Palette ────────────────────────────────────────────
export const Colors = {
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    primaryLight: '#818cf8',
    primarySurface: '#eef2ff',

    secondary: '#7c3aed',
    accent: '#06b6d4',

    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',

    // Neutrals
    gray50: '#f8fafc',
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray300: '#cbd5e1',
    gray400: '#94a3b8',
    gray500: '#64748b',
    gray600: '#475569',
    gray700: '#334155',
    gray800: '#1e293b',
    gray900: '#0f172a',

    white: '#ffffff',
    black: '#000000',

    // Dark mode
    dark: {
        bg: '#0f172a',
        surface: '#1e293b',
        border: '#334155',
        text: '#f1f5f9',
        textMuted: '#94a3b8',
    },

    // Subject colors
    subjects: [
        '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
        '#ea580c', '#d97706', '#16a34a', '#0891b2',
    ],
};

// ─── Typography ───────────────────────────────────────────────
export const Typography = {
    h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '700' as const },
    h4: { fontSize: 18, fontWeight: '600' as const },
    h5: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
    label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
};

// ─── Spacing ──────────────────────────────────────────────────
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

// ─── Border Radius ─────────────────────────────────────────────
export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};

// ─── Shadows ──────────────────────────────────────────────────
export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    lg: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
};
