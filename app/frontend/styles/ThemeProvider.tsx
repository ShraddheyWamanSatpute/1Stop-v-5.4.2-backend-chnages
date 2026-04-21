"use client"

import { useState, useMemo, createContext, useContext, type ReactNode, useEffect } from "react"

type ThemeContextType = {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
})

export const useThemeContext = () => useContext(ThemeContext)

interface ThemeProviderProps {
  children: ReactNode
  /**
   * Optional controlled mode. When provided, this provider will sync its internal
   * state to match (useful when the user's preferred theme comes from SettingsContext).
   */
  mode?: "light" | "dark"
}

export const ThemeProvider = ({ children, mode }: ThemeProviderProps) => {
  const [darkMode, setDarkMode] = useState(() => {
    // Prefer controlled mode when provided; otherwise fall back to persisted value.
    if (mode) return mode === "dark"
    const storedMode = localStorage.getItem("theme-mode")
    return storedMode === "dark"
  })

  useEffect(() => {
    localStorage.setItem("theme-mode", darkMode ? "dark" : "light")
  }, [darkMode])

  // Sync internal state when controlled mode changes
  useEffect(() => {
    if (!mode) return
    const next = mode === "dark"
    setDarkMode((prev) => (prev === next ? prev : next))
  }, [mode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const contextValue = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
    }),
    [darkMode],
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}
