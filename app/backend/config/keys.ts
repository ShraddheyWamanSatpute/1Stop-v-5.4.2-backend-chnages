/**
 * Consolidated Keys Configuration
 * Single source of truth for ALL keys used across all sections:
 * - Main App (app/)
 * - Admin (admin/)
 * - SupplierHub (app/supplierhub/)
 * - YourStop (yourstop/)
 * - Main Site (main-site/)
 * 
 * All sections use the main app keys (APP_KEYS) plus any section-specific extras.
 */

export interface FirebaseKeys {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
  functionsRegion?: string
}

export interface StripeKeys {
  publishableKey?: string
  secret?: string
  webhookSecret?: string
}

export interface GoogleKeys {
  mapsApiKey?: string
  placesApiKey?: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}

export interface HMRCKeys {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  oauthScope?: string
}

export interface MailKeys {
  provider: string
  from: string
  user: string
  pass: string
  host: string
  port: number
  secure: boolean
}

export interface OutlookKeys {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SupabaseKeys {
  url: string
  anonKey: string
  serviceRoleKey: string
}

export interface YourStopAPIKeys {
  GOOGLE_PLACES_API_KEY?: string
  YELP_API_KEY?: string
  FOURSQUARE_API_KEY?: string
  OPENTABLE_API_KEY?: string
  RESY_API_KEY?: string
  TOAST_API_KEY?: string
  SQUARE_API_KEY?: string
  TRIPADVISOR_API_KEY?: string
}

export interface AdminBootstrapKeys {
  enabled: boolean
  key: string
}

// Main App Keys Shape (base keys used by all sections)
export interface AppKeysShape {
  firebase: FirebaseKeys
  stripe: StripeKeys
  google: GoogleKeys
  hmrc: HMRCKeys
  supabase: SupabaseKeys
}

// Function Keys (Cloud Functions secrets)
// (keys values are in KEY_STRINGS below)
export interface FunctionKeysShape {
  stripe: {
    secret: string
    webhookSecret: string
  }
  adminBootstrap?: AdminBootstrapKeys
  mail: MailKeys
  google: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  outlook: OutlookKeys
}



/**
 * =========================
 * ✅ EDIT KEYS HERE
 * =========================
 * Change the strings below instead of hunting through `APP_KEYS` / `FUNCTION_KEYS`.
 */
export const KEY_STRINGS = {
  firebase: {
    // Firebase config should live in `.env.local` (VITE_FIREBASE_*). These are placeholders only.
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
    databaseURL: "YOUR_FIREBASE_DATABASE_URL",
    projectId: "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID",
    measurementId: "YOUR_FIREBASE_MEASUREMENT_ID",
    functionsRegion: "us-central1",
  },
  stripe: {
    publishableKey:
      'pk_test_51S52tUQ34hzSXGP0Uoza2izEfpUhNHaQRJb4dSzdNc8gqeEYOHFtMvw2AkB7s8ybLOBq39stbddARPU7SWv6hE4E00HptWImz0',
    secret: undefined as string | undefined,
    webhookSecret: undefined as string | undefined,
  },
  google: {
    mapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    placesApiKey: undefined as string | undefined,
    clientId: undefined as string | undefined,
    clientSecret: undefined as string | undefined,
    redirectUri: undefined as string | undefined,
  },
  hmrc: {
    clientId: 'YOUR_HMRC_CLIENT_ID',
    clientSecret: undefined as string | undefined,
    redirectUri: 'http://localhost:5173/hmrc/callback',
    oauthScope: 'hello',
  },
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    serviceRoleKey: 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  },
  functionKeys: {
    stripe: {
      secret: 'sk_test_YOUR_STRIPE_SECRET',
      webhookSecret: 'whsec_YOUR_STRIPE_WEBHOOK_SECRET',
    },
    adminBootstrap: {
      enabled: false,
      key: '',
    },
    mail: {
      provider: 'custom',
      from: 'test@example.com',
      user: 'test@example.com',
      pass: 'YOUR_APP_PASSWORD',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    },
    google: {
      clientId: '105852521911-86gtg49lp75450em8j3f9dcn2r854eup.apps.googleusercontent.com',
      // Do NOT commit OAuth client secrets into the frontend repo/build output.
      clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
      redirectUri: '',
    },
    outlook: {
      clientId: 'YOUR_MICROSOFT_CLIENT_ID',
      clientSecret: 'YOUR_MICROSOFT_CLIENT_SECRET',
      redirectUri: '',
    },
  },
} as const

