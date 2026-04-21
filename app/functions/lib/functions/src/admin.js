"use strict";
/**
 * Shared Firebase Admin initialization
 * Initialize once and reuse across all functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestore = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const database_1 = require("firebase-admin/database");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin only once
if ((0, app_1.getApps)().length === 0) {
    try {
        // Use default credentials (automatically available in Cloud Functions)
        // In local emulator, it will use application default credentials or service account
        // In production, it uses the default service account automatically
        (0, app_1.initializeApp)();
    }
    catch (error) {
        console.error('Error initializing Firebase Admin:', error);
    }
}
// Export initialized services
exports.db = (0, database_1.getDatabase)();
exports.firestore = (0, firestore_1.getFirestore)();
//# sourceMappingURL=admin.js.map