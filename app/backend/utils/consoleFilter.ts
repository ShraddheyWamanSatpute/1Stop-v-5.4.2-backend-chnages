/**
 * /app console filter
 *
 * Goal: keep console output clean by default.
 * - Always allow console.error (real issues).
 * - For other console methods, only allow "approved" startup/telemetry messages.
 * - Designed to avoid editing hundreds of files that still call console.* directly.
 */

type ConsoleMethod = "log" | "info" | "warn" | "debug" | "error" | "group" | "groupCollapsed" | "groupEnd"

const env = (import.meta as any).env as any
const IS_DEV = Boolean(env?.DEV)

// When false, we silence non-error console output entirely.
const DEBUG_LOGS_ENABLED =
  IS_DEV && String((env?.VITE_DEBUG_LOGS ?? "false")).toLowerCase() === "true"

const allowlistPatterns: RegExp[] = [
  // Context lifecycle
  /cache hydrated/i,
  /\bcore loaded\b/i,
  /\ball data loaded\b/i,
  /\bstarted loading\b/i,
  /\bcache loaded\b/i,
  /\binitial data loaded\b/i,

  // Keys summary
  /keys configuration summary/i,
  /blank\/missing key/i,
  /found \d+ blank\/missing key/i,
]

const shouldAllow = (method: ConsoleMethod, args: unknown[]): boolean => {
  if (method === "error") return true

  // Only filter by the first argument (typical console usage is: console.log("message", extra...))
  const first = args?.[0]
  if (typeof first !== "string") return false

  // Always allow high-signal allowlisted messages in DEV (even when DEBUG_LOGS are off).
  if (IS_DEV && allowlistPatterns.some((re) => re.test(first))) return true

  // Otherwise, only allow when debug logs are enabled.
  if (!DEBUG_LOGS_ENABLED) return false
  return allowlistPatterns.some((re) => re.test(first))
}

export function installConsoleFilter(): void {
  if (typeof window === "undefined") return

  const c = console as any
  if (c.__appConsoleFilterInstalled) return
  c.__appConsoleFilterInstalled = true

  const original: Record<ConsoleMethod, (...args: any[]) => void> = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    debug: console.debug.bind(console),
    error: console.error.bind(console),
    group: console.group.bind(console),
    groupCollapsed: (console.groupCollapsed || console.group).bind(console),
    groupEnd: console.groupEnd.bind(console),
  }

  const wrap = (method: ConsoleMethod) => {
    return (...args: any[]) => {
      if (!shouldAllow(method, args)) return
      original[method](...args)
    }
  }

  console.log = wrap("log")
  console.info = wrap("info")
  console.warn = wrap("warn")
  console.debug = wrap("debug")
  console.group = wrap("group")
  console.groupCollapsed = wrap("groupCollapsed")
  console.groupEnd = wrap("groupEnd")

  // Keep console.error untouched (always visible)
  console.error = original.error
}

// Install immediately on import so /app entry can import once.
installConsoleFilter()