// SupplierHub Section Keys (uses main app keys, may have extras in future)
export interface SupplierHubKeysShape extends AppKeysShape {
  // Currently uses main app keys, but structure allows for future extensions
}

// Admin Section Keys (uses main app keys)
export interface AdminKeysShape extends AppKeysShape {
  // Currently uses main app keys, but structure allows for future extensions
}

const isLocalhost = (): boolean => {
  if (typeof window === 'undefined') return false
  const h = window.location?.hostname || ''
  return h === 'localhost' || h === '127.0.0.1'
}

const shouldUseFunctionsEmulator = (): boolean => {
  try {
    const fromEnv = (import.meta as any)?.env?.VITE_USE_FUNCTIONS_EMULATOR
    if (String(fromEnv || '').toLowerCase() === 'true') return true
  } catch {
    // ignore
  }

  try {
    return localStorage.getItem('useFunctionsEmulator') === 'true'
  } catch {
    return false
  }
}

// Helper to safely read environment variables (Vite uses import.meta.env, Node.js uses process.env)
// Exported to avoid TS unused-local errors; can be used by server/client code when needed.
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  // Try Vite's import.meta.env first (browser/client-side)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const value = (import.meta as any).env[key]
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }
  // Fallback to Node.js process.env (Cloud Functions/server-side)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key]
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }
  return fallback
}

const requireEnv = (key: string): string => {
  const v = getEnvVar(key)
  if (v == null || String(v).trim() === "") {
    throw new Error(`[keys] Missing required env var: ${key}. Add it to .env.local (see .env.example).`)
  }
  return String(v)
}

type FirebaseEnvName = "main" | "test"

const resolveFirebaseFromEnv = (envName: FirebaseEnvName): FirebaseKeys => {
  const prefix = envName === "test" ? "VITE_FIREBASE_TEST_" : "VITE_FIREBASE_"

  const envDatabaseUrl = requireEnv(`${prefix}DATABASE_URL`)

  // If someone overrides only the databaseURL (or overrides them inconsistently),
  // force the Firebase projectId to match the RTDB host so Auth and RTDB point to the same project.
  const deriveProjectIdFromDatabaseUrl = (url: string): string | undefined => {
    try {
      const u = new URL(String(url))
      const host = (u.hostname || "").toLowerCase()
      // Examples:
      // - <projectId>-default-rtdb.europe-west1.firebasedatabase.app
      // - <projectId>-default-rtdb.firebasedatabase.app
      // - <projectId>.firebaseio.com
      if (host.includes("firebasedatabase.app")) {
        const prefix = host.split(".firebasedatabase.app")[0] || ""
        if (prefix.includes("-default-rtdb")) {
          return prefix.split("-default-rtdb")[0] || undefined
        }
      }
      if (host.endsWith(".firebaseio.com")) {
        return host.replace(".firebaseio.com", "") || undefined
      }
    } catch {
      // ignore
    }
    return undefined
  }

  const derivedProjectId = deriveProjectIdFromDatabaseUrl(envDatabaseUrl)
  const envProjectId = getEnvVar(`${prefix}PROJECT_ID`)
  const projectId = derivedProjectId || envProjectId || deriveProjectIdFromDatabaseUrl(envDatabaseUrl) || ""
  if (!projectId) {
    throw new Error(`[keys] Unable to derive Firebase projectId for env=${envName}. Set ${prefix}PROJECT_ID or a valid ${prefix}DATABASE_URL.`)
  }

  // Auth domain / storage bucket can be derived if not provided.
  const envAuthDomain = getEnvVar(`${prefix}AUTH_DOMAIN`)
  const envStorageBucket = getEnvVar(`${prefix}STORAGE_BUCKET`)

  return {
    apiKey: requireEnv(`${prefix}API_KEY`),
    projectId,
    authDomain: envAuthDomain || `${projectId}.firebaseapp.com`,
    databaseURL: envDatabaseUrl,
    storageBucket: envStorageBucket || `${projectId}.appspot.com`,
    messagingSenderId: requireEnv(`${prefix}MESSAGING_SENDER_ID`),
    appId: requireEnv(`${prefix}APP_ID`),
    measurementId: getEnvVar(`${prefix}MEASUREMENT_ID`) || undefined,
    functionsRegion: getEnvVar(`${prefix}FUNCTIONS_REGION`) || "us-central1",
  }
}

