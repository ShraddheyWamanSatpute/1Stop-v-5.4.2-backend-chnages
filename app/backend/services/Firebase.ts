/**
 * Firebase Services for App Section
 * 
 * This module initializes Firebase specifically for the /app section and provides
 * unified access to all Firebase services and utilities.
 * Each section has its own initialization to avoid code-splitting issues
 * where different chunks might use different Firebase SDK instances.
 */

// Firebase SDK imports
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

// Import additional Firebase functions and types for re-export
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, User, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, where, updateDoc, serverTimestamp, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, set, remove, update, get, push, onValue, DatabaseReference, off, child, orderByChild, equalTo, limitToLast, query as rtdbQuery, runTransaction } from 'firebase/database';
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument, useCollection, useCollectionData } from "react-firebase-hooks/firestore";
import { ref as ref1, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

// Local imports
import { APP_KEYS } from "../config/keys"
import { debugLog, debugWarn } from "../utils/debugLog"

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
  debugLog("[App] Firestore initialized successfully")
} catch (error: any) {
  debugWarn("[App] Firestore is not available:", error?.message)
  firestoreInstance = null as unknown as Firestore
}

try {
  databaseInstance = getDatabase(app)
  debugLog("[App] ✅ Realtime Database initialized successfully")
} catch (error: any) {
  console.error("[App] Failed to initialize Realtime Database:", error)
  databaseInstance = null as unknown as Database
}

try {
  storageInstance = getStorage(app)
  debugLog("[App] Storage initialized successfully")
} catch (error: any) {
  debugWarn("[App] Storage is not available:", error?.message)
  storageInstance = null
}

try {
  functionsInstance = getFunctions(app)
  debugLog("[App] Functions initialized successfully")
} catch (error: any) {
  debugWarn("[App] Functions is not available:", error?.message)
  functionsInstance = null
}

try {
  aiInstance = getAI(app, { backend: new VertexAIBackend() })
  debugLog("[App] AI initialized successfully")
} catch (error: any) {
  debugWarn("[App] AI is not available:", error?.message)
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

// Re-export commonly used functions and types
export { getGenerativeModel, VertexAIBackend } from "firebase/ai"

export { ref, child, set, ref1, storageRef, orderByChild,
  equalTo,
  limitToLast,
   getDocs, where,off, rtdbQuery, runTransaction, updateDoc, uploadBytes, getDownloadURL, addDoc, useCollection,query, orderBy, serverTimestamp, onSnapshot,collection, useCollectionData, onValue, remove, update, get, push, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, useAuthState, useDocument, signOut, httpsCallable };
export type {User, DatabaseReference}

export interface ExtendedDatabaseReference extends DatabaseReference {
  orderByChild(childPath: string): any; // Use 'any' for orderByChild as TypeScript does not provide typings
  equalTo(value: any, key?: string): DatabaseReference;
}

export const uploadFile = async (file: File, folder: string = "files"): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!storage) {
      reject(new Error("Firebase Storage is not initialized"));
      return;
    }
    
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${randomId}_${safeName}`;
    
    const storageRef = ref1(storage, `${folder}/${uniqueFileName}`);
    uploadBytes(storageRef, file).then((snapshot: { ref: any; }) => {
      getDownloadURL(snapshot.ref).then((downloadURL: string | PromiseLike<string>) => {
        resolve(downloadURL);
      }).catch((error: any) => {
        reject(error);
      });
    }).catch((error: any) => {
      reject(error);
    });
  });
};

export const fetchTables = async () => {
  const tablesRef = ref(db, "path/to/tables"); // Ensure `db` is passed here
  const snapshot = await get(tablesRef);

  if (snapshot.exists()) {
    debugLog(snapshot.val());
  }
};