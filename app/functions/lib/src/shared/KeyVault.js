"use strict";
/**
 * KeyVault (testing)
 * Single source of truth for ALL keys used by:
 * - Frontend (Firebase config, public API keys)
 * - Cloud Functions (OAuth client secrets, mail creds, Stripe secret, etc)
 *
 * IMPORTANT:
 * - This file is intentionally HARD-CODED for testing.
 * - Do NOT ship production secrets in frontend bundles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIREBASE_CONFIGS = exports.FUNCTION_KEYS = exports.APP_KEYS = exports.getFunctionsBaseUrl = void 0;
const isLocalhost = () => {
    var _a;
    if (typeof window === 'undefined')
        return false;
    const h = ((_a = window.location) === null || _a === void 0 ? void 0 : _a.hostname) || '';
    return h === 'localhost' || h === '127.0.0.1';
};
const getFunctionsBaseUrl = (opts) => {
    const region = opts.region || exports.APP_KEYS.firebase.functionsRegion || 'us-central1';
    return isLocalhost()
        ? `http://127.0.0.1:5002/${opts.projectId}/${region}`
        : `https://${region}-${opts.projectId}.cloudfunctions.net`;
};
exports.getFunctionsBaseUrl = getFunctionsBaseUrl;
// ========= FRONTEND (public) =========
exports.APP_KEYS = {
    firebase: {
        apiKey: 'AIzaSyCsCjKGU4zTyjFlgI8uxdWqcU9zEJozOC4',
        authDomain: 'stop-test-8025f.firebaseapp.com',
        databaseURL: 'https://stop-test-8025f-default-rtdb.europe-west1.firebasedatabase.app',
        projectId: 'stop-test-8025f',
        storageBucket: 'stop-test-8025f.firebasestorage.app',
        messagingSenderId: '371297109865',
        appId: '1:371297109865:web:72eaea2c25f94e08d45ff8',
        measurementId: 'G-DXBXG4X1Z7',
        functionsRegion: 'us-central1',
    },
    stripe: {
        // Testing publishable key (replace as needed)
        publishableKey: 'pk_test_51S52tUQ34hzSXGP0Uoza2izEfpUhNHaQRJb4dSzdNc8gqeEYOHFtMvw2AkB7s8ybLOBq39stbddARPU7SWv6hE4E00HptWImz0',
    },
    google: {
        // Used by WeatherService (Geocoding + Weather API)
        // Replace with your test key that has Geocoding + Weather enabled
        mapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    },
    hmrc: {
        // Replace with your test HMRC app credentials
        clientId: 'YOUR_HMRC_CLIENT_ID',
        clientSecret: 'YOUR_HMRC_CLIENT_SECRET',
        redirectUri: 'http://localhost:5173/hmrc/callback',
        oauthScope: 'hello',
    },
};
// ========= CLOUD FUNCTIONS (secrets; testing only) =========
exports.FUNCTION_KEYS = {
    stripe: {
        secret: 'sk_test_YOUR_STRIPE_SECRET',
        webhookSecret: 'whsec_YOUR_STRIPE_WEBHOOK_SECRET',
    },
    // Dev-only admin bootstrap.
    // This should remain DISABLED unless you are intentionally enabling it for testing.
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
        // Gmail OAuth client (Cloud Functions)
        clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
        redirectUri: '', // Optional override. If blank, functions use computed host callback.
    },
    outlook: {
        clientId: 'YOUR_MICROSOFT_CLIENT_ID',
        clientSecret: 'YOUR_MICROSOFT_CLIENT_SECRET',
        redirectUri: '', // Optional override. If blank, functions use computed host callback.
    },
};
/**
 * Other Firebase configs that were previously hard-coded in the repo.
 * Keeping them here makes it easy to centralize any future refactors.
 */
exports.FIREBASE_CONFIGS = {
    // Main 1Stop app (this repo)
    main: exports.APP_KEYS.firebase,
    // YourStop / BookMyTable project
    yourstop: {
        projectId: 'bookmytable-ea37d',
        appId: '1:1049141485409:web:6e8dbad1eaf713d3046f20',
        storageBucket: 'bookmytable-ea37d.firebasestorage.app',
        apiKey: 'AIzaSyDtqWWLKIF7ZMi2X21NhxkiCgoVUPIsV5I',
        authDomain: 'bookmytable-ea37d.firebaseapp.com',
        databaseURL: 'https://bookmytable-ea37d-default-rtdb.firebaseio.com',
        measurementId: 'G-EYMZ6KB690',
        messagingSenderId: '1049141485409',
        functionsRegion: 'us-central1',
    },
    // YourStop service worker messaging project
    yourstopMessagingSw: {
        apiKey: 'AIzaSyAroNz27vVovd8uAT7H8gsrWUGwPF6PINc',
        authDomain: 'studio-3045449262-19c49.firebaseapp.com',
        projectId: 'studio-3045449262-19c49',
        storageBucket: 'studio-3045449262-19c49.firebasestorage.app',
        messagingSenderId: '555281548038',
        appId: '1:555281548038:web:799e1f5161d6e8b6789487',
        databaseURL: '',
        functionsRegion: 'us-central1',
    },
};
//# sourceMappingURL=KeyVault.js.map