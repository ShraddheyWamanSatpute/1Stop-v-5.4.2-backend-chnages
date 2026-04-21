/**
 * Cached Data Hook
 * 
 * Provides fast data loading with automatic caching and selective updates.
 * Only re-renders when the selected data actually changes.
 * 
 * Usage:
 *   const employees = useCachedData('hr/employees', basePath);
 *   const { employees, departments } = useCachedDataMultiple({
 *     employees: 'hr/employees',
 *     departments: 'hr/departments'
 *   }, basePath);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { dataCache } from '../utils/DataCache';

interface UseCachedDataOptions {
  immediate?: boolean; // Load immediately or wait for explicit load
  forceRefresh?: boolean; // Force refresh from Firebase
  onUpdate?: (data: any) => void; // Callback when data updates
}

/**
 * Hook to fetch and cache a single data path
 */
export function useCachedData<T>(
  relativePath: string,
  basePath: string,
  options: UseCachedDataOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { immediate = true, forceRefresh = false, onUpdate } = options;
  const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await dataCache.get<T>(fullPath, forceRefresh);
      
      if (isMountedRef.current) {
        setData(result);
        if (onUpdate) {
          onUpdate(result);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fullPath, forceRefresh, onUpdate]);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to cache updates
    unsubscribeRef.current = dataCache.subscribe<T>(fullPath, (cachedData) => {
      if (isMountedRef.current) {
        setData(cachedData);
        if (onUpdate) {
          onUpdate(cachedData);
        }
      }
    });

    // Load immediately if requested
    if (immediate) {
      refresh();
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fullPath, immediate, refresh]);

  return { data, loading, error, refresh };
}

/**
 * Hook to fetch and cache multiple data paths at once
 */
export function useCachedDataMultiple<T extends Record<string, any>>(
  paths: Record<keyof T, string>,
  basePath: string,
  options: UseCachedDataOptions = {}
): {
  data: Partial<T>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { immediate = true, forceRefresh = false, onUpdate } = options;
  
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRefs = useRef<Map<string, () => void>>(new Map());

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fullPaths = Object.entries(paths).map(([key, path]) => [
        key,
        basePath ? `${basePath}/${path}` : path,
      ]) as [string, string][];

      const results = await dataCache.getMultiple(
        fullPaths.map(([, path]) => path)
      );

      const newData: Partial<T> = {};
      fullPaths.forEach(([key, path]) => {
        newData[key as keyof T] = results.get(path) as T[keyof T];
      });

      if (isMountedRef.current) {
        setData(newData);
        if (onUpdate) {
          onUpdate(newData);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [paths, basePath, forceRefresh, onUpdate]);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to all paths
    Object.entries(paths).forEach(([key, path]) => {
      const fullPath = basePath ? `${basePath}/${path}` : path;
      const unsubscribe = dataCache.subscribe(fullPath, (cachedData) => {
        if (isMountedRef.current) {
          setData((prev) => ({
            ...prev,
            [key]: cachedData,
          }));
        }
      });
      unsubscribeRefs.current.set(key, unsubscribe);
    });

    // Load immediately if requested
    if (immediate) {
      refresh();
    }

    return () => {
      isMountedRef.current = false;
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current.clear();
    };
  }, [basePath, immediate, refresh]);

  return { data, loading, error, refresh };
}

/**
 * Progressive loading hook - loads critical data first, then background data
 */
export function useProgressiveData<T>(
  criticalPaths: string[],
  backgroundPaths: string[],
  basePath: string
): {
  critical: Map<string, T | null>;
  background: Map<string, T | null>;
  criticalLoading: boolean;
  backgroundLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [critical, setCritical] = useState<Map<string, T | null>>(new Map());
  const [background, setBackground] = useState<Map<string, T | null>>(new Map());
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  const refresh = useCallback(async () => {
    // Load critical data first
    setCriticalLoading(true);
    const criticalFullPaths = criticalPaths.map((p) =>
      basePath ? `${basePath}/${p}` : p
    );
    const criticalResults = await dataCache.getMultiple<T>(criticalFullPaths);
    setCritical(criticalResults);
    setCriticalLoading(false);

    // Then load background data
    setBackgroundLoading(true);
    const backgroundFullPaths = backgroundPaths.map((p) =>
      basePath ? `${basePath}/${p}` : p
    );
    const backgroundResults = await dataCache.getMultiple<T>(backgroundFullPaths);
    setBackground(backgroundResults);
    setBackgroundLoading(false);
  }, [criticalPaths, backgroundPaths, basePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    critical,
    background,
    criticalLoading,
    backgroundLoading,
    refresh,
  };
}

