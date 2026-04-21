"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmrcSubmitRtiXml = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const hmrcSecretsUtil_1 = require("./hmrcSecretsUtil");
function parseType(t) {
    if (t === "fps" || t === "eps" || t === "eyu")
        return t;
    throw new https_1.HttpsError("invalid-argument", "Invalid type (fps|eps|eyu)");
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
exports.hmrcSubmitRtiXml = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    const type = parseType((_g = req.data) === null || _g === void 0 ? void 0 : _g.type);
    const xml = String(((_h = req.data) === null || _h === void 0 ? void 0 : _h.xml) || "");
    const fraudHeaders = (((_j = req.data) === null || _j === void 0 ? void 0 : _j.fraudHeaders) || null);
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    if (!xml || xml.length < 20)
        throw new https_1.HttpsError("invalid-argument", "xml is required");
    const meta = await requireCompanyMemberOrAdmin(uid, companyId);
    requireOwnerOrAdmin(meta);
    const foundAt = await (0, hmrcSecretsUtil_1.findHMRCLevel)(companyId, siteId, subsiteId);
    if (!foundAt)
        throw new https_1.HttpsError("failed-precondition", "HMRC settings not found. Save HMRC settings first.");
    const settingsPath = (0, hmrcSecretsUtil_1.getHMRCSettingsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const settingsSnap = await admin_1.db.ref(settingsPath).get();
    const settings = (settingsSnap.val() || {});
    const employerPAYEReference = String(settings.employerPAYEReference || "").trim().toUpperCase().replace(/\s+/g, "");
    const environment = (settings.hmrcEnvironment === "production" ? "production" : "sandbox");
    if (!employerPAYEReference)
        throw new https_1.HttpsError("failed-precondition", "Missing employerPAYEReference in HMRC settings");
    const baseUrl = environment === "production" ? "https://api.service.hmrc.gov.uk" : "https://test-api.service.hmrc.gov.uk";
    const encKey = (0, hmrcSecretsUtil_1.getHMRCEncryptionKey)();
    const secretsPath = (0, hmrcSecretsUtil_1.getHMRCSecretsPath)({ companyId, siteId, subsiteId, level: foundAt });
    const secretsSnap = await admin_1.db.ref(secretsPath).get();
    const secrets = (secretsSnap.val() || {});
    let accessToken = (0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcAccessToken, encKey);
    const refreshToken = (0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcRefreshToken, encKey);
    const tokenExpiry = typeof secrets.hmrcTokenExpiry === "number" ? secrets.hmrcTokenExpiry : 0;
    const clientId = String(settings.hmrcClientId || "").trim() || String(process.env.HMRC_CLIENT_ID || "").trim();
    const clientSecret = String((0, hmrcSecretsUtil_1.decryptSecret)(secrets.hmrcClientSecret, encKey) || "").trim() || String(process.env.HMRC_CLIENT_SECRET || "").trim();
    if (!accessToken || !refreshToken)
        throw new https_1.HttpsError("failed-precondition", "HMRC OAuth not connected. Reconnect to HMRC.");
    const now = Date.now();
    if (!tokenExpiry || tokenExpiry <= now + 300000) {
        if (clientId && clientSecret) {
            const tokenUrl = `${baseUrl}/oauth/token`;
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const refreshResponse = await fetch(tokenUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${credentials}`,
                    Accept: "application/json",
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: String(refreshToken),
                }).toString(),
            });
            if (refreshResponse.ok) {
                const tokenData = await refreshResponse.json();
                accessToken = String(tokenData.access_token || accessToken);
                const newExpiry = now + (Number(tokenData.expires_in || 0) * 1000);
                await admin_1.db.ref(secretsPath).update({
                    hmrcAccessToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.access_token || ""), encKey),
                    hmrcRefreshToken: (0, hmrcSecretsUtil_1.encryptSecret)(String(tokenData.refresh_token || refreshToken), encKey),
                    hmrcTokenExpiry: newExpiry,
                    updatedAt: now,
                });
            }
        }
    }
    const defaultFraudHeaders = {
        "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
        "Gov-Client-Device-ID": `server-${Date.now()}`,
        "Gov-Client-User-IDs": uid ? `os=${uid}` : "",
        "Gov-Client-Timezone": "UTC+00:00",
        "Gov-Client-Local-IPs": "",
        "Gov-Client-Screens": "",
        "Gov-Client-Window-Size": "",
        "Gov-Client-Browser-Plugins": "",
        "Gov-Client-Browser-JS-User-Agent": "",
        "Gov-Client-Browser-Do-Not-Track": "false",
        "Gov-Client-Multi-Factor": "",
    };
    const finalFraudHeaders = fraudHeaders || defaultFraudHeaders;
    // HMRC expects the employer reference in URL with "/" replaced by "%2F" (avoid double encoding).
    const employerRef = employerPAYEReference.replace("/", "%2F");
    const endpoint = `${baseUrl}/paye/employers/${employerRef}/submissions/${type}`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: Object.assign({ Authorization: `Bearer ${accessToken}`, "Content-Type": "application/xml", Accept: "application/json" }, finalFraudHeaders),
        body: xml,
    });
    const contentType = response.headers.get("content-type") || "";
    let body = null;
    try {
        body = contentType.includes("application/json") ? await response.json() : await response.text();
    }
    catch (_k) {
        body = null;
    }
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return {
        success: response.status === 200 || response.status === 202,
        status: response.status,
        statusText: response.statusText,
        correlationId: headers["x-correlation-id"] || headers["xCorrelationId"],
        headers,
        body,
    };
});
//# sourceMappingURL=hmrcRtiSubmit.js.map