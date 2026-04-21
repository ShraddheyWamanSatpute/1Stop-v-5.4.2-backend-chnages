"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightspeedKDisconnect = exports.lightspeedKRefreshToken = exports.oauthCallbackLightspeedK = exports.lightspeedKConnect = exports.oauthLightspeedK = exports.requireCompanyMemberOrAdminSupport = exports.loadOperatorOAuthCreds = exports.operatorOAuthDocId = exports.K_OPERATOR_OAUTH_COLLECTION = exports.LIGHTSPEED_K_DEFAULT_SCOPES = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
const crypto = __importStar(require("crypto"));
/** Default OAuth scopes for K-Series (catalog, orders, financial, refresh). */
exports.LIGHTSPEED_K_DEFAULT_SCOPES = "items orders-api financial-api offline_access";
exports.K_OPERATOR_OAUTH_COLLECTION = "lightspeed_k_operator_oauth";
function operatorOAuthDocId(companyId, siteId, subsiteId) {
    return `${String(companyId).trim()}__${String(siteId || "default").trim()}__${String(subsiteId || "default").trim()}`;
}
exports.operatorOAuthDocId = operatorOAuthDocId;
function kOAuthLog(event, fields) {
    try {
        console.log(JSON.stringify(Object.assign({ source: "oauthLightspeedK", event, ts: Date.now() }, fields)));
    }
    catch (_a) {
        console.log(`[oauthLightspeedK] ${event}`);
    }
}
/** Per-company OAuth app (client id/secret) saved by admin tooling; falls back to FUNCTION_KEYS when absent. */
async function loadOperatorOAuthCreds(companyId, siteId, subsiteId) {
    try {
        const snap = await admin_1.firestore.collection(exports.K_OPERATOR_OAUTH_COLLECTION).doc(operatorOAuthDocId(companyId, siteId, subsiteId)).get();
        if (!snap.exists)
            return null;
        const d = snap.data() || {};
        const client_id = String(d.client_id || "").trim();
        const client_secret = String(d.client_secret || "").trim();
        if (!client_id || !client_secret)
            return null;
        return {
            client_id,
            client_secret,
            redirect_uri: d.redirect_uri ? String(d.redirect_uri).trim() : undefined,
            scope: d.scope ? String(d.scope) : undefined,
            environment: d.environment === "trial" ? "trial" : "production",
        };
    }
    catch (_a) {
        return null;
    }
}
exports.loadOperatorOAuthCreds = loadOperatorOAuthCreds;
function json(res, status, body) {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
}
function getBearerToken(req) {
    var _a, _b;
    const h = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
async function requireUser(req) {
    const token = getBearerToken(req);
    if (!token)
        throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 });
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
    if (!(decoded === null || decoded === void 0 ? void 0 : decoded.uid))
        throw Object.assign(new Error("Invalid token"), { status: 401 });
    return { uid: decoded.uid, email: decoded.email };
}
async function requireCompanyAccess(uid, companyId) {
    const a = await admin_1.db.ref(`companies/${companyId}/users/${uid}`).get();
    if (a.exists())
        return;
    const b = await admin_1.db.ref(`users/${uid}/companies/${companyId}`).get();
    if (b.exists())
        return;
    throw Object.assign(new Error("Forbidden"), { status: 403 });
}
/** Company member, global super-admin, or admin staff with Integrations page (support tooling). */
async function requireCompanyMemberOrAdminSupport(uid, companyId) {
    var _a, _b, _c, _d, _e, _f, _g;
    const uSnap = await admin_1.db.ref(`users/${uid}`).get();
    const user = (uSnap.val() || {});
    if (Boolean(user === null || user === void 0 ? void 0 : user.isAdmin))
        return;
    if (Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active)) {
        const pages = (_f = (_c = (_b = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _b === void 0 ? void 0 : _b.pages) !== null && _c !== void 0 ? _c : (_e = (_d = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _d === void 0 ? void 0 : _d.permissions) === null || _e === void 0 ? void 0 : _e.pages) !== null && _f !== void 0 ? _f : (_g = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _g === void 0 ? void 0 : _g.permissions;
        if (Array.isArray(pages) && pages.includes("integrations"))
            return;
        if (pages && typeof pages === "object") {
            const v = pages.integrations;
            if (typeof v === "boolean" && v)
                return;
            if (v && typeof v === "object" && Boolean(v.view))
                return;
        }
    }
    await requireCompanyAccess(uid, companyId);
}
exports.requireCompanyMemberOrAdminSupport = requireCompanyMemberOrAdminSupport;
function getEnvBaseUrl(environment) {
    return environment === "trial" ? "https://api.trial.lsk.lightspeed.app" : "https://api.lsk.lightspeed.app";
}
async function buildLightspeedAuthorizeUrl(opts) {
    const op = await loadOperatorOAuthCreds(opts.companyId, opts.siteId, opts.subsiteId);
    const clientId = (op === null || op === void 0 ? void 0 : op.client_id) || keys_1.FUNCTION_KEYS.lightspeedk.clientId;
    if (!clientId) {
        throw new Error("Missing Lightspeed K client id (set admin operator credentials or LIGHTSPEEDK_CLIENT_ID).");
    }
    const redirectUri = ((op === null || op === void 0 ? void 0 : op.redirect_uri) && String(op.redirect_uri).trim()) ||
        keys_1.FUNCTION_KEYS.lightspeedk.redirectUri ||
        getDefaultRedirectUri(opts.req);
    let redirectHost = "";
    try {
        redirectHost = new URL(redirectUri).host;
    }
    catch (_a) {
        redirectHost = "invalid-url";
    }
    kOAuthLog("build_authorize_url", {
        companyId: opts.companyId,
        siteId: opts.siteId || "default",
        subsiteId: opts.subsiteId || "default",
        environment: opts.environment,
        usingOperatorCreds: Boolean(op),
        clientIdLength: clientId.length,
        redirectHost,
        scopePreview: String(opts.scope || "").slice(0, 120),
    });
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = base64UrlEncodeJson({
        provider: "lightspeedk",
        companyId: opts.companyId,
        siteId: opts.siteId || "default",
        subsiteId: opts.subsiteId || "default",
        returnPath: opts.returnPath,
        environment: opts.environment,
        scope: opts.scope,
        nonce,
        ts: Date.now(),
    });
    const baseUrl = getEnvBaseUrl(opts.environment);
    return `${baseUrl}/oauth/authorize?${new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: opts.scope,
        state,
    }).toString()}`;
}
function base64UrlEncodeJson(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function base64UrlDecodeJson(raw) {
    return JSON.parse(Buffer.from(String(raw), "base64url").toString("utf8"));
}
function resolveProto(req) {
    var _a;
    const xf = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-proto"]) || "").split(",")[0].trim();
    return xf || req.protocol || "https";
}
function getDefaultRedirectUri(req) {
    const proto = resolveProto(req);
    const host = req.get("host");
    return `${proto}://${host}/oauthCallbackLightspeedK`;
}
function getSettingsPath(companyId, siteId, subsiteId) {
    if (siteId && subsiteId) {
        return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/settings/lightspeedIntegration`;
    }
    if (siteId) {
        return `companies/${companyId}/sites/${siteId}/settings/lightspeedIntegration`;
    }
    return `companies/${companyId}/settings/lightspeedIntegration`;
}
function getTokenDocId(companyId, siteId, subsiteId) {
    const s = siteId || "default";
    const ss = subsiteId || "default";
    return `${companyId}_${s}_${ss}_lightspeedk`;
}
async function exchangeCodeForToken(opts) {
    var _a, _b;
    const clientId = ((_a = opts.operator) === null || _a === void 0 ? void 0 : _a.clientId) || keys_1.FUNCTION_KEYS.lightspeedk.clientId;
    const clientSecret = ((_b = opts.operator) === null || _b === void 0 ? void 0 : _b.clientSecret) || keys_1.FUNCTION_KEYS.lightspeedk.clientSecret;
    if (!clientId || !clientSecret) {
        throw new Error("Missing Lightspeed K credentials (operator Firestore doc or LIGHTSPEEDK_CLIENT_ID/LIGHTSPEEDK_CLIENT_SECRET).");
    }
    const baseUrl = getEnvBaseUrl(opts.environment);
    const url = `${baseUrl}/oauth/token?${new URLSearchParams({
        grant_type: "authorization_code",
        code: opts.code,
        redirect_uri: opts.redirectUri,
    }).toString()}`;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    kOAuthLog("token_exchange_request", {
        environment: opts.environment,
        usingOperatorBasicAuth: Boolean(opts.operator),
        redirectUriHost: (() => {
            try {
                return new URL(opts.redirectUri).host;
            }
            catch (_a) {
                return "";
            }
        })(),
    });
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
    });
    if (!resp.ok) {
        const txt = await resp.text();
        kOAuthLog("token_exchange_failed", { status: resp.status, bodyPreview: txt.slice(0, 800) });
        throw new Error(`Lightspeed token exchange failed (${resp.status}): ${txt}`);
    }
    const jsonBody = await resp.json();
    kOAuthLog("token_exchange_ok", {
        expires_in: jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.expires_in,
        scope: typeof (jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.scope) === "string" ? jsonBody.scope.slice(0, 200) : jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.scope,
    });
    return jsonBody;
}
async function refreshAccessToken(opts) {
    var _a, _b;
    const clientId = ((_a = opts.operator) === null || _a === void 0 ? void 0 : _a.clientId) || keys_1.FUNCTION_KEYS.lightspeedk.clientId;
    const clientSecret = ((_b = opts.operator) === null || _b === void 0 ? void 0 : _b.clientSecret) || keys_1.FUNCTION_KEYS.lightspeedk.clientSecret;
    if (!clientId || !clientSecret) {
        throw new Error("Missing Lightspeed K credentials (LIGHTSPEEDK_CLIENT_ID/LIGHTSPEEDK_CLIENT_SECRET).");
    }
    const baseUrl = getEnvBaseUrl(opts.environment);
    const url = `${baseUrl}/oauth/token`;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    kOAuthLog("refresh_token_request", { environment: opts.environment, usingOperatorBasicAuth: Boolean(opts.operator) });
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: opts.refreshToken,
        }).toString(),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        kOAuthLog("refresh_token_failed", { status: resp.status, bodyPreview: txt.slice(0, 800) });
        throw new Error(`Lightspeed token refresh failed (${resp.status}): ${txt}`);
    }
    return resp.json();
}
/**
 * Start OAuth: redirects to Lightspeed /oauth/authorize.
 */
exports.oauthLightspeedK = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        const companyId = String(req.query.company_id || "").trim();
        const siteId = String(req.query.site_id || "").trim() || undefined;
        const subsiteId = String(req.query.subsite_id || "").trim() || undefined;
        const returnPath = String(req.query.return_path || "/pos/settings");
        const environment = (String(req.query.environment || "production") === "trial" ? "trial" : "production");
        const scope = String(req.query.scope || exports.LIGHTSPEED_K_DEFAULT_SCOPES);
        if (!companyId) {
            res.status(400).send("Missing company_id");
            return;
        }
        const authUrl = await buildLightspeedAuthorizeUrl({ req, companyId, siteId, subsiteId, returnPath, environment, scope });
        res.redirect(authUrl);
    }
    catch (e) {
        console.error("oauthLightspeedK error:", e);
        kOAuthLog("oauth_start_failed", { message: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        res.status(500).send("OAuth initialization failed");
    }
});
/**
 * Back-compat connect endpoint.
 * Some older frontends call `/lightspeedKConnect?mode=json` to obtain the authorize URL via fetch.
 * - `mode=json` → returns `{ ok: true, url }`
 * - otherwise → redirects to authorize URL
 */
exports.lightspeedKConnect = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET" && req.method !== "POST") {
            json(res, 405, { ok: false, error: "Method not allowed" });
            return;
        }
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const q = req.query || {};
        const companyId = String(q.company_id || q.companyId || body.company_id || body.companyId || "").trim();
        const siteId = String(q.site_id || q.siteId || body.site_id || body.siteId || "").trim() || undefined;
        const subsiteId = String(q.subsite_id || q.subsiteId || body.subsite_id || body.subsiteId || "").trim() || undefined;
        const returnPath = String(q.return_path || q.returnPath || body.return_path || body.returnPath || "/pos/settings");
        const environment = (String(q.environment || body.environment || "production") === "trial" ? "trial" : "production");
        const scope = String(q.scope || body.scope || exports.LIGHTSPEED_K_DEFAULT_SCOPES);
        if (!companyId) {
            json(res, 400, { ok: false, error: "Missing company_id" });
            return;
        }
        const authUrl = await buildLightspeedAuthorizeUrl({ req, companyId, siteId, subsiteId, returnPath, environment, scope });
        const mode = String(q.mode || body.mode || "").toLowerCase();
        if (mode === "json") {
            // Back-compat: some clients expect `authUrl`, others expect `url`
            json(res, 200, { ok: true, url: authUrl, authUrl, data: { authUrl } });
            return;
        }
        res.redirect(authUrl);
    }
    catch (e) {
        console.error("lightspeedKConnect error:", e);
        const status = Number((e === null || e === void 0 ? void 0 : e.status) || 500);
        json(res, status, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "OAuth initialization failed" });
    }
});
/**
 * OAuth callback: exchanges code for tokens, stores Firestore tokens + RTDB mirror, redirects to returnPath.
 */
exports.oauthCallbackLightspeedK = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        const { code, state, error } = req.query;
        if (error) {
            kOAuthLog("callback_query_error", { error: String(error) });
            res.status(400).send(`OAuth error: ${String(error)}`);
            return;
        }
        if (!code || !state) {
            kOAuthLog("callback_missing_code_or_state", {});
            res.status(400).send("Missing code or state");
            return;
        }
        const decoded = base64UrlDecodeJson(String(state));
        const companyId = String((decoded === null || decoded === void 0 ? void 0 : decoded.companyId) || "").trim();
        const siteId = String((decoded === null || decoded === void 0 ? void 0 : decoded.siteId) || "").trim();
        const subsiteId = String((decoded === null || decoded === void 0 ? void 0 : decoded.subsiteId) || "").trim();
        const returnPath = String((decoded === null || decoded === void 0 ? void 0 : decoded.returnPath) || "/pos/settings");
        const environment = (String((decoded === null || decoded === void 0 ? void 0 : decoded.environment) || "production") === "trial" ? "trial" : "production");
        const scope = String((decoded === null || decoded === void 0 ? void 0 : decoded.scope) || "");
        if (!companyId) {
            res.status(400).send("Invalid state (missing companyId)");
            return;
        }
        kOAuthLog("callback_received", { companyId, siteId, subsiteId, environment });
        const op = await loadOperatorOAuthCreds(companyId, siteId, subsiteId);
        const redirectUri = ((op === null || op === void 0 ? void 0 : op.redirect_uri) && String(op.redirect_uri).trim()) ||
            keys_1.FUNCTION_KEYS.lightspeedk.redirectUri ||
            getDefaultRedirectUri(req);
        const token = await exchangeCodeForToken({
            environment,
            code: String(code),
            redirectUri,
            operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
        });
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAtSec = nowSec + (Number(token.expires_in) || 3600);
        // Store sensitive tokens in Firestore
        const tokenDocId = getTokenDocId(companyId, siteId, subsiteId);
        await admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId).set({
            provider: "lightspeedk",
            companyId,
            siteId: siteId || "default",
            subsiteId: subsiteId || "default",
            environment,
            scope: token.scope || scope,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_type: token.token_type,
            expires_at_sec: expiresAtSec,
            connectedAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });
        // Store non-sensitive mirror in RTDB for UI
        const settingsPath = getSettingsPath(companyId, siteId !== "default" ? siteId : undefined, subsiteId !== "default" ? subsiteId : undefined);
        await admin_1.db.ref(settingsPath).update({
            provider: "lightspeed",
            environment,
            scope: token.scope || scope,
            tokenType: token.token_type,
            tokenExpiry: expiresAtSec,
            isEnabled: true,
            isConnected: true,
            connectedAt: Date.now(),
            syncStatus: "idle",
            updatedAt: Date.now(),
        });
        const sep = returnPath.includes("?") ? "&" : "?";
        res.redirect(`${returnPath}${sep}success=true&provider=lightspeed`);
    }
    catch (e) {
        console.error("oauthCallbackLightspeedK error:", e);
        res.status(500).send((e === null || e === void 0 ? void 0 : e.message) || "OAuth callback failed");
    }
});
/**
 * Refresh token (server-side). Requires Firebase auth.
 */
exports.lightspeedKRefreshToken = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { ok: false, error: "Method not allowed" });
            return;
        }
        const user = await requireUser(req);
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const companyId = String(body.companyId || "").trim();
        const siteId = String(body.siteId || "").trim() || undefined;
        const subsiteId = String(body.subsiteId || "").trim() || undefined;
        if (!companyId)
            throw Object.assign(new Error("Missing companyId"), { status: 400 });
        await requireCompanyMemberOrAdminSupport(user.uid, companyId);
        const tokenDocId = getTokenDocId(companyId, siteId, subsiteId);
        const doc = await admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId).get();
        if (!doc.exists)
            throw Object.assign(new Error("Not connected"), { status: 400 });
        const data = doc.data() || {};
        const environment = (String(data.environment || "production") === "trial" ? "trial" : "production");
        const refreshToken = String(data.refresh_token || "").trim();
        if (!refreshToken)
            throw Object.assign(new Error("Missing refresh token"), { status: 400 });
        const op = await loadOperatorOAuthCreds(companyId, siteId, subsiteId);
        const token = await refreshAccessToken({
            environment,
            refreshToken,
            operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
        });
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAtSec = nowSec + (Number(token.expires_in) || 3600);
        await admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId).set({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_type: token.token_type,
            expires_at_sec: expiresAtSec,
            scope: token.scope || data.scope,
            updatedAt: new Date(),
        }, { merge: true });
        const settingsPath = getSettingsPath(companyId, siteId, subsiteId);
        await admin_1.db.ref(settingsPath).update({
            tokenType: token.token_type,
            tokenExpiry: expiresAtSec,
            scope: token.scope || data.scope,
            updatedAt: Date.now(),
        });
        json(res, 200, { ok: true, tokenExpiry: expiresAtSec });
    }
    catch (e) {
        const status = Number((e === null || e === void 0 ? void 0 : e.status) || 500);
        json(res, status, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
/**
 * Disconnect: deletes Firestore token doc and clears RTDB mirror. Requires Firebase auth.
 */
exports.lightspeedKDisconnect = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { ok: false, error: "Method not allowed" });
            return;
        }
        const user = await requireUser(req);
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const companyId = String(body.companyId || "").trim();
        const siteId = String(body.siteId || "").trim() || undefined;
        const subsiteId = String(body.subsiteId || "").trim() || undefined;
        if (!companyId)
            throw Object.assign(new Error("Missing companyId"), { status: 400 });
        await requireCompanyMemberOrAdminSupport(user.uid, companyId);
        const tokenDocId = getTokenDocId(companyId, siteId, subsiteId);
        await admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId).delete().catch(() => { });
        const settingsPath = getSettingsPath(companyId, siteId, subsiteId);
        await admin_1.db.ref(settingsPath).update({
            isEnabled: false,
            isConnected: false,
            syncStatus: "idle",
            syncError: null,
            tokenType: null,
            tokenExpiry: null,
            scope: null,
            businessId: null,
            businessName: null,
            businessLocationId: null,
            businessLocationName: null,
            updatedAt: Date.now(),
        });
        json(res, 200, { ok: true });
    }
    catch (e) {
        const status = Number((e === null || e === void 0 ? void 0 : e.status) || 500);
        json(res, status, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
//# sourceMappingURL=oauthLightspeedK.js.map