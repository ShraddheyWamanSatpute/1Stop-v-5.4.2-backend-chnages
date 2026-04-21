/**
 * Context Dependencies Utility
 * 
 * Ensures contexts load in the correct order:
 * 1. SettingsContext (must load first - provides auth)
 * 2. CompanyContext (must load second - provides company/site data)
 * 3. All other contexts (wait for Settings + Company)
 */

export interface ContextReadiness {
  settingsReady: boolean
  companyReady: boolean
}

/**
 * Check if Settings context is ready
 * OPTIMIZED: Allow rendering with cached data for faster initial load
 */
export const isSettingsReady = (settingsState: any): boolean => {
  // Settings is ready when:
  // 1. Auth is initialized (logged in or confirmed not logged in)
  // 2. Not currently loading OR we have cached user data (for instant UI)
  const hasAuth = settingsState?.auth !== undefined
  const authInitialized = settingsState?.auth?.isLoggedIn !== undefined || settingsState?.auth?.uid === null
  const notLoading = !settingsState?.loading
  const hasCachedData = settingsState?.user !== undefined // Allow rendering with cached data
  
  // Ready if: auth initialized AND (not loading OR has cached data)
  return hasAuth && authInitialized && (notLoading || hasCachedData)
}

/**
 * Check if Company context is ready
 * OPTIMIZED: Allow rendering with cached companyID for faster initial load
 */
export const isCompanyReady = (companyState: any, settingsState?: any): boolean => {
  // Company is ready when:
  // 1. Not currently loading OR we have cached companyID (for instant UI)
  // 2. If user is logged in, companyID should be set (or confirmed not needed)
  // 3. If user is not logged in, that's still "ready"
  if (!companyState) return false
  
  // If user is not logged in, company context is ready (no company needed)
  if (settingsState && !settingsState.auth?.isLoggedIn) {
    return true
  }
  
  // OPTIMIZED: Allow rendering if we have companyID (even if still loading sites)
  // Sites load asynchronously and don't block initial render
  const hasCompanyID = !!companyState.companyID
  const notLoading = !companyState.loading
  
  // Ready if: not loading OR has companyID (cached data allows instant render)
  return notLoading || hasCompanyID
}

/**
 * Check if all dependencies are ready
 */
export const areDependenciesReady = (
  settingsState: any,
  companyState: any
): boolean => {
  return isSettingsReady(settingsState) && isCompanyReady(companyState, settingsState)
}

/**
 * Wait for dependencies with timeout
 */
export const waitForDependencies = async (
  settingsState: any,
  companyState: any,
  timeout: number = 5000
): Promise<boolean> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (areDependenciesReady(settingsState, companyState)) {
      return true
    }
    // Wait 50ms before checking again
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return false
}

