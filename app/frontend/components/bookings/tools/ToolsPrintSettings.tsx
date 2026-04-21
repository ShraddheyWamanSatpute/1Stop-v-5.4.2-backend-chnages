"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface PrintSettings {
  // Place Cards Settings
  placeCardsPerPage: number // 3, 4, 6, 9, etc.
  placeCardLogoUrl: string
  placeCardTextColor: string
  placeCardBorderColor: string
  placeCardBackgroundColor: string
  
  // Runsheet Settings
  runsheetHeaderColor: string
  runsheetTextColor: string
  runsheetBorderColor: string
  runsheetLogoUrl: string
  runsheetFontSize: number
  
  // Preorder Settings
  preorderHeaderColor: string
  preorderTextColor: string
  preorderBorderColor: string
  preorderLogoUrl: string
  preorderFontSize: number
  
  // General Print Settings
  showHeaders: boolean
  showLogos: boolean
  pageSize: "A4" | "Letter"
  margin: number
}

const defaultSettings: PrintSettings = {
  placeCardsPerPage: 3,
  placeCardLogoUrl: "/images/piano-works-logo.png",
  placeCardTextColor: "#000000",
  placeCardBorderColor: "#000000",
  placeCardBackgroundColor: "#FFFFFF",
  runsheetHeaderColor: "#1976d2",
  runsheetTextColor: "#000000",
  runsheetBorderColor: "#333333",
  runsheetLogoUrl: "/images/piano-works-logo.png",
  runsheetFontSize: 12,
  preorderHeaderColor: "#1976d2",
  preorderTextColor: "#000000",
  preorderBorderColor: "#333333",
  preorderLogoUrl: "/images/piano-works-logo.png",
  preorderFontSize: 12,
  showHeaders: true,
  showLogos: true,
  pageSize: "A4",
  margin: 10,
}

interface PrintSettingsContextType {
  settings: PrintSettings
  updateSettings: (updates: Partial<PrintSettings>) => void
  resetSettings: () => void
}

const PrintSettingsContext = createContext<PrintSettingsContextType | undefined>(undefined)

export const PrintSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PrintSettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem("bookings-tools-print-settings")
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  useEffect(() => {
    // Save to localStorage whenever settings change
    localStorage.setItem("bookings-tools-print-settings", JSON.stringify(settings))
  }, [settings])

  const updateSettings = (updates: Partial<PrintSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem("bookings-tools-print-settings")
  }

  return (
    <PrintSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </PrintSettingsContext.Provider>
  )
}

export const usePrintSettings = () => {
  const context = useContext(PrintSettingsContext)
  if (!context) {
    throw new Error("usePrintSettings must be used within PrintSettingsProvider")
  }
  return context
}

