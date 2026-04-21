import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

declare global {
  interface Window {
    lazyLoadedSections?: Set<string>;
  }
}

interface LazyLoadState {
  loadedSections: Set<string>;
  loadingSections: Set<string>;
  preloadQueue: string[];
}

interface LazyContextType {
  loadedSections: Set<string>;
  loadingSections: Set<string>;
  isLoaded: (section: string) => boolean;
  isLoading: (section: string) => boolean;
  loadSection: (section: string, sync?: boolean) => Promise<void> | void;
  preloadSection: (section: string) => void;
  clearSection: (section: string) => void;
}

const LazyContext = createContext<LazyContextType | undefined>(undefined);

export const useLazyLoad = () => {
  const context = useContext(LazyContext);
  if (!context) {
    throw new Error('useLazyLoad must be used within a LazyContextProvider');
  }
  return context;
};

interface LazyContextProviderProps {
  children: ReactNode;
}

export const LazyContextProvider: React.FC<LazyContextProviderProps> = ({ children }) => {
  // Initialize state immediately - no delays, instant setup
  const [state, setState] = useState<LazyLoadState>(() => ({
    loadedSections: new Set(['settings', 'company', 'assistant', 'notifications']), // Core functionality always loaded instantly
    loadingSections: new Set(),
    preloadQueue: [],
  }));

  const isLoaded = useCallback((section: string) => {
    return state.loadedSections.has(section);
  }, [state.loadedSections]);

  const isLoading = useCallback((section: string) => {
    return state.loadingSections.has(section);
  }, [state.loadingSections]);

  const loadSection = useCallback((section: string, sync: boolean = false): Promise<void> | void => {
    if (state.loadedSections.has(section) || state.loadingSections.has(section)) {
      return;
    }

    // Critical sections (like current route sections) should load immediately 
    const criticalSections = ['hr', 'bookings', 'stock', 'finance', 'messenger', 'analytics', 'supply', 'pos'];
    const shouldLoadSync = sync || criticalSections.includes(section);

    if (shouldLoadSync) {
      // Synchronous loading for critical sections
      setState(prev => ({
        ...prev,
        loadedSections: new Set([...prev.loadedSections, section]),
      }));
      return;
    }

    // Asynchronous loading for non-critical sections - OPTIMIZED: reduced delay
    setState(prev => ({
      ...prev,
      loadingSections: new Set([...prev.loadingSections, section]),
    }));

    return new Promise<void>((resolve, reject) => {
      // Use microtask for instant async loading (no setTimeout delay)
      Promise.resolve().then(() => {
        try {
          setState(prev => ({
            ...prev,
            loadedSections: new Set([...prev.loadedSections, section]),
            loadingSections: new Set([...prev.loadingSections].filter(s => s !== section)),
          }));
          // Reduced logging for async loads
          resolve();
        } catch (error) {
          console.error(`Failed to load section: ${section}`, error);
          setState(prev => ({
            ...prev,
            loadingSections: new Set([...prev.loadingSections].filter(s => s !== section)),
          }));
          reject(error);
        }
      });
    });
  }, [state.loadedSections, state.loadingSections]);

  const preloadSection = useCallback((section: string) => {
    if (!state.loadedSections.has(section) && !state.loadingSections.has(section)) {
      setState(prev => ({
        ...prev,
        preloadQueue: [...prev.preloadQueue.filter(s => s !== section), section],
      }));
      
      // Start preloading in background with low priority - OPTIMIZED: use requestIdleCallback
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          loadSection(section);
        }, { timeout: 2000 });
      } else {
        // Fallback: use microtask for instant execution
        Promise.resolve().then(() => {
          loadSection(section);
        });
      }
    }
  }, [state.loadedSections, state.loadingSections, loadSection]);

  const clearSection = useCallback((section: string) => {
    setState(prev => ({
      ...prev,
      loadedSections: new Set([...prev.loadedSections].filter(s => s !== section)),
      loadingSections: new Set([...prev.loadingSections].filter(s => s !== section)),
      preloadQueue: prev.preloadQueue.filter(s => s !== section),
    }));
  }, []);

  const value: LazyContextType = {
    loadedSections: state.loadedSections,
    loadingSections: state.loadingSections,
    isLoaded,
    isLoading,
    loadSection,
    preloadSection,
    clearSection,
  };

  return (
    <LazyContext.Provider value={value}>
      {children}
    </LazyContext.Provider>
  );
};