const resolveGoogleFromEnv = (): GoogleKeys => {
  return {
    mapsApiKey: getEnvVar("VITE_GOOGLE_MAPS_API_KEY") || KEY_STRINGS.google.mapsApiKey,
    placesApiKey: getEnvVar("VITE_GOOGLE_PLACES_API_KEY") || KEY_STRINGS.google.placesApiKey,
    clientId: getEnvVar("VITE_GOOGLE_CLIENT_ID") || KEY_STRINGS.google.clientId,
    // Never require or embed clientSecret in frontend builds.
    clientSecret: undefined,
    redirectUri: getEnvVar("VITE_GOOGLE_REDIRECT_URI") || KEY_STRINGS.google.redirectUri,
  }
}

const resolveHmrcFromEnv = (): HMRCKeys => {
  return {
    clientId: getEnvVar("VITE_HMRC_CLIENT_ID") || KEY_STRINGS.hmrc.clientId,
    // Never require or embed HMRC client secret in frontend builds.
    clientSecret: undefined,
    redirectUri: getEnvVar("VITE_HMRC_REDIRECT_URI") || KEY_STRINGS.hmrc.redirectUri,
    oauthScope: getEnvVar("VITE_HMRC_OAUTH_SCOPE") || KEY_STRINGS.hmrc.oauthScope,
  }
}

const resolveSupabaseFromEnv = (): SupabaseKeys => {
  return {
    url: requireEnv("VITE_SUPABASE_URL"),
    anonKey: getEnvVar("VITE_SUPABASE_ANON_KEY") || KEY_STRINGS.supabase.anonKey,
    serviceRoleKey: serverOnlyKey(getEnvVar("VITE_SUPABASE_SERVICE_ROLE_KEY") || KEY_STRINGS.supabase.serviceRoleKey) || 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  }
}

// Helper to check if a key is blank (silent check, summary logged at end)
const checkBlankKey = (_keyPath: string, value: any, _required: boolean = false): any => {
  // Just return the value - we'll log a summary at the end
  return value
}

const serverOnlyKey = <T>(value: T): T | undefined => {
  return typeof window === 'undefined' ? value : undefined
}

// Helper to determine if a key value is blank
const isBlankKeyValue = (value: any): boolean => {
  return value === undefined || value === null || value === '' || 
         (typeof value === 'string' && (value.startsWith('YOUR_') || value.includes('YOUR_') || value.includes('sk_test_YOUR') || value.includes('whsec_YOUR')))
}

