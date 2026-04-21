import { useMemo } from "react"
import { useLocation } from "react-router-dom"
import { useCompany } from "../../backend/context/CompanyContext"

// Optional context imports - components can pass their own loading states
interface UseSectionLoadingOptions {
  isLoading?: boolean
  dataLoaded?: boolean
  posLoading?: boolean
  hrLoading?: boolean
  financeLoading?: boolean
  stockLoading?: boolean
}

/**
 * Hook to detect if a section's UI/data is not yet loaded
 * Returns loading state and section information for use with SectionLoadingScreen
 */
export const useSectionLoading = (options: UseSectionLoadingOptions = {}) => {
  const location = useLocation()
  const { state: companyState } = useCompany()

  // Detect section from route
  const section = useMemo(() => {
    const path = location.pathname.toLowerCase()
    
    if (path.includes("/pos/")) return "pos"
    if (path.includes("/hr/")) return "hr"
    if (path.includes("/finance/")) return "finance"
    if (path.includes("/stock/")) return "stock"
    if (path.includes("/company/")) return "company"
    if (path.includes("/bookings/")) return "bookings"
    if (path.includes("/analytics")) return "analytics"
    if (path.includes("/messenger")) return "messenger"
    if (path.includes("/settings")) return "settings"
    if (path.includes("/supply/")) return "supply"
    if (path.includes("/admin")) return "admin"
    
    // Fallback: extract first segment
    const segments = path.split("/").filter(Boolean)
    return segments.length > 0 ? segments[0] : "dashboard"
  }, [location.pathname])

  // Determine if loading based on multiple conditions
  const isLoading = useMemo(() => {
    // Check explicit loading flags
    if (options.isLoading !== undefined) {
      return options.isLoading
    }

    // Check data loaded flag
    if (options.dataLoaded === false) {
      return true
    }

    // Check section-specific loading states
    if (section === "pos" && options.posLoading !== undefined) {
      return options.posLoading
    }
    if (section === "hr" && options.hrLoading !== undefined) {
      return options.hrLoading
    }
    if (section === "finance" && options.financeLoading !== undefined) {
      return options.financeLoading
    }
    if (section === "stock" && options.stockLoading !== undefined) {
      return options.stockLoading
    }

    // Check company context loading state (for sections that depend on company data)
    if (companyState.loading) {
      return true
    }

    // Check if company ID or site ID is missing (data not ready)
    if (section !== "admin" && section !== "dashboard") {
      if (!companyState.companyID || !companyState.selectedSiteID) {
        return true
      }
    }

    return false
  }, [
    options.isLoading,
    options.dataLoaded,
    options.posLoading,
    options.hrLoading,
    options.financeLoading,
    options.stockLoading,
    companyState.loading,
    companyState.companyID,
    companyState.selectedSiteID,
    section,
  ])

  return {
    isLoading,
    section,
  }
}
