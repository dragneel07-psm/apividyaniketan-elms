// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Capture 5% of transactions for performance monitoring
    tracesSampleRate: 0.05,

    // Capture 10% of sessions for session replay (only on errors: 100%)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all text and inputs for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Don't send errors in development
    enabled: process.env.NODE_ENV === "production",
  });
}
