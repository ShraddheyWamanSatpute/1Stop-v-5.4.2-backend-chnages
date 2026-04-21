/**
 * Mobile Section Firebase Initialization
 * 
 * This module initializes Firebase specifically for the /mobile section.
 * Each section has its own initialization to avoid code-splitting issues.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"

// CRITICAL: Import service modules FIRST to register them before using getter functions
import "firebase/auth"
import "firebase/database"
import "firebase/firestore"
import "firebase/storage"

// Now import getter functions after services are registered
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getDatabase, type Database } from "firebase/database"
import { getStorage } from "firebase/storage"

import { APP_KEYS } from "../../app/backend/config/keys"

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

// Remove functionsRegion from config
const { functionsRegion, ...firebaseConfig } = config

try {
  const existingApps = getApps()
  if (existingApps.length > 0) {
    app = getApp()
  } else {
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

try {
  authInstance = getAuth(app)
  console.log("[Mobile] Auth initialized successfully")
} catch (error: any) {
  console.error("[Mobile] Failed to initialize Firebase Auth:", error)
  throw new Error(`Firebase Auth initialization failed: ${error?.message || "Unknown error"}`)
}

try {
  firestoreInstance = getFirestore(app)
  console.log("[Mobile] Firestore initialized successfully")
} catch (error: any) {
  console.warn("[Mobile] Firestore is not available:", error?.message)
  firestoreInstance = null as unknown as Firestore
}

try {
  databaseInstance = getDatabase(app)
  console.log("[Mobile] ✅ Realtime Database initialized successfully")
} catch (error: any) {
  console.error("[Mobile] Failed to initialize Realtime Database:", error)
  databaseInstance = null as unknown as Database
}

try {
  storageInstance = getStorage(app)
  console.log("[Mobile] Storage initialized successfully")
} catch (error: any) {
  console.warn("[Mobile] Storage is not available:", error?.message)
  storageInstance = null
}

// Export services
export const auth: Auth = authInstance
export const firestore: Firestore = firestoreInstance
export const database: Database = databaseInstance
export const storage = storageInstance

// Aliases
export const dbs = firestore
export const db = database

export { app }
export default app
