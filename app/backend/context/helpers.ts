/**
 * Context Helper Utilities
 * Ensures frontend components update properly when data changes
 */

import { useEffect, useRef, useState } from 'react'

/**
 * Data version tracker to force re-renders when data changes
 */
export class DataVersionTracker {
  private version: number = 0
  private listeners: Set<() => void> = new Set()

  increment() {
    this.version++
    this.notifyListeners()
  }

  getVersion() {
    return this.version
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }
}

/**
 * Hook to force component re-render when data changes
 * Usage: const dataVersion = useDataVersion(context.state.dataVersion)
 */
export function useDataVersion(version: number): number {
  const [localVersion, setLocalVersion] = useState(version)
  
  useEffect(() => {
    if (version !== localVersion) {
      setLocalVersion(version)
    }
  }, [version, localVersion])
  
  return localVersion
}

/**
 * Hook to watch for context data changes
 * Usage: useContextWatcher(() => context.state.products, [context.state.products])
 */
export function useContextWatcher<T>(
  getData: () => T,
  deps: any[],
  onChange?: (data: T) => void
): T {
  const [data, setData] = useState<T>(getData)
  const prevDataRef = useRef<string>()

  useEffect(() => {
    const newData = getData()
    const newDataJson = JSON.stringify(newData)
    
    if (prevDataRef.current !== newDataJson) {
      prevDataRef.current = newDataJson
      setData(newData)
      onChange?.(newData)
    }
  }, deps)

  return data
}

/**
 * Hook to ensure data is loaded before rendering
 * Usage: const isReady = useDataReady(context.state.loading, context.state.products.length > 0)
 */
export function useDataReady(isLoading: boolean, hasData: boolean): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isLoading && hasData) {
      setIsReady(true)
    } else if (isLoading) {
      // Keep showing old data while loading
      // Don't set to false to prevent flicker
    }
  }, [isLoading, hasData])

  return isReady
}

/**
 * Deep equality check for objects/arrays
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  if (obj1 == null || obj2 == null) return false
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false
  
  try {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
  } catch {
    return false
  }
}

/**
 * Hook to track data freshness and trigger updates
 */
export function useDataFreshness<T>(
  data: T,
  onStale?: () => void,
  staleTimeMs: number = 30000 // 30 seconds default
): { isFresh: boolean; refresh: () => void } {
  const [, setLastUpdate] = useState(Date.now())
  const [isFresh, setIsFresh] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setLastUpdate(Date.now())
    setIsFresh(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsFresh(false)
      onStale?.()
    }, staleTimeMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, staleTimeMs, onStale])

  const refresh = () => {
    setLastUpdate(Date.now())
    setIsFresh(true)
  }

  return { isFresh, refresh }
}

/**
 * Force update hook - use sparingly!
 * Usage: const forceUpdate = useForceUpdate()
 */
export function useForceUpdate(): () => void {
  const [, setTick] = useState(0)
  return () => setTick(tick => tick + 1)
}
