import { sensitiveDataService } from './SensitiveDataService'

let attempted = false

function getEncryptionKeyFromEnv(): string | null {
  // Vite (client) env. Note: VITE_* is not secret in production builds.
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  const candidateViteKeys = [
    'VITE_GENERAL_ENCRYPTION_KEY',
    'VITE_EMPLOYEE_DATA_KEY',
    'VITE_PAYROLL_DATA_KEY',
    'VITE_HMRC_ENCRYPTION_KEY',
  ]

  for (const k of candidateViteKeys) {
    const v = viteEnv?.[k]
    if (typeof v === 'string' && v.length >= 32) return v
  }

  // Node / Functions env (when available)
  if (typeof process !== 'undefined' && (process as any)?.env) {
    const env = (process as any).env as Record<string, string | undefined>
    const candidateNodeKeys = [
      'GENERAL_ENCRYPTION_KEY',
      'EMPLOYEE_DATA_KEY',
      'PAYROLL_DATA_KEY',
      'HMRC_ENCRYPTION_KEY',
    ]
    for (const k of candidateNodeKeys) {
      const v = env[k]
      if (typeof v === 'string' && v.length >= 32) return v
    }
  }

  return null
}

/**
 * Initializes encryption once (best-effort) and returns current status.
 *
 * Minimal-change helper used by HR/Payroll read/write paths.
 */
export function ensureEncryptionInitialized(): boolean {
  if (sensitiveDataService.isInitialized()) return true
  if (attempted) return false
  attempted = true

  const key = getEncryptionKeyFromEnv()
  if (!key) return false

  try {
    sensitiveDataService.initialize(key)
    return true
  } catch {
    return false
  }
}

