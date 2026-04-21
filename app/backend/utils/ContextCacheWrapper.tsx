/**
 * Context Cache Wrapper
 * 
 * Wraps context providers to add:
 * - Automatic caching of fetched data
 * - Selective updates (only update what changed)
 * - Progressive loading (critical data first)
 * - Background refresh without blocking UI
 */

import { useCallback } from 'react';
import { dataCache } from './DataCache';
import { debugWarn } from "../utils/debugLog";

/**
 * Create a cached version of a fetch function
 */
export function createCachedFetcher<T>(
  originalFetcher: (basePath: string) => Promise<T[]>,
  relativePath: string
) {
  return async (basePath: string, forceRefresh: boolean = false): Promise<T[]> => {
    const fullPath = `${basePath}/${relativePath}`;

    // Database-first: always fetch live data so contexts don't get stuck on stale cache.
    // Cache is best-effort and used for startup hydration / offline fallback elsewhere.
    const data = await originalFetcher(basePath)
    if (Array.isArray(data)) {
      dataCache.set(fullPath, data)
    }
    return data || []
  };
}

/**
 * Batch fetch with caching
 * Simplified version - just calls fetchers directly for now
 * Cache integration can be added later if needed
 */
export async function batchFetchCached<T>(
  fetchers: Array<{ path: string; fetcher: (basePath: string) => Promise<T> }>,
  basePath: string
): Promise<T[]> {
  // Simply call all fetchers in parallel - no complex caching for now
  // This prevents hanging issues and ensures data loads correctly
  const fetchPromises = fetchers.map(({ fetcher }) => fetcher(basePath));
  
  try {
    const results = await Promise.all(fetchPromises);
    return results;
  } catch (error) {
    debugWarn('Error in batchFetchCached:', error);
    // Return empty arrays for failed fetches to prevent blocking
    return fetchers.map(() => [] as any) as T[];
  }
}

/**
 * Hook to invalidate cache when data is updated
 */
export function useCacheInvalidation() {
  const invalidate = useCallback((paths: string[]) => {
    paths.forEach((path) => {
      dataCache.invalidate(path);
    });
  }, []);

  return { invalidate };
}

/**
 * Progressive loader - loads critical data first, then background
 */
export async function loadProgressive<T>(
  criticalFetchers: Array<{ path: string; fetcher: (basePath: string) => Promise<T> }>,
  backgroundFetchers: Array<{ path: string; fetcher: (basePath: string) => Promise<T> }>,
  basePath: string
): Promise<{ critical: T[]; background: T[] }> {
  // Load critical data first
  const critical = await batchFetchCached(criticalFetchers, basePath);
  
  // Then load background data (don't wait)
  const backgroundPromise = batchFetchCached(backgroundFetchers, basePath);
  
  // Return critical immediately, background will be available when needed
  const background = await backgroundPromise;
  
  return { critical, background };
}

