/**
 * Mobile Providers
 * 
 * Lightweight provider wrapper for mobile (ESS) routes.
 * ESS only needs 3 contexts:
 * 1. SettingsProvider (loaded in main.tsx)
 * 2. CompanyProvider (loaded in main.tsx)
 * 3. HRProvider (loaded here)
 * 
 * LazyProviders is route-aware and won't load other contexts (Stock, POS, Bookings, Finance, etc.)
 * for ESS routes, keeping ESS fast and lightweight.
 */

"use client"

import React from "react"
import { HRProvider } from "../app/backend/context/HRContext"

interface MobileProvidersProps {
  children: React.ReactNode
}

const MobileProviders: React.FC<MobileProvidersProps> = ({ children }) => {
  // Only wrap with HRProvider - Settings and Company are already loaded in main.tsx
  // This keeps mobile loading fast by avoiding heavy contexts
  return <HRProvider>{children}</HRProvider>
}

export default MobileProviders