// ========= MAIN APP KEYS (Base keys used by all sections) =========
// Firebase frontend config is build-time environment driven.
const FIREBASE_ENV = (getEnvVar("VITE_FIREBASE_ENV", "main") || "main").toLowerCase() === "test" ? ("test" as const) : ("main" as const)
const RESOLVED_FIREBASE = resolveFirebaseFromEnv(FIREBASE_ENV)
const RESOLVED_GOOGLE = resolveGoogleFromEnv()
const RESOLVED_HMRC = resolveHmrcFromEnv()
const RESOLVED_SUPABASE = resolveSupabaseFromEnv()
export const APP_KEYS: AppKeysShape = {
  firebase: {
    apiKey: checkBlankKey('APP_KEYS.firebase.apiKey', RESOLVED_FIREBASE.apiKey, true),
    authDomain: checkBlankKey('APP_KEYS.firebase.authDomain', RESOLVED_FIREBASE.authDomain, true),
    databaseURL: checkBlankKey('APP_KEYS.firebase.databaseURL', RESOLVED_FIREBASE.databaseURL, true),
    projectId: checkBlankKey('APP_KEYS.firebase.projectId', RESOLVED_FIREBASE.projectId, true),
    storageBucket: checkBlankKey('APP_KEYS.firebase.storageBucket', RESOLVED_FIREBASE.storageBucket, true),
    messagingSenderId: checkBlankKey('APP_KEYS.firebase.messagingSenderId', RESOLVED_FIREBASE.messagingSenderId, true),
    appId: checkBlankKey('APP_KEYS.firebase.appId', RESOLVED_FIREBASE.appId, true),
    measurementId: checkBlankKey('APP_KEYS.firebase.measurementId', RESOLVED_FIREBASE.measurementId),
    functionsRegion: checkBlankKey('APP_KEYS.firebase.functionsRegion', RESOLVED_FIREBASE.functionsRegion, true),
  },
  stripe: {
    publishableKey: checkBlankKey('APP_KEYS.stripe.publishableKey', KEY_STRINGS.stripe.publishableKey),
    secret: undefined,
    webhookSecret: undefined,
  },
  google: {
    mapsApiKey: checkBlankKey('APP_KEYS.google.mapsApiKey', RESOLVED_GOOGLE.mapsApiKey),
    placesApiKey: checkBlankKey('APP_KEYS.google.placesApiKey', RESOLVED_GOOGLE.placesApiKey),
    clientId: checkBlankKey('APP_KEYS.google.clientId', RESOLVED_GOOGLE.clientId),
    clientSecret: undefined,
    redirectUri: checkBlankKey('APP_KEYS.google.redirectUri', RESOLVED_GOOGLE.redirectUri),
  },
  hmrc: {
    clientId: checkBlankKey('APP_KEYS.hmrc.clientId', RESOLVED_HMRC.clientId),
    clientSecret: undefined,
    redirectUri: checkBlankKey('APP_KEYS.hmrc.redirectUri', RESOLVED_HMRC.redirectUri),
    oauthScope: checkBlankKey('APP_KEYS.hmrc.oauthScope', RESOLVED_HMRC.oauthScope),
  },
  supabase: {
    url: checkBlankKey('APP_KEYS.supabase.url', RESOLVED_SUPABASE.url, true),
    anonKey: checkBlankKey('APP_KEYS.supabase.anonKey', RESOLVED_SUPABASE.anonKey),
    serviceRoleKey: checkBlankKey('APP_KEYS.supabase.serviceRoleKey', RESOLVED_SUPABASE.serviceRoleKey),
  },
}

