/**
 * Admin Section Firebase Initialization
 * 
 * This module initializes Firebase specifically for the /admin section.
 * Each section has its own initialization to avoid code-splitting issues.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"

// CRITICAL: Import service modules FIRST to register them before using getter functions
import "firebase/auth"
import "firebase/database"
import "firebase/firestore"
import "firebase/storage"
import "firebase/functions"

// Now import getter functions after services are registered
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getDatabase, type Database } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getFunctions, type Functions } from "firebase/functions"

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
let functionsInstance: Functions | null

try {
  authInstance = getAuth(app)
} catch (error: any) {
  console.error("[Admin] Failed to initialize Firebase Auth:", error)
  throw new Error(`Firebase Auth initialization failed: ${error?.message || "Unknown error"}`)
}

try {
  firestoreInstance = getFirestore(app)
} catch (error: any) {
  console.warn("[Admin] Firestore is not available:", error?.message)
  firestoreInstance = null as unknown as Firestore
}

try {
  databaseInstance = getDatabase(app)
} catch (error: any) {
  console.error("[Admin] Failed to initialize Realtime Database:", error)
  databaseInstance = null as unknown as Database
}

try {
  storageInstance = getStorage(app)
} catch (error: any) {
  console.warn("[Admin] Storage is not available:", error?.message)
  storageInstance = null
}

try {
  functionsInstance = getFunctions(app)
} catch (error: any) {
  console.warn("[Admin] Functions is not available:", error?.message)
  functionsInstance = null
}

// Export services
export const auth: Auth = authInstance
export const firestore: Firestore = firestoreInstance
export const database: Database = databaseInstance
export const storage = storageInstance
export const functions: Functions | null = functionsInstance

// Aliases
export const dbs = firestore
export const db = database
export const functionsApp = functions

export { app }
export default app
