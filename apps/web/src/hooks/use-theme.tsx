import React, { useCallback, useMemo } from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const storageKey = "cetus-theme"

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    "light"
  )

  // On mount, read persisted preference
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored)
    }
  }, [])

  // Sync class on documentElement when theme changes
  React.useEffect(() => {
    const isDark =
      theme === "dark" ||
      (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
    const next = isDark ? "dark" : "light"
    document.documentElement.classList.toggle("dark", isDark)
    setResolvedTheme(next)
  }, [theme])

  // Listen to OS preference changes when theme is "system"
  React.useEffect(() => {
    if (theme !== "system") {
      return
    }

    const mq = matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const isDark = e.matches
      document.documentElement.classList.toggle("dark", isDark)
      setResolvedTheme(isDark ? "dark" : "light")
    }

    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(storageKey, next)
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ resolvedTheme, setTheme, theme }),
    [resolvedTheme, setTheme, theme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <ThemeHotkey />
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = React.use(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}