// ========= CLOUD FUNCTIONS KEYS (secrets; testing only) =========
export const FUNCTION_KEYS: FunctionKeysShape = {
  stripe: {
    secret: checkBlankKey('FUNCTION_KEYS.stripe.secret', serverOnlyKey(getEnvVar('STRIPE_SECRET_KEY', KEY_STRINGS.functionKeys.stripe.secret) || '')),
    webhookSecret: checkBlankKey('FUNCTION_KEYS.stripe.webhookSecret', serverOnlyKey(getEnvVar('STRIPE_WEBHOOK_SECRET', KEY_STRINGS.functionKeys.stripe.webhookSecret) || '')),
  },
  adminBootstrap: {
    enabled: checkBlankKey('FUNCTION_KEYS.adminBootstrap.enabled', KEY_STRINGS.functionKeys.adminBootstrap.enabled),
    key: checkBlankKey('FUNCTION_KEYS.adminBootstrap.key', serverOnlyKey(getEnvVar('ADMIN_BOOTSTRAP_KEY', KEY_STRINGS.functionKeys.adminBootstrap.key) || '')),
  },
  mail: {
    provider: checkBlankKey('FUNCTION_KEYS.mail.provider', KEY_STRINGS.functionKeys.mail.provider, true),
    from: checkBlankKey('FUNCTION_KEYS.mail.from', KEY_STRINGS.functionKeys.mail.from),
    user: checkBlankKey('FUNCTION_KEYS.mail.user', KEY_STRINGS.functionKeys.mail.user),
    pass: checkBlankKey('FUNCTION_KEYS.mail.pass', serverOnlyKey(getEnvVar('MAIL_PASSWORD', KEY_STRINGS.functionKeys.mail.pass) || '')),
    host: checkBlankKey('FUNCTION_KEYS.mail.host', KEY_STRINGS.functionKeys.mail.host, true),
    port: checkBlankKey('FUNCTION_KEYS.mail.port', KEY_STRINGS.functionKeys.mail.port, true),
    secure: checkBlankKey('FUNCTION_KEYS.mail.secure', KEY_STRINGS.functionKeys.mail.secure, true),
  },
  google: {
    clientId: checkBlankKey('FUNCTION_KEYS.google.clientId', KEY_STRINGS.functionKeys.google.clientId, true),
    clientSecret: checkBlankKey('FUNCTION_KEYS.google.clientSecret', serverOnlyKey(getEnvVar('GOOGLE_CLIENT_SECRET', KEY_STRINGS.functionKeys.google.clientSecret) || '')),
    redirectUri: checkBlankKey('FUNCTION_KEYS.google.redirectUri', KEY_STRINGS.functionKeys.google.redirectUri), // Optional override. If blank, functions use computed host callback.
  },
  outlook: {
    clientId: checkBlankKey('FUNCTION_KEYS.outlook.clientId', KEY_STRINGS.functionKeys.outlook.clientId),
    clientSecret: checkBlankKey('FUNCTION_KEYS.outlook.clientSecret', serverOnlyKey(getEnvVar('MICROSOFT_CLIENT_SECRET', KEY_STRINGS.functionKeys.outlook.clientSecret) || '')),
    redirectUri: checkBlankKey('FUNCTION_KEYS.outlook.redirectUri', KEY_STRINGS.functionKeys.outlook.redirectUri), // Optional override. If blank, functions use computed host callback.
  },
}


// ========= SUPPLIERHUB SECTION KEYS (uses main app keys) =========
export const SUPPLIERHUB_KEYS: SupplierHubKeysShape = {
  ...APP_KEYS, // Use main app keys as base
  // Currently uses main app keys, but structure allows for future extensions
}

// ========= ADMIN SECTION KEYS (uses main app keys) =========
export const ADMIN_KEYS: AdminKeysShape = {
  ...APP_KEYS, // Use main app keys as base
  // Currently uses main app keys, but structure allows for future extensions
}

// ========= HELPER FUNCTIONS (defined after APP_KEYS) =========
export const getFunctionsBaseUrl = (opts: { projectId: string; region?: string }): string => {
  const region = opts.region || APP_KEYS.firebase.functionsRegion || 'us-central1'
  const useEmulator = isLocalhost() && shouldUseFunctionsEmulator()
  return useEmulator ? `http://127.0.0.1:5002/${opts.projectId}/${region}` : `https://${region}-${opts.projectId}.cloudfunctions.net`
}

export const getFunctionsFetchBaseUrl = (opts: { projectId: string; region?: string }): string => {
  const baseUrl = getFunctionsBaseUrl(opts)
  return isLocalhost() && !shouldUseFunctionsEmulator() ? "/api/functions" : baseUrl
}

/**
 * Legacy Firebase configs for backward compatibility
 * All using single Firebase project: stop-stock-a22f5
 */
export const FIREBASE_CONFIGS = {
  // Main 1Stop app (this repo) - single config for all
  main: APP_KEYS.firebase,
  yourstop: APP_KEYS.firebase,
  yourstopMessagingSw: APP_KEYS.firebase,
  mainSite: APP_KEYS.firebase,
} satisfies Record<string, FirebaseKeys>

