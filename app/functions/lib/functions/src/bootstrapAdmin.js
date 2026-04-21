"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const database_1 = require("firebase-admin/database");
const keys_1 = require("./keys");
function isEmulator() {
    return Boolean(process.env.FUNCTIONS_EMULATOR) || Boolean(process.env.FIREBASE_EMULATOR_HUB);
}
function json(res, status, body) {
    res.status(status).set("Content-Type", "application/json").send(JSON.stringify(body));
}
async function findUserByEmailInRtdb(db, email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized)
        return null;
    const usersRef = db.ref("users");
    // RTDB query: users ordered by email equals {email}
    const snap = await usersRef.orderByChild("email").equalTo(normalized).limitToFirst(1).get();
    if (!snap.exists())
        return null;
    const val = snap.val() || {};
    const key = Object.keys(val)[0];
    const userData = key ? val[key] : null;
    if (!key || !userData)
        return null;
    return { key, userData };
}
exports.bootstrapAdmin = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        json(res, 405, { success: false, error: "Method not allowed" });
        return;
    }
    const body = (req.body || {});
    const mode = String(body.mode || "");
    const enabledByKey = Boolean((_a = keys_1.FUNCTION_KEYS === null || keys_1.FUNCTION_KEYS === void 0 ? void 0 : keys_1.FUNCTION_KEYS.adminBootstrap) === null || _a === void 0 ? void 0 : _a.enabled) &&
        String(body.bootstrapKey || "") === String(((_b = keys_1.FUNCTION_KEYS === null || keys_1.FUNCTION_KEYS === void 0 ? void 0 : keys_1.FUNCTION_KEYS.adminBootstrap) === null || _b === void 0 ? void 0 : _b.key) || "");
    if (!isEmulator() && !enabledByKey) {
        json(res, 403, { success: false, error: "Admin bootstrap is disabled." });
        return;
    }
    if (mode !== "create" && mode !== "promote") {
        json(res, 400, { success: false, error: "Invalid mode. Use 'create' or 'promote'." });
        return;
    }
    try {
        const adminAuth = (0, auth_1.getAuth)();
        const db = (0, database_1.getDatabase)();
        const now = Date.now();
        let userRecord;
        let passwordEcho;
        let promotedFrom = "auth";
        if (mode === "create") {
            const email = String(body.email || "").trim().toLowerCase();
            const password = String(body.password || "");
            const displayName = String(body.displayName || "Test Admin").trim();
            if (!email || !password) {
                json(res, 400, { success: false, error: "email and password are required for create." });
                return;
            }
            userRecord = await adminAuth.createUser({
                email,
                password,
                displayName,
                emailVerified: true,
            });
            passwordEcho = password;
        }
        else {
            const targetUid = String(body.uid || "").trim();
            const targetEmail = String(body.email || "").trim().toLowerCase();
            if (!targetUid && !targetEmail) {
                json(res, 400, { success: false, error: "uid or email is required for promote." });
                return;
            }
            if (targetUid) {
                // Prefer Auth lookup by UID when provided (guarantees /users/{uid} is the correct key).
                userRecord = await adminAuth.getUser(targetUid);
            }
            else {
                // Promote by email: first try Auth (fast path). If that fails, fall back to RTDB /users lookup.
                try {
                    userRecord = await adminAuth.getUserByEmail(targetEmail);
                }
                catch (_g) {
                    const match = await findUserByEmailInRtdb(db, targetEmail);
                    if (!match) {
                        json(res, 404, { success: false, error: "No user found in /users for that email." });
                        return;
                    }
                    const inferredUid = String(((_c = match.userData) === null || _c === void 0 ? void 0 : _c.uid) || match.key || "").trim();
                    if (!inferredUid) {
                        json(res, 400, { success: false, error: "User record missing uid; cannot promote reliably." });
                        return;
                    }
                    promotedFrom = "rtdb";
                    // Attempt to fetch Auth user by inferred uid (may not exist).
                    try {
                        userRecord = await adminAuth.getUser(inferredUid);
                    }
                    catch (_h) {
                        userRecord = { uid: inferredUid, email: ((_d = match.userData) === null || _d === void 0 ? void 0 : _d.email) || targetEmail, displayName: ((_e = match.userData) === null || _e === void 0 ? void 0 : _e.displayName) || "" };
                    }
                    // Ensure canonical /users/{uid} exists (migrate if needed).
                    if (match.key !== inferredUid) {
                        await db.ref(`users/${inferredUid}`).update(Object.assign(Object.assign({}, (match.userData || {})), { uid: inferredUid, email: String(((_f = match.userData) === null || _f === void 0 ? void 0 : _f.email) || targetEmail).trim().toLowerCase(), migratedAt: now, updatedAt: now }));
                    }
                }
            }
        }
        const uid = userRecord.uid;
        const email = userRecord.email || "";
        try {
            await adminAuth.setCustomUserClaims(uid, Object.assign(Object.assign({}, (userRecord.customClaims || {})), { isAdmin: true }));
        }
        catch (_j) {
            // Claims are optional for this app (we primarily use RTDB isAdmin).
        }
        // Ensure a usable user profile exists for SettingsContext login (expects companies array).
        const userRef = db.ref(`users/${uid}`);
        await userRef.update(Object.assign({ uid, email: String(email || "").trim().toLowerCase(), displayName: userRecord.displayName || "", isAdmin: true, companies: [], updatedAt: now }, (mode === "create" ? { createdAt: now } : {})));
        json(res, 200, {
            success: true,
            mode,
            uid,
            email,
            password: passwordEcho,
            emulator: isEmulator(),
            promotedFrom,
        });
    }
    catch (e) {
        json(res, 500, { success: false, error: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
    }
});
//# sourceMappingURL=bootstrapAdmin.js.map