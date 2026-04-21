"use client"

import { useEffect, useMemo, useState } from "react"
import { ref, get } from "firebase/database"
import { db } from "../../backend/services/Firebase"
import { useCompany } from "../../backend/context/CompanyContext"
import { debugWarn } from "../../utils/debugLog"

export type StockDecimalPlaces = 1 | 2 | 3

export interface StockSettingsSnapshot {
  stockDecimalPlaces: StockDecimalPlaces
}

/**
 * Lightweight hook for reading stock module settings (site/subsite aware).
 * Kept intentionally small so components can safely format quantities consistently.
 */
export function useStockSettings(): StockSettingsSnapshot {
  const { state: companyState } = useCompany()
  const [stockDecimalPlaces, setStockDecimalPlaces] = useState<StockDecimalPlaces>(2)

  const settingsPath = useMemo(() => {
    if (!companyState.companyID) return null
    let path = `companies/${companyState.companyID}/settings/stock`
    if (companyState.selectedSiteID) {
      path += `/sites/${companyState.selectedSiteID}`
      if (companyState.selectedSubsiteID) {
        path += `/subsites/${companyState.selectedSubsiteID}`
      }
    }
    return path
  }, [companyState.companyID, companyState.selectedSiteID, companyState.selectedSubsiteID])

  useEffect(() => {
    const load = async () => {
      if (!settingsPath) return
      try {
        const snapshot = await get(ref(db, settingsPath))
        if (!snapshot.exists()) return
        const val = snapshot.val() || {}
        const dp = val.stockDecimalPlaces
        if (dp === 1 || dp === 2 || dp === 3) {
          setStockDecimalPlaces(dp)
        }
      } catch (err: any) {
        debugWarn("useStockSettings: failed to load stock settings", err)
      }
    }
    load()
  }, [settingsPath])

  return { stockDecimalPlaces }
}

