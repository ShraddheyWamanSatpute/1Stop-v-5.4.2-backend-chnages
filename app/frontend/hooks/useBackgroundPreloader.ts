import { useEffect, useRef, useCallback } from 'react';
import { useLazyLoad } from '../components/global/LazyContextProvider';

interface PreloadConfig {
  priority: number;
  delayMs: number;
  dependencies?: string[];
}

const PRELOAD_CONFIGS: Record<string, PreloadConfig> = {
  notifications: { priority: 1, delayMs: 500 }, // High priority
  assistant: { priority: 1, delayMs: 500 }, // High priority
  messenger: { priority: 2, delayMs: 1000 }, // Company-wide communication
  hr: { priority: 3, delayMs: 2000 }, // Common business function
  bookings: { priority: 3, delayMs: 2500 }, // Common business function
  finance: { priority: 4, delayMs: 3000 }, // Less frequently accessed
  stock: { priority: 4, delayMs: 3500 }, // Less frequently accessed
  analytics: { priority: 5, delayMs: 4000 }, // Lowest priority
};

export const useBackgroundPreloader = () => {
  const { loadSection, preloadSection, isLoaded, loadedSections } = useLazyLoad();
  const preloadTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const isPreloading = useRef(false);

  const startBackgroundPreloading = useCallback(() => {
    if (isPreloading.current) return;
    isPreloading.current = true;

    // Reduced logging for background preloader

    // Sort sections by priority
    const sectionsToPreload = Object.entries(PRELOAD_CONFIGS)
      .filter(([section]) => !isLoaded(section))
      .sort(([, a], [, b]) => a.priority - b.priority);

    sectionsToPreload.forEach(([section, config]) => {
      preloadTimeouts.current[section] = setTimeout(() => {
        if (!isLoaded(section)) {
          // Only log priority 1-2 sections to reduce spam
          if (config.priority <= 2) {
            console.log(`📦 Background Preloader: Loading ${section} (priority ${config.priority})`);
          }
          preloadSection(section);
        }
      }, config.delayMs);
    });
  }, [isLoaded, preloadSection]);

  const stopBackgroundPreloading = useCallback(() => {
    Object.values(preloadTimeouts.current).forEach(timeout => clearTimeout(timeout));
    preloadTimeouts.current = {};
    isPreloading.current = false;
    // Reduced logging
  }, []);

  const preloadSectionWithDependencies = useCallback((section: string) => {
    const config = PRELOAD_CONFIGS[section];
    if (!config) return;

    // Load dependencies first if specified
    if (config.dependencies) {
      config.dependencies.forEach(dep => {
        if (!isLoaded(dep)) {
          loadSection(dep);
        }
      });
    }

    // Then load the main section
    if (!isLoaded(section)) {
      setTimeout(() => preloadSection(section), config.delayMs);
    }
  }, [isLoaded, loadSection, preloadSection]);

  const preloadCurrentRouteRelated = useCallback((currentRoute: string) => {
    const routeToSections: Record<string, string[]> = {
      '/HR': ['hr', 'notifications'],
      '/Bookings': ['bookings', 'messenger'],
      '/stock': ['stock', 'analytics'],
      '/Finance': ['finance', 'analytics'],
      '/messenger': ['messenger', 'notifications'],
      '/analytics': ['analytics', 'hr', 'bookings', 'stock', 'finance'],
      '/POS': ['stock', 'analytics'],
    };

    const sectionsToPreload = routeToSections[currentRoute] || [];
    sectionsToPreload.forEach(section => {
      if (!isLoaded(section)) {
        preloadSectionWithDependencies(section);
      }
    });
  }, [isLoaded, preloadSectionWithDependencies]);

  const getPreloadProgress = useCallback(() => {
    const totalSections = Object.keys(PRELOAD_CONFIGS).length;
    const loadedCount = Array.from(loadedSections).filter(section => 
      Object.keys(PRELOAD_CONFIGS).includes(section)
    ).length;
    
    return {
      loaded: loadedCount,
      total: totalSections,
      percentage: Math.round((loadedCount / totalSections) * 100),
    };
  }, [loadedSections]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      stopBackgroundPreloading();
    };
  }, [stopBackgroundPreloading]);

  return {
    startBackgroundPreloading,
    stopBackgroundPreloading,
    preloadSectionWithDependencies,
    preloadCurrentRouteRelated,
    getPreloadProgress,
    isPreloading: isPreloading.current,
  };
};
