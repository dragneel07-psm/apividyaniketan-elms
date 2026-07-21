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
function useSuppressNextThemesScriptWarning() {
    React.useEffect(() => {
        const originalError = console.error
        console.error = (...args: Parameters<typeof console.error>) => {
            if (typeof args[0] === "string" && args[0].includes("Encountered a script tag while rendering")) {
                return
            }
            originalError(...args)
        }
        return () => {
            console.error = originalError
        }
    }, [])
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    useSuppressNextThemesScriptWarning()
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
