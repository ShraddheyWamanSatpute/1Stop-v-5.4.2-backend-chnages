/**
 * App Section Firebase Initialization
 * 
 * This module initializes Firebase specifically for the /app section.
 * Each section has its own initialization to avoid code-splitting issues
 * where different chunks might use different Firebase SDK instances.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"

// CRITICAL: Import service modules FIRST to register them before using getter functions
// These side-effect imports must come before importing getter functions
import "firebase/auth"
import "firebase/database"
import "firebase/firestore"
import "firebase/storage"
import "firebase/functions"
import "firebase/ai"

// Now import getter functions after services are registered
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getDatabase, type Database } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getFunctions, type Functions } from "firebase/functions"
import { getAI, VertexAIBackend } from "firebase/ai"

import { APP_KEYS } from "../config/keys"

// Initialize Firebase app for this section
let app: FirebaseApp

const config = APP_KEYS.firebase
if (!config) {
  throw new Error("Firebase configuration (APP_KEYS.firebase) is undefined")
}
if (!config.apiKey) {
  throw new Error("Firebase configuration is missing apiKey")
}
if (!config.projectId) {
  throw new Error("Firebase configuration is missing projectId")
}

// Remove functionsRegion from config (server-side only)
const { functionsRegion, ...firebaseConfig } = config

// Initialize app - reuse existing app if available, otherwise create new
try {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    // If app already exists, reuse it (another section may have initialized it)
    app = getApp()
  } else {
    // Initialize new app (default name)
    app = initializeApp(firebaseConfig)
  }
} catch (e: any) {
  if (e?.code === "app/duplicate-app") {
    app = getApp()
  } else {
    throw e
  }
}

// Initialize services
let authInstance: Auth
let firestoreInstance: Firestore
let databaseInstance: Database
let storageInstance: ReturnType<typeof getStorage> | null
let functionsInstance: Functions | null
let aiInstance: any

try {
  authInstance = getAuth(app)
} catch (error: any) {
  console.error("[App] Failed to initialize Firebase Auth:", error)
  throw new Error(`Firebase Auth initialization failed: ${error?.message || "Unknown error"}`)
}

try {
  firestoreInstance = getFirestore(app)
  console.log("[App] Firestore initialized successfully")
} catch (error: any) {
  console.warn("[App] Firestore is not available:", error?.message)
  firestoreInstance = null as unknown as Firestore
}

try {
  databaseInstance = getDatabase(app)
  console.log("[App] ✅ Realtime Database initialized successfully")
} catch (error: any) {
  console.error("[App] Failed to initialize Realtime Database:", error)
  databaseInstance = null as unknown as Database
}

try {
  storageInstance = getStorage(app)
  console.log("[App] Storage initialized successfully")
} catch (error: any) {
  console.warn("[App] Storage is not available:", error?.message)
  storageInstance = null
}

try {
  functionsInstance = getFunctions(app)
  console.log("[App] Functions initialized successfully")
} catch (error: any) {
  console.warn("[App] Functions is not available:", error?.message)
  functionsInstance = null
}

try {
  aiInstance = getAI(app, { backend: new VertexAIBackend() })
  console.log("[App] AI initialized successfully")
} catch (error: any) {
  console.warn("[App] AI is not available:", error?.message)
  aiInstance = null
}

// Export services
export const auth: Auth = authInstance
export const firestore: Firestore = firestoreInstance
export const database: Database = databaseInstance
export const storage = storageInstance
export const functions: Functions | null = functionsInstance
export const ai = aiInstance

// Aliases
export const dbs = firestore
export const db = database
export const functionsApp = functions

export { app }
export default app

// Re-export commonly used functions
export { getGenerativeModel, VertexAIBackend } from "firebase/ai"
