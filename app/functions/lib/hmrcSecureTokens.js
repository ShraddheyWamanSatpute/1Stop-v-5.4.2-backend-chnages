"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmrcRefreshAccessToken = exports.hmrcExchangeCodeAndStoreTokens = exports.hmrcGetConnectionStatus = exports.hmrcSaveClientSecret = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const hmrcSecretsUtil_1 = require("./hmrcSecretsUtil");
function parseLevel(level) {
    if (level === "company" || level === "site" || level === "subsite")
        return level;
    throw new https_1.HttpsError("invalid-argument", "Invalid level (company|site|subsite)");
}
async function requireCompanyMemberOrAdmin(uid, companyId) {
    var _a;
    const userSnap = await admin_1.db.ref(`users/${uid}`).get();
    const user = (userSnap.val() || {});
    const isAdmin = Boolean(user === null || user === void 0 ? void 0 : user.isAdmin);
    const isAdminStaff = Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active);
    const membershipSnap = await admin_1.db.ref(`users/${uid}/companies/${companyId}`).get();
    const membership = (membershipSnap.val() || {});
    const role = typeof (membership === null || membership === void 0 ? void 0 : membership.role) === "string" ? membership.role : undefined;
    if (isAdmin || isAdminStaff)
        return { role, isAdmin, isAdminStaff };
    if (membershipSnap.exists())
        return { role, isAdmin, isAdminStaff };
    throw new https_1.HttpsError("permission-denied", "User is not a member of this company");
}
function requireOwnerOrAdmin(meta) {
    if (meta.isAdmin || meta.isAdminStaff)
        return;
    const r = String(meta.role || "").trim().toLowerCase();
    if (r === "owner")
        return;
    throw new https_1.HttpsError("permission-denied", "Owner/admin required");
}
exports.hmrcSaveClientSecret = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    const level = parseLevel((_g = req.data) === null || _g === void 0 ? void 0 : _g.level);
    const clientSecret = String(((_h = req.data) === null || _h === void 0 ? void 0 : _h.clientSecret) || "");
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    if (!clientSecret || clientSecret.length < 8)
        throw new https_1.HttpsError("invalid-argument", "clientSecret is required");
    const meta = await requireCompanyMemberOrAdmin(uid, companyId);
    requireOwnerOrAdmin(meta);
    const key = (0, hmrcSecretsUtil_1.getHMRCEncryptionKey)();
    const secretsPath = (0, hmrcSecretsUtil_1.getHMRCSecretsPath)({ companyId, siteId, subsiteId, level });
    await admin_1.db.ref(secretsPath).update({
        hmrcClientSecret: (0, hmrcSecretsUtil_1.encryptSecret)(clientSecret, key),
        updatedAt: Date.now(),
    });
    return { success: true, storedAt: level };
});
exports.hmrcGetConnectionStatus = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    await requireCompanyMemberOrAdmin(uid, companyId);
    const foundAt = await (0, hmrcSecretsUtil_1.findHMRCLevel)(companyId, siteId, subsiteId);
    if (!foundAt)
        return { connected: false, status: "disconnected", foundAt: null };
    const key = (0, hmrcSecretsUtil_1.getHMRCEncryptionKey)();
    const secretsPath = (0, hmrcSecretsUtil_1.getHMRCSecretsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const secretsSnap = await admin_1.db.ref(secretsPath).get();
    const secrets = (secretsSnap.val() || {});
    const hasClientSecret = Boolean((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcClientSecret, key));
    const tokenExpiry = typeof secrets.hmrcTokenExpiry === "number" ? secrets.hmrcTokenExpiry : 0;
    const hasRefreshToken = Boolean((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcRefreshToken, key));
    if (!hasRefreshToken)
        return { connected: false, status: "disconnected", foundAt, hasClientSecret };
    const now = Date.now();
    if (tokenExpiry > now + 300000) {
        return { connected: true, status: "connected", foundAt, tokenExpiry, hasClientSecret };
    }
    return { connected: true, status: "expired", foundAt, tokenExpiry, hasClientSecret };
});
exports.hmrcExchangeCodeAndStoreTokens = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    const code = String(((_g = req.data) === null || _g === void 0 ? void 0 : _g.code) || "").trim();
    const redirectUri = String(((_h = req.data) === null || _h === void 0 ? void 0 : _h.redirectUri) || "").trim();
    const environment = (((_j = req.data) === null || _j === void 0 ? void 0 : _j.environment) === "production" ? "production" : "sandbox");
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    if (!code)
        throw new https_1.HttpsError("invalid-argument", "code is required");
    if (!redirectUri)
        throw new https_1.HttpsError("invalid-argument", "redirectUri is required");
    const meta = await requireCompanyMemberOrAdmin(uid, companyId);
    requireOwnerOrAdmin(meta);
    const foundAt = await (0, hmrcSecretsUtil_1.findHMRCLevel)(companyId, siteId, subsiteId);
    if (!foundAt)
        throw new https_1.HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.");
    const settingsPath = (0, hmrcSecretsUtil_1.getHMRCSettingsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const settingsSnap = await admin_1.db.ref(settingsPath).get();
    const settings = (settingsSnap.val() || {});
    const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim();
    if (!clientId)
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC clientId (set hmrcClientId in settings or HMRC_CLIENT_ID env)");
    const key = (0, hmrcSecretsUtil_1.getHMRCEncryptionKey)();
    const secretsPath = (0, hmrcSecretsUtil_1.getHMRCSecretsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const secretsSnap = await admin_1.db.ref(secretsPath).get();
    const secrets = (secretsSnap.val() || {});
    const clientSecret = String((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcClientSecret, key) || "").trim() ||
        String(process.env.HMRC_CLIENT_SECRET || "").trim();
    if (!clientSecret)
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC clientSecret (save via hmrcSaveClientSecret or set HMRC_CLIENT_SECRET env)");
    const baseUrl = environment === "sandbox" ? "https://test-api.service.hmrc.gov.uk" : "https://api.service.hmrc.gov.uk";
    const tokenUrl = `${baseUrl}/oauth/token`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
            Accept: "application/json",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });
    const rawText = await response.text();
    if (!response.ok) {
        throw new https_1.HttpsError("unknown", `HMRC token exchange failed: HTTP ${response.status} ${rawText.slice(0, 500)}`);
    }
    let tokenData = {};
    try {
        tokenData = JSON.parse(rawText);
    }
    catch (_k) {
        throw new https_1.HttpsError("unknown", "HMRC token exchange returned invalid JSON");
    }
    const expiresIn = Number(tokenData.expires_in || 0);
    const expiryTime = Date.now() + Math.max(0, expiresIn) * 1000;
    await admin_1.db.ref(secretsPath).update({
        hmrcAccessToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.access_token || ""), key),
        hmrcRefreshToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.refresh_token || ""), key),
        hmrcTokenExpiry: expiryTime,
        hmrcEnvironment: environment,
        lastHMRCAuthDate: Date.now(),
        updatedAt: Date.now(),
    });
    return { success: true, storedAt: foundAt, tokenExpiry: expiryTime };
});
exports.hmrcRefreshAccessToken = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    const meta = await requireCompanyMemberOrAdmin(uid, companyId);
    requireOwnerOrAdmin(meta);
    const foundAt = await (0, hmrcSecretsUtil_1.findHMRCLevel)(companyId, siteId, subsiteId);
    if (!foundAt)
        throw new https_1.HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.");
    const settingsPath = (0, hmrcSecretsUtil_1.getHMRCSettingsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const settingsSnap = await admin_1.db.ref(settingsPath).get();
    const settings = (settingsSnap.val() || {});
    const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim();
    if (!clientId)
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC clientId (set hmrcClientId in settings or HMRC_CLIENT_ID env)");
    const key = (0, hmrcSecretsUtil_1.getHMRCEncryptionKey)();
    const secretsPath = (0, hmrcSecretsUtil_1.getHMRCSecretsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const secretsSnap = await admin_1.db.ref(secretsPath).get();
    const secrets = (secretsSnap.val() || {});
    const refreshToken = String((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcRefreshToken, key) || "").trim();
    const clientSecret = String((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcClientSecret, key) || "").trim() || String(process.env.HMRC_CLIENT_SECRET || "").trim();
    const environment = (secrets.hmrcEnvironment === "production" ? "production" : "sandbox");
    if (!refreshToken)
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC refresh token. Reconnect to HMRC.");
    if (!clientSecret)
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC client secret (save via hmrcSaveClientSecret or set HMRC_CLIENT_SECRET env)");
    const baseUrl = environment === "sandbox" ? "https://test-api.service.hmrc.gov.uk" : "https://api.service.hmrc.gov.uk";
    const tokenUrl = `${baseUrl}/oauth/token`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
            Accept: "application/json",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }).toString(),
    });
    const rawText = await response.text();
    if (!response.ok) {
        throw new https_1.HttpsError("unknown", `HMRC token refresh failed: HTTP ${response.status} ${rawText.slice(0, 500)}`);
    }
    let tokenData = {};
    try {
        tokenData = JSON.parse(rawText);
    }
    catch (_g) {
        throw new https_1.HttpsError("unknown", "HMRC token refresh returned invalid JSON");
    }
    const expiresIn = Number(tokenData.expires_in || 0);
    const expiryTime = Date.now() + Math.max(0, expiresIn) * 1000;
    await admin_1.db.ref(secretsPath).update({
        hmrcAccessToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.access_token || ""), key),
        hmrcRefreshToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.refresh_token || refreshToken), key),
        hmrcTokenExpiry: expiryTime,
        updatedAt: Date.now(),
    });
    return { success: true, storedAt: foundAt, tokenExpiry: expiryTime };
});
//# sourceMappingURL=hmrcSecureTokens.js.map