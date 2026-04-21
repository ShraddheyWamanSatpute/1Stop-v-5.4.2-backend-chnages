"use strict";
/**
 * Shared Firebase Admin initialization
 * Initialize once and reuse across all functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.firestore = void 0;
const app_1 = require("firebase-admin/app");
const database_1 = require("firebase-admin/database");
const firestore_1 = require("firebase-admin/firestore");
function safeJsonParse(raw) {
    if (!raw)
        return undefined;
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return undefined;
    }
}
function getDatabaseUrlFromEnv() {
    var _a;
    // Prefer explicit override if the developer sets it.
    if (process.env.FIREBASE_DATABASE_URL)
        return process.env.FIREBASE_DATABASE_URL;
    // Firebase runtime often provides this.
    const firebaseConfig = safeJsonParse(process.env.FIREBASE_CONFIG);
    const urlFromFirebaseConfig = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.databaseURL;
    if (typeof urlFromFirebaseConfig === "string" && urlFromFirebaseConfig)
        return urlFromFirebaseConfig;
    // 1st gen functions config commonly lands here (and can include databaseURL).
    const cloudRuntime = safeJsonParse(process.env.CLOUD_RUNTIME_CONFIG);
    const urlFromCloudRuntime = (_a = cloudRuntime === null || cloudRuntime === void 0 ? void 0 : cloudRuntime.firebase) === null || _a === void 0 ? void 0 : _a.databaseURL;
    if (typeof urlFromCloudRuntime === "string" && urlFromCloudRuntime)
        return urlFromCloudRuntime;
    return undefined;
}
// Initialize Firebase Admin only once.
// IMPORTANT: must never throw during module load, otherwise firebase-tools cannot analyze exports during deploy.
if ((0, app_1.getApps)().length === 0) {
    try {
        const databaseURL = getDatabaseUrlFromEnv();
        (0, app_1.initializeApp)(databaseURL ? { databaseURL } : undefined);
    }
    catch (error) {
        console.warn("Firebase Admin init warning (safe to ignore during deploy analysis):", error);
    }
}
// Export initialized services
exports.firestore = (() => {
    try {
        return (0, firestore_1.getFirestore)();
    }
    catch (error) {
        console.warn("Firestore init warning (safe to ignore during deploy analysis):", error);
        return null;
    }
})();
exports.db = (() => {
    try {
        return (0, database_1.getDatabase)();
    }
    catch (error) {
        // This happens when databaseURL cannot be inferred (common during firebase deploy export-analysis).
        // We intentionally avoid throwing here so deploy can proceed. Runtime invocations in Cloud Functions
        // will have FIREBASE_CONFIG and will initialize correctly.
        console.warn("RTDB init warning (safe to ignore during deploy analysis):", error);
        return null;
    }
})();
//# sourceMappingURL=admin.js.map