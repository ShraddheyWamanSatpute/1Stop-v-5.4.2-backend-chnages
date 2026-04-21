/**
 * Debug logging helper.
 *
 * Default: ON in dev (keeps production clean).
 * Disable by setting VITE_DEBUG_LOGS=false in your environment.
 */
const DEBUG_LOGS_ENABLED =
  import.meta.env.DEV &&
  String(((import.meta.env as any).VITE_DEBUG_LOGS ?? "true")).toLowerCase() !== "false"

// Extra-noisy logs (AI debug, deep traces) are OFF by default.
// Enable with: VITE_DEBUG_VERBOSE=true
const DEBUG_VERBOSE_ENABLED =
  import.meta.env.DEV &&
  String(((import.meta.env as any).VITE_DEBUG_VERBOSE ?? "false")).toLowerCase() === "true"

export const debugLog = (...args: unknown[]) => {
  if (!DEBUG_LOGS_ENABLED) return
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

