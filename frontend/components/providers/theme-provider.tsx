// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => undefined,
})

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  attribute?: string
  disableTransitionOnChange?: boolean
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Script-free theme provider for React 19 / Next 16.
 *
 * `next-themes` injects a script element from a Client Component. React 19
 * rejects that during client rendering, so theme state is applied after
 * hydration instead. The initial light theme is deterministic on server and
 * client, eliminating both the script warning and hydration mismatch.
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  enableSystem = true,
}: ThemeProviderProps) {
  const safeDefault = defaultTheme === "system" && !enableSystem ? "light" : defaultTheme
  const [theme, setThemeState] = React.useState<Theme>(safeDefault)
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    safeDefault === "dark" ? "dark" : "light"
  )

  React.useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "light" || stored === "dark" || (stored === "system" && enableSystem)) {
      setThemeState(stored)
    }
  }, [enableSystem])

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const next = resolveTheme(theme)
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.style.colorScheme = next
      setResolvedTheme(next)
    }
    apply()
    if (theme === "system") media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    const normalized = next === "system" && !enableSystem ? "light" : next
    localStorage.setItem("theme", normalized)
    setThemeState(normalized)
  }, [enableSystem])

  const value = React.useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