// Default export for backward compatibility
export default APP_KEYS

// Log summary of blank keys on module load (only in browser environment)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure all keys are initialized
  setTimeout(() => {
    // Keep console clean by default.
    // Enable with: VITE_DEBUG_LOGS=true (default true in dev) or VITE_DEBUG_VERBOSE=true for extra logs.
    const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) as any
    const isDev = Boolean(env?.DEV)
    const debugLogsEnabled =
      isDev && String((env?.VITE_DEBUG_LOGS ?? 'false')).toLowerCase() === 'true'
    if (!debugLogsEnabled) return

    const blankKeys: string[] = []
    
    // Check APP_KEYS
    if (isBlankKeyValue(APP_KEYS.google.mapsApiKey)) blankKeys.push('APP_KEYS.google.mapsApiKey')
    if (isBlankKeyValue(APP_KEYS.google.placesApiKey)) blankKeys.push('APP_KEYS.google.placesApiKey')
    if (isBlankKeyValue(APP_KEYS.google.clientId)) blankKeys.push('APP_KEYS.google.clientId')
    if (isBlankKeyValue(APP_KEYS.google.clientSecret)) blankKeys.push('APP_KEYS.google.clientSecret')
    if (isBlankKeyValue(APP_KEYS.google.redirectUri)) blankKeys.push('APP_KEYS.google.redirectUri')
    if (isBlankKeyValue(APP_KEYS.stripe.secret)) blankKeys.push('APP_KEYS.stripe.secret')
    if (isBlankKeyValue(APP_KEYS.stripe.webhookSecret)) blankKeys.push('APP_KEYS.stripe.webhookSecret')
    if (isBlankKeyValue(APP_KEYS.hmrc.clientId)) blankKeys.push('APP_KEYS.hmrc.clientId')
    if (isBlankKeyValue(APP_KEYS.hmrc.clientSecret)) blankKeys.push('APP_KEYS.hmrc.clientSecret')
    
    // Check FUNCTION_KEYS
    if (isBlankKeyValue(FUNCTION_KEYS.stripe.secret)) blankKeys.push('FUNCTION_KEYS.stripe.secret')
    if (isBlankKeyValue(FUNCTION_KEYS.stripe.webhookSecret)) blankKeys.push('FUNCTION_KEYS.stripe.webhookSecret')
    if (isBlankKeyValue(FUNCTION_KEYS.adminBootstrap?.key)) blankKeys.push('FUNCTION_KEYS.adminBootstrap.key')
    if (isBlankKeyValue(FUNCTION_KEYS.mail.pass)) blankKeys.push('FUNCTION_KEYS.mail.pass')
    if (isBlankKeyValue(FUNCTION_KEYS.mail.from) || FUNCTION_KEYS.mail.from.includes('example.com')) blankKeys.push('FUNCTION_KEYS.mail.from')
    if (isBlankKeyValue(FUNCTION_KEYS.mail.user) || FUNCTION_KEYS.mail.user.includes('example.com')) blankKeys.push('FUNCTION_KEYS.mail.user')
    if (isBlankKeyValue(FUNCTION_KEYS.outlook.clientId)) blankKeys.push('FUNCTION_KEYS.outlook.clientId')
    if (isBlankKeyValue(FUNCTION_KEYS.outlook.clientSecret)) blankKeys.push('FUNCTION_KEYS.outlook.clientSecret')
    
    // Note: Using single Firebase config (stop-stock-a22f5) for all sections
    // YOURSTOP_KEYS and MAIN_SITE_KEYS are no longer used - all sections use APP_KEYS
    
    if (blankKeys.length > 0) {
      console.group('🔑 Keys Configuration Summary')
      console.warn(`Found ${blankKeys.length} blank/missing key(s):`)
      blankKeys.forEach(key => console.warn(`  - ${key}`))
      console.info('These keys are optional or need to be configured for full functionality.')
      console.groupEnd()
    }
  }, 0)
}
