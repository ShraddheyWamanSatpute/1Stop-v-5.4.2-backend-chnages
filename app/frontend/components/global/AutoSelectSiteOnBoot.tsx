import { useEffect, useRef } from "react"
import { useCompany } from "../../../backend/context/CompanyContext"

const AutoSelectSiteOnBoot = () => {
  const { state, autoSelectSiteIfOnlyOne } = useCompany()
  const attemptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!state.companyID) return
    // Avoid repeated attempts for the same company
    const key = `${state.companyID}|${state.selectedSiteID || "none"}|${state.sites?.length || 0}`
    if (attemptedRef.current === key) return
    attemptedRef.current = key

    if (!state.selectedSiteID) {
      autoSelectSiteIfOnlyOne().catch(() => {})
    }
  }, [state.companyID, state.selectedSiteID, state.sites?.length, autoSelectSiteIfOnlyOne])

  return null
}

export default AutoSelectSiteOnBoot

