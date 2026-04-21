// Session persistence utilities for optimized app loading

export interface SessionState {
  companyID?: string;
  companyName?: string;
  selectedSiteID?: string;
  selectedSiteName?: string;
  selectedSubsiteID?: string;
  selectedSubsiteName?: string;
  companySelections?: Record<string, {
    companyName?: string;
    selectedSiteID?: string;
    selectedSiteName?: string;
    selectedSubsiteID?: string;
    selectedSubsiteName?: string;
    cachedSites?: any[];
    sitesCacheTimestamp?: number;
  }>;
  lastAccessedRoute?: string;
  userPreferences?: {
    theme?: 'light' | 'dark';
    language?: string;
  };
  timestamp?: number;
  cachedSites?: any[]; // Cache sites for instant loading
  sitesCacheTimestamp?: number; // When sites were cached
}

const SESSION_STORAGE_KEY = 'app_session_state';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export class SessionPersistence {
  static setActiveCompany(companyID?: string, companyName?: string): void {
    try {
      const existingState = this.getSessionState();
      const scopedSelection = companyID ? existingState.companySelections?.[companyID] : undefined;
      const nextState: SessionState = {
        ...existingState,
        companyID: companyID || undefined,
        companyName: companyName || scopedSelection?.companyName || undefined,
        selectedSiteID: scopedSelection?.selectedSiteID,
        selectedSiteName: scopedSelection?.selectedSiteName,
        selectedSubsiteID: scopedSelection?.selectedSubsiteID,
        selectedSubsiteName: scopedSelection?.selectedSubsiteName,
        cachedSites: scopedSelection?.cachedSites,
        sitesCacheTimestamp: scopedSelection?.sitesCacheTimestamp,
        timestamp: Date.now(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextState));

      if (companyID) {
        localStorage.setItem('companyID', companyID);
        localStorage.setItem('selectedCompanyID', companyID);
      } else {
        localStorage.removeItem('companyID');
        localStorage.removeItem('selectedCompanyID');
      }

      if (nextState.companyName) localStorage.setItem('selectedCompanyName', nextState.companyName);
      else localStorage.removeItem('selectedCompanyName');

      if (nextState.selectedSiteID) localStorage.setItem('selectedSiteID', nextState.selectedSiteID);
      else localStorage.removeItem('selectedSiteID');

      if (nextState.selectedSiteName) localStorage.setItem('selectedSiteName', nextState.selectedSiteName);
      else localStorage.removeItem('selectedSiteName');

      if (nextState.selectedSubsiteID) localStorage.setItem('selectedSubsiteID', nextState.selectedSubsiteID);
      else localStorage.removeItem('selectedSubsiteID');

      if (nextState.selectedSubsiteName) localStorage.setItem('selectedSubsiteName', nextState.selectedSubsiteName);
      else localStorage.removeItem('selectedSubsiteName');
    } catch (error) {
      console.warn('Failed to set active company:', error);
    }
  }

  static saveSessionState(state: Partial<SessionState>): void {
    try {
      const existingState = this.getSessionState();
      const activeCompanyID =
        state.companyID !== undefined
          ? state.companyID || undefined
          : existingState.companyID || undefined;
      const nextCompanySelections = { ...(existingState.companySelections || {}) };

      if (activeCompanyID) {
        const currentSelection = { ...(nextCompanySelections[activeCompanyID] || {}) };

        if ("companyName" in state) {
          if (state.companyName) currentSelection.companyName = state.companyName;
          else delete currentSelection.companyName;
        }
        if ("selectedSiteID" in state) {
          if (state.selectedSiteID) currentSelection.selectedSiteID = state.selectedSiteID;
          else delete currentSelection.selectedSiteID;
        }
        if ("selectedSiteName" in state) {
          if (state.selectedSiteName) currentSelection.selectedSiteName = state.selectedSiteName;
          else delete currentSelection.selectedSiteName;
        }
        if ("selectedSubsiteID" in state) {
          if (state.selectedSubsiteID) currentSelection.selectedSubsiteID = state.selectedSubsiteID;
          else delete currentSelection.selectedSubsiteID;
        }
        if ("selectedSubsiteName" in state) {
          if (state.selectedSubsiteName) currentSelection.selectedSubsiteName = state.selectedSubsiteName;
          else delete currentSelection.selectedSubsiteName;
        }
        if ("cachedSites" in state) {
          if (Array.isArray(state.cachedSites)) currentSelection.cachedSites = state.cachedSites;
          else delete currentSelection.cachedSites;
        }
        if ("sitesCacheTimestamp" in state) {
          if (typeof state.sitesCacheTimestamp === "number") currentSelection.sitesCacheTimestamp = state.sitesCacheTimestamp;
          else delete currentSelection.sitesCacheTimestamp;
        }

        if (Object.keys(currentSelection).length > 0) {
          nextCompanySelections[activeCompanyID] = currentSelection;
        } else {
          delete nextCompanySelections[activeCompanyID];
        }
      }

      const newState: SessionState = {
        ...existingState,
        ...state,
        companyID: activeCompanyID,
        companySelections: nextCompanySelections,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
      
      // Also save individual keys for backward compatibility
      if ("companyID" in state) {
        if (state.companyID) {
          localStorage.setItem('companyID', state.companyID);
          localStorage.setItem('selectedCompanyID', state.companyID);
        } else {
          localStorage.removeItem('companyID');
          localStorage.removeItem('selectedCompanyID');
        }
      }
      if ("companyName" in state) {
        if (state.companyName) localStorage.setItem('selectedCompanyName', state.companyName);
        else localStorage.removeItem('selectedCompanyName');
      }
      if ("selectedSiteID" in state) {
        if (state.selectedSiteID) localStorage.setItem('selectedSiteID', state.selectedSiteID);
        else localStorage.removeItem('selectedSiteID');
      }
      if ("selectedSiteName" in state) {
        if (state.selectedSiteName) localStorage.setItem('selectedSiteName', state.selectedSiteName);
        else localStorage.removeItem('selectedSiteName');
      }
      if ("selectedSubsiteID" in state) {
        if (state.selectedSubsiteID) localStorage.setItem('selectedSubsiteID', state.selectedSubsiteID);
        else localStorage.removeItem('selectedSubsiteID');
      }
      if ("selectedSubsiteName" in state) {
        if (state.selectedSubsiteName) localStorage.setItem('selectedSubsiteName', state.selectedSubsiteName);
        else localStorage.removeItem('selectedSubsiteName');
      }
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  }

  static getSessionState(): SessionState {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored) as SessionState;
        
        // Check if session is not expired
        if (state.timestamp && Date.now() - state.timestamp < SESSION_TIMEOUT) {
          return this.hydrateActiveCompanySelection(state);
        }
      }
      
      // Fallback to individual localStorage keys for migration
      return this.migrateLegacySession();
    } catch (error) {
      console.warn('Failed to get session state:', error);
      return this.migrateLegacySession();
    }
  }

  private static migrateLegacySession(): SessionState {
    try {
      return this.hydrateActiveCompanySelection({
        companyID: localStorage.getItem('companyID') || localStorage.getItem('selectedCompanyID') || undefined,
        companyName: localStorage.getItem('selectedCompanyName') || undefined,
        selectedSiteID: localStorage.getItem('selectedSiteID') || undefined,
        selectedSiteName: localStorage.getItem('selectedSiteName') || undefined,
        selectedSubsiteID: localStorage.getItem('selectedSubsiteID') || undefined,
        selectedSubsiteName: localStorage.getItem('selectedSubsiteName') || undefined,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Failed to migrate legacy session:', error);
      return {};
    }
  }

  private static hydrateActiveCompanySelection(state: SessionState): SessionState {
    const activeCompanyID = state.companyID;
    if (!activeCompanyID) return state;

    const scopedSelection = state.companySelections?.[activeCompanyID];
    if (!scopedSelection) return state;

    return {
      ...state,
      companyName: state.companyName || scopedSelection.companyName,
      selectedSiteID: state.selectedSiteID || scopedSelection.selectedSiteID,
      selectedSiteName: state.selectedSiteName || scopedSelection.selectedSiteName,
      selectedSubsiteID: state.selectedSubsiteID || scopedSelection.selectedSubsiteID,
      selectedSubsiteName: state.selectedSubsiteName || scopedSelection.selectedSubsiteName,
      cachedSites: state.cachedSites || scopedSelection.cachedSites,
      sitesCacheTimestamp: state.sitesCacheTimestamp || scopedSelection.sitesCacheTimestamp,
    };
  }

  static clearSessionState(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      // Also clear individual keys
      localStorage.removeItem('companyID');
      localStorage.removeItem('selectedCompanyID');
      localStorage.removeItem('selectedCompanyName');
      localStorage.removeItem('selectedSiteID');
      localStorage.removeItem('selectedSiteName');
      localStorage.removeItem('selectedSubsiteID');
      localStorage.removeItem('selectedSubsiteName');
    } catch (error) {
      console.warn('Failed to clear session state:', error);
    }
  }

  /**
   * Clear site/subsite selection (both structured session state and legacy keys).
   * Use this when changing company to avoid mixing selections between companies.
   */
  static clearLocationSelection(): void {
    try {
      const existingState = this.getSessionState()
      const nextState: SessionState = { ...existingState }
      const activeCompanyID = nextState.companyID
      delete nextState.selectedSiteID
      delete nextState.selectedSiteName
      delete nextState.selectedSubsiteID
      delete nextState.selectedSubsiteName
      if (activeCompanyID && nextState.companySelections?.[activeCompanyID]) {
        const scopedSelection = { ...nextState.companySelections[activeCompanyID] }
        delete scopedSelection.selectedSiteID
        delete scopedSelection.selectedSiteName
        delete scopedSelection.selectedSubsiteID
        delete scopedSelection.selectedSubsiteName
        nextState.companySelections = { ...(nextState.companySelections || {}) }
        if (Object.keys(scopedSelection).length > 0) {
          nextState.companySelections[activeCompanyID] = scopedSelection
        } else {
          delete nextState.companySelections[activeCompanyID]
        }
      }
      nextState.timestamp = Date.now()
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextState))

      localStorage.removeItem('selectedSiteID')
      localStorage.removeItem('selectedSiteName')
      localStorage.removeItem('selectedSubsiteID')
      localStorage.removeItem('selectedSubsiteName')
    } catch (error) {
      console.warn('Failed to clear location selection:', error)
    }
  }

  /**
   * Clear cached sites for instant loading (forces a reload for the next company).
   */
  static clearSitesCache(): void {
    try {
      const existingState = this.getSessionState()
      const nextState: SessionState = { ...existingState }
      const activeCompanyID = nextState.companyID
      delete (nextState as any).cachedSites
      delete (nextState as any).sitesCacheTimestamp
      if (activeCompanyID && nextState.companySelections?.[activeCompanyID]) {
        const scopedSelection = { ...nextState.companySelections[activeCompanyID] }
        delete scopedSelection.cachedSites
        delete scopedSelection.sitesCacheTimestamp
        nextState.companySelections = { ...(nextState.companySelections || {}) }
        if (Object.keys(scopedSelection).length > 0) {
          nextState.companySelections[activeCompanyID] = scopedSelection
        } else {
          delete nextState.companySelections[activeCompanyID]
        }
      }
      nextState.timestamp = Date.now()
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextState))
    } catch (error) {
      console.warn('Failed to clear sites cache:', error)
    }
  }

  static updateLastAccessedRoute(route: string): void {
    this.saveSessionState({ lastAccessedRoute: route });
  }

  static shouldAutoRedirect(): { route: string } | null {
    const state = this.getSessionState();
    if (state.lastAccessedRoute && state.companyID) {
      // Only redirect to business routes if we have a company context
      const businessRoutes = ['/HR', '/Bookings', '/Stock', '/Finance', '/POS', '/Analytics', '/Messenger'];
      if (businessRoutes.some(route => state.lastAccessedRoute?.startsWith(route))) {
        return { route: state.lastAccessedRoute };
      }
    }
    return null;
  }

  static isSessionValid(): boolean {
    const state = this.getSessionState();
    return !!(state.companyID && state.timestamp && Date.now() - state.timestamp < SESSION_TIMEOUT);
  }

  static getCompanyHierarchy(): { companyID?: string; siteID?: string; subsiteID?: string } {
    const state = this.getSessionState();
    return {
      companyID: state.companyID,
      siteID: state.selectedSiteID,
      subsiteID: state.selectedSubsiteID,
    };
  }

  static cacheSites(companyID: string, sites: any[]): void {
    try {
      // OPTIMIZED: Cache minimal site data with subsites (ID, name only) to avoid localStorage quota issues
      // Include subsites but only with minimal fields (ID, name) - needed for SubsiteDropdown
      const minimalSites = sites.map(site => {
        const minimalSite: any = {
          siteID: site.siteID,
          name: site.name,
          companyID: site.companyID,
        };
        
        // Include subsites but only with minimal data (ID and name)
        // This is needed for SubsiteDropdown to work with cached data
        if (site.subsites && typeof site.subsites === 'object') {
          const minimalSubsites: Record<string, any> = {};
          Object.entries(site.subsites).forEach(([subsiteId, subsiteData]: [string, any]) => {
            if (subsiteData && typeof subsiteData === 'object') {
              minimalSubsites[subsiteId] = {
                subsiteID: subsiteId,
                name: subsiteData.name || '',
                // Only include essential fields - exclude address, data, teams, etc.
              };
            }
          });
          if (Object.keys(minimalSubsites).length > 0) {
            minimalSite.subsites = minimalSubsites;
          }
        }
        
        return minimalSite;
      });
      
      const existingState = this.getSessionState();
      const nextCompanySelections = { ...(existingState.companySelections || {}) };
      const scopedSelection = {
        ...(nextCompanySelections[companyID] || {}),
        cachedSites: minimalSites,
        sitesCacheTimestamp: Date.now(),
      };
      nextCompanySelections[companyID] = scopedSelection;
      const newState: SessionState = {
        ...existingState,
        cachedSites: minimalSites, // Store only minimal data
        sitesCacheTimestamp: Date.now(),
        companyID: companyID,
        companySelections: nextCompanySelections,
      };
      
      const stateString = JSON.stringify(newState);
      // Check size before storing (localStorage limit is ~5-10MB)
      if (stateString.length > 4 * 1024 * 1024) { // 4MB warning
        console.warn('⚠️ Session state is large, clearing old cache data');
        // Clear old cached data if too large
        newState.cachedSites = minimalSites.slice(0, 10); // Keep only first 10 sites
      }
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing old cache and retrying with minimal data');
        // Clear old cache and try again with minimal data only (including subsites)
        try {
          const minimalSites = sites.slice(0, 10).map(site => {
            const minimalSite: any = {
              siteID: site.siteID,
              name: site.name,
              companyID: site.companyID,
            };
            
            // Include subsites with minimal data
            if (site.subsites && typeof site.subsites === 'object') {
              const minimalSubsites: Record<string, any> = {};
              Object.entries(site.subsites).forEach(([subsiteId, subsiteData]: [string, any]) => {
                if (subsiteData && typeof subsiteData === 'object') {
                  minimalSubsites[subsiteId] = {
                    subsiteID: subsiteId,
                    name: subsiteData.name || '',
                  };
                }
              });
              if (Object.keys(minimalSubsites).length > 0) {
                minimalSite.subsites = minimalSubsites;
              }
            }
            
            return minimalSite;
          });
          const existingState = this.getSessionState();
          const nextCompanySelections = { ...(existingState.companySelections || {}) };
          nextCompanySelections[companyID] = {
            ...(nextCompanySelections[companyID] || {}),
            cachedSites: minimalSites,
            sitesCacheTimestamp: Date.now(),
          };
          const newState: SessionState = {
            ...existingState,
            cachedSites: minimalSites,
            sitesCacheTimestamp: Date.now(),
            companyID: companyID,
            companySelections: nextCompanySelections,
          };
          // Remove other large cached data
          delete (newState as any).cachedSites;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
        } catch (retryError) {
          console.warn('Failed to cache sites even with minimal data:', retryError);
        }
      } else {
        console.warn('Failed to cache sites:', error);
      }
    }
  }

  static getCachedSites(companyID: string): any[] | null {
    try {
      const state = this.getSessionState();
      const scopedSelection = state.companySelections?.[companyID];
      if (
        scopedSelection?.cachedSites &&
        scopedSelection.sitesCacheTimestamp &&
        Date.now() - scopedSelection.sitesCacheTimestamp < 24 * 60 * 60 * 1000
      ) {
        return scopedSelection.cachedSites;
      }
      // OPTIMIZED: Use cached sites even if slightly old (24 hours) for instant loading
      // Firebase will refresh in background, but we want instant UI
      if (state.cachedSites && 
          state.companyID === companyID && 
          state.sitesCacheTimestamp && 
          Date.now() - state.sitesCacheTimestamp < 24 * 60 * 60 * 1000) { // 24 hours instead of 5 minutes
        return state.cachedSites;
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cached sites:', error);
      return null;
    }
  }
}
