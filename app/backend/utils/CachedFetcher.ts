/**
 * Cached Fetcher Utility
 * 
 * Provides request deduplication and caching for context data fetching
 */

import { dataCache } from './DataCache';
import { debugWarn } from './debugLog';

/**
 * Request deduplication map - prevents duplicate simultaneous requests
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Create a cached fetcher with request deduplication
 * 
 * @param fetchFn - The original fetch function
 * @param entityName - Name of the entity (for cache key)
 * @returns Cached fetch function
 */
export function createCachedFetcher<T>(
  fetchFn: (basePath: string) => Promise<T[]>,
  entityName: string
) {
  return async (basePath: string, forceRefresh: boolean = false): Promise<T[]> => {
    const cacheKey = `${basePath}/${entityName}`;
    
    const startFetch = (): Promise<T[]> => {
      // De-dupe network calls
      const existing = pendingRequests.get(cacheKey) as Promise<T[]> | undefined
      if (existing) return existing

      const fetchPromise = (async () => {
        try {
          const data = await fetchFn(basePath)
          if (Array.isArray(data)) {
            // Cache transformed result (arrays) for fast future loads
            dataCache.set(cacheKey, data)
          }
          return data || []
        } catch (error) {
          debugWarn(`Error fetching ${entityName} from ${basePath}:`, error)

          // Try to return cached data on error (best-effort).
          // Note: peek() may return null if stale; that's OK—we prefer correctness.
          const cachedOnError = await dataCache.peek<T[]>(cacheKey)
          if (cachedOnError !== null) return cachedOnError

          throw error
        } finally {
          pendingRequests.delete(cacheKey)
        }
      })()

      pendingRequests.set(cacheKey, fetchPromise)
      return fetchPromise
    }

    // Database-first:
    // Always prefer the live database result so context state stays correct.
    // Cache is used only for fast hydration elsewhere and as a fallback on fetch errors.
    if (forceRefresh) {
      return await startFetch()
    }

    return await startFetch()
  };
}

/**
 * Batch fetch multiple entities with caching and deduplication
 */
export async function batchFetchCached<T>(
  fetchers: Array<{ fetchFn: (basePath: string) => Promise<T[]>; entityName: string }>,
  basePath: string,
  forceRefresh: boolean = false
): Promise<T[][]> {
  const cachedFetchers = fetchers.map(({ fetchFn, entityName }) =>
    createCachedFetcher(fetchFn, entityName)
  );
  
  return Promise.all(
    cachedFetchers.map(fetcher => fetcher(basePath, forceRefresh))
  );
}

/**
 * Clear pending requests (useful for cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get pending request count (for debugging)
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}



