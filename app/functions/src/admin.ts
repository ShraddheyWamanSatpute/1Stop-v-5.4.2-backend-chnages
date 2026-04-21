/**
 * Shared Firebase Admin initialization
 * Initialize once and reuse across all functions
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function safeJsonParse(raw: string | undefined): any {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function getDatabaseUrlFromEnv(): string | undefined {
  // Prefer explicit override if the developer sets it.
  if (process.env.FIREBASE_DATABASE_URL) return process.env.FIREBASE_DATABASE_URL;

  // Firebase runtime often provides this.
  const firebaseConfig = safeJsonParse(process.env.FIREBASE_CONFIG);
  const urlFromFirebaseConfig = firebaseConfig?.databaseURL;
  if (typeof urlFromFirebaseConfig === "string" && urlFromFirebaseConfig) return urlFromFirebaseConfig;

  // 1st gen functions config commonly lands here (and can include databaseURL).
  const cloudRuntime = safeJsonParse(process.env.CLOUD_RUNTIME_CONFIG);
  const urlFromCloudRuntime = cloudRuntime?.firebase?.databaseURL;
  if (typeof urlFromCloudRuntime === "string" && urlFromCloudRuntime) return urlFromCloudRuntime;

  return undefined;
}

// Initialize Firebase Admin only once.
// IMPORTANT: must never throw during module load, otherwise firebase-tools cannot analyze exports during deploy.
if (getApps().length === 0) {
  try {
    const databaseURL = getDatabaseUrlFromEnv();
    initializeApp(databaseURL ? { databaseURL } : undefined);
  } catch (error) {
    console.warn("Firebase Admin init warning (safe to ignore during deploy analysis):", error);
  }
}

// Export initialized services
export const firestore: Firestore = (() => {
  try {
    return getFirestore();
  } catch (error) {
    console.warn("Firestore init warning (safe to ignore during deploy analysis):", error);
    return null as unknown as Firestore;
  }
})();

export const db: Database = (() => {
  try {
    return getDatabase();
  } catch (error) {
    // This happens when databaseURL cannot be inferred (common during firebase deploy export-analysis).
    // We intentionally avoid throwing here so deploy can proceed. Runtime invocations in Cloud Functions
    // will have FIREBASE_CONFIG and will initialize correctly.
    console.warn("RTDB init warning (safe to ignore during deploy analysis):", error);
    return null as unknown as Database;
  }
})();

