// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.

export function describeFallback(
    reason: string | undefined,
    serverError: string | undefined,
): { title: string; description?: string } {
    switch (reason) {
        case 'disabled':
            return {
                title: 'AI is turned off',
                description: 'Your school has disabled AI features. Contact your admin to enable them.',
            };
        case 'not_configured':
            return {
                title: 'AI is not set up',
                description: serverError || 'Ask your admin to add a valid API key in SaaS settings.',
            };
        case 'provider_error':
            return {
                title: 'AI service is unavailable',
                description: 'Showing a basic response. Try again in a minute.',
            };
        default:
            return {
                title: 'Showing a basic response',
                description: serverError,
            };
    }
}
