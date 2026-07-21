// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// React 19 warns on any <script> tag rendered inside a component tree.
// next-themes intentionally renders one to set the theme class before paint
// (avoids a flash of the wrong theme) — it executes correctly during SSR,
// the warning is a known false positive for this specific case:
// https://github.com/pacocoursey/next-themes/issues/387
//
// This must run at module-eval time, not inside a useEffect: the warning
// fires during React's render/reconciliation pass (when it encounters the
// <script> element), which happens before any effect from that same render
// gets a chance to run. Module evaluation always precedes rendering, so
// patching here — once, guarded against duplicate wraps on Fast Refresh —
// is early enough to actually catch it.
const SCRIPT_WARNING_SUBSTRING = "Encountered a script tag while rendering"
type PatchedConsoleError = typeof console.error & { __nextThemesScriptWarningPatched?: boolean }

if (typeof window !== "undefined" && !(console.error as PatchedConsoleError).__nextThemesScriptWarningPatched) {
    const originalError = console.error
    const patched: PatchedConsoleError = (...args: Parameters<typeof console.error>) => {
        if (typeof args[0] === "string" && args[0].includes(SCRIPT_WARNING_SUBSTRING)) {
            return
        }
        originalError(...args)
    }
    patched.__nextThemesScriptWarningPatched = true
    console.error = patched
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
