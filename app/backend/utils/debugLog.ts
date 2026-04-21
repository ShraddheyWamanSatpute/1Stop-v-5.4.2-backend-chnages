/**
 * Debug logging helper.
 *
 * Default: OFF (keeps dev console clean; production is always clean).
 * Enable by setting VITE_DEBUG_LOGS=true in your environment.
 */
const DEBUG_LOGS_ENABLED =
  import.meta.env.DEV &&
  String(((import.meta.env as any).VITE_DEBUG_LOGS ?? "false")).toLowerCase() === "true"

// Lifecycle logs are high-signal and useful for startup performance debugging.
// Keep them OFF by default (users requested clean console).
// Enable with: VITE_DEBUG_LIFECYCLE=true
const DEBUG_LIFECYCLE_ENABLED =
  import.meta.env.DEV &&
  String(((import.meta.env as any).VITE_DEBUG_LIFECYCLE ?? "false")).toLowerCase() === "true"

const LIFECYCLE_ALLOWLIST: RegExp[] = [
  /cache hydrated/i,
  /\bcore loaded\b/i,
  /\ball data loaded\b/i,
  /\bstarted loading\b/i,
  /\bcache loaded\b/i,
  /\binitial data loaded\b/i,
]

// Extra-noisy logs (AI debug, deep traces) are OFF by default.
// Enable with: VITE_DEBUG_VERBOSE=true
const DEBUG_VERBOSE_ENABLED =
  import.meta.env.DEV &&
  String(((import.meta.env as any).VITE_DEBUG_VERBOSE ?? "false")).toLowerCase() === "true"

export const debugLog = (...args: unknown[]) => {
  if (!DEBUG_LOGS_ENABLED) {
    // Still allow key lifecycle messages (boot performance / hydration).
    if (!DEBUG_LIFECYCLE_ENABLED) return
    const first = args?.[0]
    if (typeof first !== "string") return
    if (!LIFECYCLE_ALLOWLIST.some((re) => re.test(first))) return
  }
  // eslint-disable-next-line no-console
  console.log(...args)
}

export const debugWarn = (...args: unknown[]) => {
  if (!DEBUG_LOGS_ENABLED) return
  // eslint-disable-next-line no-console
  console.warn(...args)
}

export const debugVerbose = (...args: unknown[]) => {
  if (!DEBUG_VERBOSE_ENABLED) return
  // eslint-disable-next-line no-console
  console.log(...args)
}

