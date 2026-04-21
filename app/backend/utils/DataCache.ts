/**
 * Smart Data Cache Layer
 * 
 * Provides extremely fast data loading with:
 * - In-memory cache for instant access
 * - IndexedDB persistence for offline/cross-session support
 * - Automatic cache invalidation
 * - Selective updates (only update what changed)
 * - Background refresh without blocking UI
 */

import { get, ref } from 'firebase/database';
import { db } from '../services/Firebase';
import { debugWarn } from './debugLog';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
  path: string;
}

interface CacheConfig {
  maxAge: number; // Max age in milliseconds (default: 5 minutes)
  enableIndexedDB: boolean; // Enable IndexedDB persistence
  enableBackgroundRefresh: boolean; // Refresh in background
}

const DEFAULT_CONFIG: CacheConfig = {
  // Cache is primarily used as a fast/offline fallback; contexts still do background refreshes.
  // Keep this fairly long so refreshes can hydrate instantly across sessions.
  maxAge: 60 * 60 * 1000, // 60 minutes
  enableIndexedDB: true,
  enableBackgroundRefresh: true,
};

class DataCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private indexedDB: IDBDatabase | null = null;
  private config: CacheConfig = DEFAULT_CONFIG;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.enableIndexedDB && typeof window !== 'undefined') {
      this.initIndexedDB();
    }
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, _reject) => {
      const request = indexedDB.open('1StopDataCache', 1);

      request.onerror = () => {
        debugWarn('IndexedDB not available, using memory cache only');
        this.config.enableIndexedDB = false;
        resolve();
      };

      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'path' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get data from cache or fetch from Firebase
   * Returns cached data immediately if available and fresh
   */
  async get<T>(path: string, forceRefresh: boolean = false): Promise<T | null> {
    const cacheKey = this.normalizePath(path);

    // Check memory cache first (fastest)
    if (!forceRefresh) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && this.isFresh(cached)) {
        // Stale-while-revalidate: return cached immediately, but always revalidate in background
        // so the database remains the source of truth and the cache is updated promptly.
        if (this.config.enableBackgroundRefresh) {
          this.triggerBackgroundRefresh<T>(cacheKey);
        }
        return cached.data as T;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T | null>;
    }

    // Check IndexedDB cache next (cross-session speedup)
    if (!forceRefresh && this.config.enableIndexedDB && this.indexedDB) {
      try {
        const indexed = await this.getFromIndexedDB<T>(cacheKey);
        if (indexed !== null) {
          // Same SWR policy for IndexedDB hits.
          if (this.config.enableBackgroundRefresh) {
            this.triggerBackgroundRefresh<T>(cacheKey);
          }
          return indexed;
        }
      } catch {
        // silent
      }
    }

    // Fetch from Firebase
    const fetchPromise = this.fetchAndCache<T>(cacheKey, cacheKey);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Read cache without fetching from Firebase
   */
  async peek<T>(path: string): Promise<T | null> {
    const cacheKey = this.normalizePath(path);
    const cached = this.memoryCache.get(cacheKey);
    if (cached && this.isFresh(cached)) {
      return cached.data as T;
    }
    if (this.config.enableIndexedDB && this.indexedDB) {
      try {
        const indexed = await this.getFromIndexedDB<T>(cacheKey);
        return indexed;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Store arbitrary data in cache (memory + IndexedDB).
   * Useful for caching transformed results (arrays, etc.) without re-fetching Firebase.
   */
  set<T>(path: string, data: T): void {
    const cacheKey = this.normalizePath(path);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: 1,
      path: cacheKey,
    };
    this.memoryCache.set(cacheKey, entry);
    if (this.config.enableIndexedDB && this.indexedDB) {
      this.saveToIndexedDB(cacheKey, entry).catch(() => {
        // silent
      });
    }
    this.notifyListeners(cacheKey, data);
  }

  /**
   * Fetch from Firebase and cache the result
   */
  private async fetchAndCache<T>(path: string, cacheKey: string): Promise<T | null> {
    try {
      const dataRef = ref(db, path);
      const snapshot = await get(dataRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.val() as T;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: 1,
        path: cacheKey,
      };

      // Store in memory cache
      this.memoryCache.set(cacheKey, entry);

      // Store in IndexedDB (async, don't wait)
      if (this.config.enableIndexedDB && this.indexedDB) {
        this.saveToIndexedDB(cacheKey, entry).catch(err => {
          debugWarn('Failed to save to IndexedDB:', err);
        });
      }

      // Notify listeners
      this.notifyListeners(cacheKey, data);

      return data;
    } catch (error) {
      debugWarn(`Error fetching data from ${path}:`, error);
      
      // Try to return stale data from cache if available
      const stale = this.memoryCache.get(cacheKey);
      if (stale) {
        debugWarn(`Returning stale data for ${path}`);
        return stale.data as T;
      }

      // Try IndexedDB as last resort
      if (this.config.enableIndexedDB && this.indexedDB) {
        const indexedData = await this.getFromIndexedDB<T>(cacheKey);
        if (indexedData) {
          debugWarn(`Returning IndexedDB data for ${path}`);
          return indexedData;
        }
      }

      return null;
    }
  }

  /**
   * Check if cache entry is still fresh
   */
  private isFresh(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < this.config.maxAge;
  }

  /**
   * Subscribe to cache updates for a specific path
   */
  subscribe<T>(path: string, callback: (data: T | null) => void): () => void {
    const cacheKey = this.normalizePath(path);
    
    if (!this.listeners.has(cacheKey)) {
      this.listeners.set(cacheKey, new Set());
    }
    
    this.listeners.get(cacheKey)!.add(callback);

    // Immediately return cached data if available AND fresh.
    // Even when we hydrate from cache, trigger a background revalidation so DB wins.
    const cached = this.memoryCache.get(cacheKey);
    if (cached && this.isFresh(cached)) {
      callback(cached.data as T);
      if (this.config.enableBackgroundRefresh) {
        this.triggerBackgroundRefresh<T>(cacheKey);
      }
    } else if (this.config.enableBackgroundRefresh) {
      // No fresh in-memory data → still kick off a background fetch
      // so subscribers get the latest DB value as soon as it arrives.
      this.triggerBackgroundRefresh<T>(cacheKey);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(cacheKey);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(cacheKey);
        }
      }
    };
  }

  /**
   * Notify all listeners of a path update
   */
  private notifyListeners(path: string, data: any): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          debugWarn('Error in cache listener:', error);
        }
      });
    }
  }

  /**
   * Invalidate cache for a specific path
   */
  invalidate(path: string): void {
    const cacheKey = this.normalizePath(path);
    this.memoryCache.delete(cacheKey);
    
    if (this.config.enableIndexedDB && this.indexedDB) {
      this.deleteFromIndexedDB(cacheKey).catch(err => {
        debugWarn('Failed to delete from IndexedDB:', err);
      });
    }
  }

  /**
   * Invalidate all cache
   */
  invalidateAll(): void {
    this.memoryCache.clear();
    
    if (this.config.enableIndexedDB && this.indexedDB) {
      this.clearIndexedDB().catch(err => {
        debugWarn('Failed to clear IndexedDB:', err);
      });
    }
  }

  /**
   * Preload data in background
   */
  async preload(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.get(path).catch(err => {
      debugWarn(`Failed to preload ${path}:`, err);
      return null;
    }));
    
    await Promise.all(promises);
  }

  /**
   * Get multiple paths at once (batch operation)
   */
  async getMultiple<T>(paths: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Check cache first
    const uncachedPaths: string[] = [];
    for (const path of paths) {
      const cacheKey = this.normalizePath(path);
      const cached = this.memoryCache.get(cacheKey);
      if (cached && this.isFresh(cached)) {
        results.set(path, cached.data as T);
        // Background revalidate so DB remains source of truth.
        if (this.config.enableBackgroundRefresh) {
          this.triggerBackgroundRefresh<T>(cacheKey);
        }
      } else {
        uncachedPaths.push(path);
      }
    }

    // Fetch uncached paths in parallel
    if (uncachedPaths.length > 0) {
      const fetchPromises = uncachedPaths.map(path => 
        this.get<T>(path).then(data => ({ path, data }))
      );
      
      const fetched = await Promise.all(fetchPromises);
      fetched.forEach(({ path, data }) => {
        results.set(path, data);
      });
    }

    return results;
  }

  /**
   * Background refresh for a normalized cache key.
   * Dedupes in-flight requests so repeated callers don't spam Firebase.
   */
  private triggerBackgroundRefresh<T>(normalizedPath: string): void {
    const cacheKey = normalizedPath;
    if (this.pendingRequests.has(cacheKey)) return;

    const p = this.fetchAndCache<T>(cacheKey, cacheKey)
      .catch(() => null)
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, p);
  }

  /**
   * Normalize path for consistent caching
   */
  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '');
  }

  /**
   * IndexedDB operations
   */
  private async saveToIndexedDB(_path: string, entry: CacheEntry<any>): Promise<void> {
    if (!this.indexedDB) return;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB<T>(path: string): Promise<T | null> {
    if (!this.indexedDB) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(path);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (entry && this.isFresh(entry)) {
          // Also update memory cache
          this.memoryCache.set(path, entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(path: string): Promise<void> {
    if (!this.indexedDB) return;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(path);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.indexedDB) return;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryCacheSize: number;
    pendingRequests: number;
    listeners: number;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      pendingRequests: this.pendingRequests.size,
      listeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }
}

// Singleton instance
export const dataCache = new DataCache({
  // Keep cached data usable across refreshes to avoid huge cold loads.
  // Background refresh is handled by callers (contexts) when needed.
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  enableIndexedDB: true,
  enableBackgroundRefresh: true,
});

// Export for testing
export { DataCache };

