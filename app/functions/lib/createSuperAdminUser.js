"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuperAdminUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const auth_1 = require("firebase-admin/auth");
function nowMs() {
    return Date.now();
}
async function requireUser(req) {
    var _a;
    const authHeader = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token)
        throw new Error("Missing Authorization Bearer token");
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
    return decoded;
}
async function isSuperAdmin(uid) {
    const snap = await admin_1.db.ref(`users/${uid}/isAdmin`).get();
    return Boolean(snap.val());
}
exports.createSuperAdminUser = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method not allowed" });
            return;
        }
        const decoded = await requireUser(req);
        const requesterUid = decoded.uid;
        const ok = await isSuperAdmin(requesterUid);
        if (!ok) {
            res.status(403).json({ success: false, error: "Not authorized" });
            return;
        }
        const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || "").trim().toLowerCase();
        const password = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) || "");
        const displayName = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.displayName) || "").trim();
        const firstName = String(((_d = req.body) === null || _d === void 0 ? void 0 : _d.firstName) || "").trim();
        const lastName = String(((_e = req.body) === null || _e === void 0 ? void 0 : _e.lastName) || "").trim();
        const addToAllCompanies = Boolean((_g = (_f = req.body) === null || _f === void 0 ? void 0 : _f.addToAllCompanies) !== null && _g !== void 0 ? _g : true);
        if (!email || !password || !displayName) {
            res.status(400).json({ success: false, error: "email, password, and displayName are required" });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
            return;
        }
        const auth = (0, auth_1.getAuth)();
        const created = await auth.createUser({
            email,
            password,
            displayName,
        });
        const uid = created.uid;
        const now = nowMs();
        // Create user profile in RTDB
        await admin_1.db.ref(`users/${uid}`).set({
            uid,
            email,
            displayName,
            firstName,
            lastName,
            photoURL: "",
            createdAt: now,
            lastLogin: now,
            isAdmin: true,
            settings: {
                theme: "light",
                notifications: true,
                language: "en",
            },
        });
        if (addToAllCompanies) {
            const companiesSnap = await admin_1.db.ref("companies").get();
            const companies = companiesSnap.val() || {};
            const updates = {};
            let first = true;
            Object.keys(companies).forEach((companyId) => {
                var _a;
                const companyName = ((_a = companies === null || companies === void 0 ? void 0 : companies[companyId]) === null || _a === void 0 ? void 0 : _a.companyName) || "Unknown Company";
                const companyData = {
                    companyID: companyId,
                    companyName,
                    role: "owner",
                    department: "Management",
                    joinedAt: now,
                    isDefault: first,
                };
                first = false;
                updates[`users/${uid}/companies/${companyId}`] = companyData;
                updates[`companies/${companyId}/users/${uid}`] = {
                    role: "owner",
                    department: "Management",
                    joinedAt: now,
                    email,
                    displayName,
                };
            });
            if (Object.keys(updates).length > 0) {
                await admin_1.db.ref().update(updates);
            }
        }
        res.json({ success: true, uid });
    }
    catch (e) {
        console.error("createSuperAdminUser error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
//# sourceMappingURL=createSuperAdminUser.js.map