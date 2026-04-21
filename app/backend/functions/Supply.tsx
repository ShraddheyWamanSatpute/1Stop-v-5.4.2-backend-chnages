/**
 * Supply module helpers (pure functions / browser-safe utilities).
 */
export function generateInviteCode(bytes: number = 16): string {
  // 16 bytes => 32 hex chars
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const arr = new Uint8Array(bytes)
      crypto.getRandomValues(arr)
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    }
  } catch {
    // fall through to Math.random
  }

  // Fallback: not cryptographically secure, but stable enough for a placeholder invite flow.
  const s = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  return s.slice(0, Math.max(8, bytes * 2))
}

export function buildClientInviteUrl(params: { origin: string; basePath?: string; code: string }): string {
  const basePath = params.basePath ?? "/app" // matches main.tsx basename patterns in this repo
  // Recipient flow (customer company) - links supplier to an existing/new Supplier record.
  return `${params.origin}${basePath}/ConnectSupplier?code=${encodeURIComponent(params.code)}`
}

