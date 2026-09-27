import React, { useCallback, useMemo } from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const storageKey = "cetus-theme"
const darkQuery = "(prefers-color-scheme: dark)"

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

// The preference lives in localStorage and the OS setting in matchMedia; both
// are external stores. Reading them through useSyncExternalStore keeps the
// server render on "system"/light, lets hydration pick up the real values,
// and derives `resolvedTheme` instead of mirroring it into state from an
// effect. Same-tab writes are announced through `themeListeners`; other tabs
// arrive via the `storage` event.
const themeListeners = new Set<() => void>()

function subscribeToTheme(onChange: () => void) {
  themeListeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    themeListeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(storageKey)
  return isTheme(stored) ? stored : "system"
}

function readServerTheme(): Theme {
  return "system"
}

function subscribeToOsPreference(onChange: () => void) {
  const mq = matchMedia(darkQuery)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

function readOsPrefersDark() {
  return matchMedia(darkQuery).matches
}

function readServerPrefersDark() {
  return false
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    readServerTheme
  )
  const osPrefersDark = React.useSyncExternalStore(
    subscribeToOsPreference,
    readOsPrefersDark,
    readServerPrefersDark
  )
  const resolvedTheme: ThemeContextValue["resolvedTheme"] =
    theme === "dark" || (theme === "system" && osPrefersDark) ? "dark" : "light"

  // Sync class on documentElement when the resolved theme changes
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(storageKey, next)
    for (const listener of themeListeners) {
      listener()
    }
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

      // `key` is typed as string but synthetic events (extensions, password
      // managers, some IMEs) can dispatch keydown without it, so avoid
      // calling methods on it.
      if (event.key !== "d" && event.key !== "D") {
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
