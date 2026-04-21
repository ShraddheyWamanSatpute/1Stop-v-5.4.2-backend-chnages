type RouteKey =
  | "dashboard"
  | "hr"
  | "bookings"
  | "stock"
  | "finance"
  | "pos"
  | "messenger"
  | "analytics"
  | "company"
  | "settings"
  | "supply"

const preloaders: Record<RouteKey, () => Promise<unknown>> = {
  dashboard: () => import("../pages/Dashboard"),
  hr: () => import("../pages/HR"),
  bookings: () => import("../pages/Bookings"),
  stock: () => import("../pages/StockDashboard"),
  finance: () => import("../pages/Finance"),
  pos: () => import("../pages/POS"),
  messenger: () => import("../pages/Messenger"),
  analytics: () => import("../pages/Analytics"),
  company: () => import("../pages/Company"),
  settings: () => import("../pages/Settings"),
  supply: () => import("../pages/Supply"),
}

const preloaded = new Set<RouteKey>()

export function preloadRouteChunk(key: RouteKey): void {
  if (preloaded.has(key)) return
  preloaded.add(key)
  // Fire and forget. If it fails, we can try again on demand.
  preloaders[key]().catch(() => {
    preloaded.delete(key)
  })
}

export function preloadForPathname(pathname: string): void {
  const p = String(pathname || "")
  if (p.startsWith("/Dashboard")) return preloadRouteChunk("dashboard")
  if (p.startsWith("/HR")) return preloadRouteChunk("hr")
  if (p.startsWith("/Bookings")) return preloadRouteChunk("bookings")
  if (p.startsWith("/Stock")) return preloadRouteChunk("stock")
  if (p.startsWith("/Finance")) return preloadRouteChunk("finance")
  if (p.startsWith("/POS")) return preloadRouteChunk("pos")
  if (p.startsWith("/Messenger")) return preloadRouteChunk("messenger")
  if (p.startsWith("/Analytics")) return preloadRouteChunk("analytics")
  if (p.startsWith("/Company")) return preloadRouteChunk("company")
  if (p.startsWith("/Settings")) return preloadRouteChunk("settings")
  if (p.startsWith("/Supply")) return preloadRouteChunk("supply")
}

function idle(cb: () => void, timeoutMs: number): { cancel: () => void } {
  if (typeof window === "undefined") return { cancel: () => {} }

  // Prefer requestIdleCallback when available
  const w = window as any
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout: timeoutMs })
    return { cancel: () => w.cancelIdleCallback?.(id) }
  }

  const t = window.setTimeout(cb, Math.min(timeoutMs, 500))
  return { cancel: () => window.clearTimeout(t) }
}

/**
 * Preload likely next route chunks in the background so swapping sections is instant.
 * This does not block UI; it runs on idle / delayed timers.
 */
export function startBackgroundRoutePreloading(currentPathname?: string): () => void {
  // Preload current section immediately (helps if user lands somewhere deep-linked)
  if (currentPathname) preloadForPathname(currentPathname)

  const cancels: Array<() => void> = []

  // High-likelihood routes first.
  const high: RouteKey[] = ["dashboard", "company", "settings", "pos", "stock"]
  // Core modules next.
  const core: RouteKey[] = ["hr", "finance", "bookings", "messenger"]
  // Least common / heaviest last.
  const tail: RouteKey[] = ["analytics", "supply"]

  ;[high, core, tail].forEach((group, groupIdx) => {
    const handle = idle(() => {
      group.forEach(preloadRouteChunk)
    }, 700 + groupIdx * 1200)
    cancels.push(handle.cancel)
  })

  return () => {
    cancels.forEach((c) => c())
  }
}
