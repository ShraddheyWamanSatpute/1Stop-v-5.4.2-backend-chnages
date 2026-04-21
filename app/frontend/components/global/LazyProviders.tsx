import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLazyLoad } from './LazyContextProvider';
import { useSettings } from '../../../backend/context/SettingsContext';
import { useCompany } from '../../../backend/context/CompanyContext';
import BrandedAppLoader from "./BrandedAppLoader"

// Import providers directly for now (we'll optimize further later)
import { HRProvider } from '../../../backend/context/HRContext';
import { BookingsProvider } from '../../../backend/context/BookingsContext';
import { StockProvider } from '../../../backend/context/StockContext';
import { MessengerProvider } from '../../../backend/context/MessengerContext';
import { FinanceProvider } from '../../../backend/context/FinanceContext';
import { AnalyticsProvider } from '../../../backend/context/AnalyticsContext';
import { NotificationsProvider } from '../../../backend/context/NotificationsContext';
import { AssistantProvider } from '../../../backend/context/AssistantContext';
import { DashboardProvider } from '../../../backend/context/DashboardContext';
import { POSProvider } from '../../../backend/context/POSContext';

interface LazyProvidersProps {
  children: ReactNode;
}

export const LazyProviders: React.FC<LazyProvidersProps> = ({ children }) => {
  const location = useLocation();
  const { isLoaded, loadSection } = useLazyLoad();
  
  // Get Settings and Company to check readiness (strict: wait for full load)
  const settings = useSettings();
  const company = useCompany();
  
  // Track if Settings and Company are ready
  const [coreReady, setCoreReady] = useState(false);

  // Check if Settings and Company are ready
  useEffect(() => {
    const isLoggedIn = Boolean(settings.state?.auth?.isLoggedIn);
    // If not logged in, allow app to proceed without Company selection
    const settingsReady = !isLoggedIn ? true : settings.isFullyLoaded === true;
    const companyReady = !isLoggedIn ? true : company.isFullyLoaded === true;
    const ready = settingsReady && companyReady;
    
    // Reduced logging for performance - only log once when ready
    if (ready && !coreReady) {
      setCoreReady(true);
    }
  }, [settings, company, coreReady]);

  const getSectionsForPath = React.useCallback((pathname: string) => {
    const path = String(pathname || "")

    if (path.startsWith("/Dashboard")) return ["analytics", "hr", "stock", "pos", "bookings", "messenger", "finance"]
    if (path.startsWith("/HR")) return ["hr", "bookings", "analytics"]
    if (path.startsWith("/Bookings")) return ["bookings", "analytics"]
    if (path.startsWith("/Stock")) return ["stock", "analytics"]
    if (path.startsWith("/POS")) return ["pos", "analytics"]
    if (path.startsWith("/Finance")) return ["finance"]
    if (path.startsWith("/Messenger")) return ["messenger"]
    if (path.startsWith("/Analytics")) return ["analytics"]

    return []
  }, [])

  // Determine which sections are needed based on current route
  // BUT ONLY AFTER Settings and Company are ready.
  // useLayoutEffect: register sections before paint so we don't flash the full-screen loader
  // (which blocks sidebar navigation) on route changes like Finance → POS.
  useLayoutEffect(() => {
    // CRITICAL: Wait for Settings and Company to be ready before loading ANY sections
    if (!coreReady) {
      return; // Don't load anything until core contexts are ready
    }
    
    // Check if we're on ESS/Mobile routes - these only need HR
    const isESSRoute = location.pathname.startsWith('/ESS/') || location.pathname.startsWith('/Mobile/')
    
    if (isESSRoute) {
      // ESS routes only need HR - don't load other contexts
      loadSection('hr')
      return
    }

    const canSeeHR = (() => {
      try {
        if (Boolean((settings.state.user as any)?.isAdmin)) return true
        const effective = company.getUserPermissions?.()
        const mod = (effective as any)?.modules?.hr
        if (!mod) return false
        return Object.values(mod).some((p: any) => Boolean((p as any)?.view))
      } catch {
        return false
      }
    })()

    const neededSections = getSectionsForPath(location.pathname)
    neededSections.forEach((section) => {
      if (section === "hr" && !canSeeHR) return
      loadSection(section, true)
    })
  }, [coreReady, location.pathname, loadSection, settings.state.user, company.getUserPermissions, getSectionsForPath]);

  const requiredSections = useMemo(() => {
    if (!coreReady) return []

    // Check if we're on ESS/Mobile routes - these only need HR
    const isESSRoute = location.pathname.startsWith('/ESS/') || location.pathname.startsWith('/Mobile/')
    
    if (isESSRoute) {
      // ESS routes only need HR - Settings and Company are already loaded in main.tsx
      return ['hr']
    }

    const sections = new Set<string>(getSectionsForPath(location.pathname))

    // Only require HR if user can see HR pages.
    try {
      const isAdmin = Boolean((settings.state.user as any)?.isAdmin)
      const effective = company.getUserPermissions?.()
      const mod = (effective as any)?.modules?.hr
      const canSeeHR = isAdmin || (mod ? Object.values(mod).some((p: any) => Boolean((p as any)?.view)) : false)
      if (!canSeeHR) sections.delete('hr')
    } catch {
      // ignore
    }

    return Array.from(sections)
  }, [coreReady, location.pathname, settings.state.user, company, getSectionsForPath])

  // If core contexts aren't ready (refresh/boot), show a branded full-screen loader.
  // NotificationsProvider must wrap the loader so GlobalAppBar can use it if it renders
  if (!coreReady) {
    return (
      <NotificationsProvider>
        <BrandedAppLoader />
      </NotificationsProvider>
    );
  }

  // If a route requires module providers that aren't mounted yet, show loader briefly.
  const missingRequired = requiredSections.some((s) => !isLoaded(s))
  if (missingRequired) {
    return (
      <NotificationsProvider>
        <BrandedAppLoader />
      </NotificationsProvider>
    );
  }

  // Conditional provider rendering based on what's loaded
  let wrappedChildren = children;
  
  // ========= IMPORTANT PROVIDER ORDER =========
  // We build `wrappedChildren` by wrapping outward; the LAST wrapper becomes the OUTERMOST provider.
  // AnalyticsProvider uses other module contexts (Finance/HR/Stock/POS/Bookings/Messenger), so it MUST be
  // nested INSIDE those module providers (i.e. module providers should wrap it).
  //
  // DashboardProvider depends on AnalyticsProvider, so DashboardProvider must be nested INSIDE AnalyticsProvider.

  // DashboardProvider must be a CHILD of AnalyticsProvider
  if (isLoaded('analytics')) {
    wrappedChildren = <DashboardProvider>{wrappedChildren}</DashboardProvider>;
    wrappedChildren = <AnalyticsProvider>{wrappedChildren}</AnalyticsProvider>;
  }

  // Module providers must be OUTSIDE AnalyticsProvider
  if (isLoaded('pos')) {
    wrappedChildren = <POSProvider>{wrappedChildren}</POSProvider>;
  }

  if (isLoaded('hr')) {
    wrappedChildren = <HRProvider>{wrappedChildren}</HRProvider>;
  }

  if (isLoaded('bookings')) {
    wrappedChildren = <BookingsProvider>{wrappedChildren}</BookingsProvider>;
  }

  if (isLoaded('stock')) {
    wrappedChildren = <StockProvider>{wrappedChildren}</StockProvider>;
  }

  if (isLoaded('messenger')) {
    wrappedChildren = <MessengerProvider>{wrappedChildren}</MessengerProvider>;
  }

  if (isLoaded('finance')) {
    wrappedChildren = <FinanceProvider>{wrappedChildren}</FinanceProvider>;
  }

  // GlobalAppBar uses useNotifications() unconditionally, so this provider must exist.
  // SettingsProvider wraps LazyProviders in main.tsx, so useSettings() is always available.
  // NotificationsProvider depends on SettingsProvider and CompanyProvider.
  // Render it here so it wraps all the module providers and is available to GlobalAppBar.
  wrappedChildren = <NotificationsProvider>{wrappedChildren}</NotificationsProvider>;

  // Keep AssistantProvider (lightweight) always available
  wrappedChildren = <AssistantProvider>{wrappedChildren}</AssistantProvider>;

  return <>{wrappedChildren}</>;
};
