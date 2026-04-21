/**
 * ESS Route Utilities
 * 
 * Utility functions to handle route paths that work with both /Mobile and /ESS routes
 */

/**
 * IMPORTANT:
 * The Mobile/ESS portal runs under a React Router `basename` ("/Mobile" or "/ESS"),
 * so **all internal navigation should be router-relative** (e.g. "/Dashboard"),
 * not absolute (e.g. "/Mobile/Dashboard"). Building absolute paths here causes
 * duplicate prefixes like "/Mobile/Mobile/Dashboard".
 */
export const getESSBasePath = (): string => {
  return ""
}

/**
 * Gets the full path for an ESS route
 * @param route - The route segment (e.g., "Dashboard", "Schedule")
 * @returns The router-relative path (e.g., "/Dashboard")
 */
export const getESSPath = (route: string): string => {
  const cleanRoute = route.startsWith("/") ? route.slice(1) : route
  return `/${cleanRoute}`
}

/**
 * Gets the dashboard path
 */
export const getESSDashboardPath = (): string => {
  return getESSPath("Dashboard")
}

/**
 * Gets the company select path
 */
export const getESSCompanySelectPath = (): string => {
  return getESSPath("CompanySelect")
}
