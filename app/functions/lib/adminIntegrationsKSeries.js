"use strict";
/**
 * Admin HTTP endpoints for Lightspeed Restaurant (K-Series) operator setup.
 * Auth: Firebase ID token (Bearer) + super-admin OR admin staff with Integrations page.
 *
 * OAuth callback path (register in Lightspeed developer portal):
 *   https://<REGION>-<PROJECT_ID>.cloudfunctions.net/oauthCallbackLightspeedK
 *
 * Per-company OAuth app credentials are stored in Firestore collection `lightspeed_k_operator_oauth`
 * (see oauthLightspeedK.ts). Global fallback remains LIGHTSPEEDK_* env vars.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminIntegrationsKSeriesSyncFinancials = exports.adminIntegrationsKSeriesSyncItems = exports.adminIntegrationsKSeriesSaveBusinessLocation = exports.adminIntegrationsKSeriesSaveCredentials = exports.adminIntegrationsKSeriesPreview = exports.adminIntegrationsKSeriesStatus = exports.adminIntegrationsListSubsites = exports.adminIntegrationsListSites = exports.adminIntegrationsListCompanies = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const admin_1 = require("./admin");
const oauthLightspeedK_1 = require("./oauthLightspeedK");
const lightspeedKSync_1 = require("./lightspeedKSync");
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
function hasIntegrationsPage(user) {
    var _a, _b, _c, _d, _e, _f;
    if (Boolean(user === null || user === void 0 ? void 0 : user.isAdmin))
        return true;
    const pages = (_e = (_b = (_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.pages) !== null && _b !== void 0 ? _b : (_d = (_c = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _c === void 0 ? void 0 : _c.permissions) === null || _d === void 0 ? void 0 : _d.pages) !== null && _e !== void 0 ? _e : (_f = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _f === void 0 ? void 0 : _f.permissions;
    if (Array.isArray(pages))
        return pages.includes("integrations");
    if (pages && typeof pages === "object") {
        const v = pages.integrations;
        if (typeof v === "boolean")
            return v;
        if (v && typeof v === "object" && typeof v.view === "boolean")
            return Boolean(v.view);
    }
    return false;
}
async function requireIntegrationsActor(req) {
    var _a;
    const token = getBearerToken(req);
    if (!token)
        throw Object.assign(new Error("Missing Authorization Bearer token"), { status: 401 });
    const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
    if (!(decoded === null || decoded === void 0 ? void 0 : decoded.uid))
        throw Object.assign(new Error("Invalid token"), { status: 401 });
    const snap = await admin_1.db.ref(`users/${decoded.uid}`).get();
    const user = (snap.val() || {});
    const isAdmin = Boolean(user === null || user === void 0 ? void 0 : user.isAdmin);
    const isStaff = Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active);
    if (!isAdmin && !(isStaff && hasIntegrationsPage(user))) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
    return { uid: decoded.uid, email: decoded.email };
}
function cloudFunctionsBaseUrl() {
    let cfg = {};
    try {
        cfg = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    }
    catch (_a) {
        cfg = {};
    }
    const projectId = String(process.env.GCLOUD_PROJECT || cfg.projectId || "").trim();
    const region = String(process.env.FUNCTIONS_REGION || process.env.FUNCTION_REGION || "us-central1").trim() || "us-central1";
    return `https://${region}-${projectId}.cloudfunctions.net`;
}
function lightspeedKOAuthCallbackUrl() {
    return `${cloudFunctionsBaseUrl()}/oauthCallbackLightspeedK`;
}
function settingsPath(company_id, site_id, subsite_id) {
    const siteOk = site_id && site_id !== "default" ? site_id : undefined;
    const subOk = subsite_id && subsite_id !== "default" ? subsite_id : undefined;
    if (siteOk && subOk) {
        return `companies/${company_id}/sites/${siteOk}/subsites/${subOk}/settings/lightspeedIntegration`;
    }
    if (siteOk) {
        return `companies/${company_id}/sites/${siteOk}/settings/lightspeedIntegration`;
    }
    return `companies/${company_id}/settings/lightspeedIntegration`;
}
function kAdminLog(event, fields) {
    try {
        console.log(JSON.stringify(Object.assign({ source: "adminIntegrationsKSeries", event, ts: Date.now() }, fields)));
    }
    catch (_a) {
        console.log(`[adminIntegrationsKSeries] ${event}`);
    }
}
async function forwardLightspeedRunSync(authHeader, body) {
    const url = `${cloudFunctionsBaseUrl()}/lightspeedKRunSync`;
    kAdminLog("forward_run_sync", { url, companyId: body.companyId, syncProducts: body.syncProducts, syncSales: body.syncSales });
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
        },
        body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        throw Object.assign(new Error(String((data === null || data === void 0 ? void 0 : data.error) || `Sync failed (${resp.status})`)), { status: resp.status });
    }
    return data;
}
exports.adminIntegrationsListCompanies = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const snap = await admin_1.db.ref("companies").get();
        const val = snap.exists() ? snap.val() : {};
        const companies = Object.entries(val).map(([id, raw]) => ({
            id,
            name: String((raw === null || raw === void 0 ? void 0 : raw.name) || (raw === null || raw === void 0 ? void 0 : raw.companyName) || id),
        }));
        companies.sort((a, b) => a.name.localeCompare(b.name));
        kAdminLog("list_companies", { count: companies.length });
        json(res, 200, { companies });
    }
    catch (e) {
        kAdminLog("list_companies_error", { message: e === null || e === void 0 ? void 0 : e.message });
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsListSites = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const company_id = String(req.query.company_id || "").trim();
        if (!company_id) {
            json(res, 400, { error: "Missing company_id" });
            return;
        }
        const snap = await admin_1.db.ref(`companies/${company_id}/sites`).get();
        const val = snap.exists() ? snap.val() : {};
        const sites = Object.entries(val).map(([id, raw]) => ({
            id,
            name: String((raw === null || raw === void 0 ? void 0 : raw.name) || (raw === null || raw === void 0 ? void 0 : raw.siteName) || id),
        }));
        sites.sort((a, b) => a.name.localeCompare(b.name));
        json(res, 200, { sites });
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsListSubsites = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const company_id = String(req.query.company_id || "").trim();
        const site_id = String(req.query.site_id || "").trim();
        if (!company_id || !site_id) {
            json(res, 400, { error: "Missing company_id or site_id" });
            return;
        }
        const snap = await admin_1.db.ref(`companies/${company_id}/sites/${site_id}/subsites`).get();
        const val = snap.exists() ? snap.val() : {};
        const subsites = Object.entries(val).map(([id, raw]) => ({
            id,
            name: String((raw === null || raw === void 0 ? void 0 : raw.name) || (raw === null || raw === void 0 ? void 0 : raw.subsiteName) || id),
        }));
        subsites.sort((a, b) => a.name.localeCompare(b.name));
        json(res, 200, { subsites });
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesStatus = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const company_id = String(req.query.company_id || "").trim();
        const site_id = String(req.query.site_id || "default").trim() || "default";
        const subsite_id = String(req.query.subsite_id || "default").trim() || "default";
        if (!company_id) {
            json(res, 400, { error: "Missing company_id" });
            return;
        }
        const path = settingsPath(company_id, site_id, subsite_id);
        const settingsSnap = await admin_1.db.ref(path).get();
        const raw = settingsSnap.exists() ? settingsSnap.val() : {};
        const opSnap = await admin_1.firestore.collection(oauthLightspeedK_1.K_OPERATOR_OAUTH_COLLECTION).doc((0, oauthLightspeedK_1.operatorOAuthDocId)(company_id, site_id, subsite_id)).get();
        const hasOpSecret = opSnap.exists && String(((_a = opSnap.data()) === null || _a === void 0 ? void 0 : _a.client_secret) || "").trim().length > 0;
        const s = site_id === "default" ? undefined : site_id;
        const ss = subsite_id === "default" ? undefined : subsite_id;
        const tokenDocId = `${company_id}_${s || "default"}_${ss || "default"}_lightspeedk`;
        const tokSnap = await admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId).get();
        const auditSnap = await admin_1.db.ref(`${path}/integrationAudit`).get();
        const auditVal = auditSnap.exists() ? auditSnap.val() : null;
        const audit = [];
        if (auditVal && typeof auditVal === "object") {
            Object.values(auditVal).forEach((row) => {
                if (row && typeof row === "object")
                    audit.push(row);
            });
            audit.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
        }
        json(res, 200, {
            settingsPath: path,
            settings: Object.assign(Object.assign({}, raw), { clientId: (raw === null || raw === void 0 ? void 0 : raw.clientId) || ((_b = opSnap.data()) === null || _b === void 0 ? void 0 : _b.client_id) || "", redirectUri: (raw === null || raw === void 0 ? void 0 : raw.redirectUri) || ((_c = opSnap.data()) === null || _c === void 0 ? void 0 : _c.redirect_uri) || "", scope: (raw === null || raw === void 0 ? void 0 : raw.scope) || ((_d = opSnap.data()) === null || _d === void 0 ? void 0 : _d.scope) || "", env: (raw === null || raw === void 0 ? void 0 : raw.environment) || ((_e = opSnap.data()) === null || _e === void 0 ? void 0 : _e.environment) || "production", isConnected: Boolean(raw === null || raw === void 0 ? void 0 : raw.isConnected) || tokSnap.exists, hasServerSecret: Boolean(raw === null || raw === void 0 ? void 0 : raw.hasServerSecret) || hasOpSecret }),
            audit: audit.slice(0, 50),
        });
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesPreview = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const company_id = String(req.query.company_id || "").trim();
        const site_id = String(req.query.site_id || "default").trim() || "default";
        const subsite_id = String(req.query.subsite_id || "default").trim() || "default";
        const financial_from = String(req.query.financial_from || "").trim();
        const financial_to = String(req.query.financial_to || "").trim();
        const blRaw = String(req.query.business_location_id || "").trim();
        const businessLocationId = blRaw ? Number(blRaw) : NaN;
        if (!company_id) {
            json(res, 400, { error: "Missing company_id" });
            return;
        }
        const s = site_id === "default" ? undefined : site_id;
        const ss = subsite_id === "default" ? undefined : subsite_id;
        const { token, accessToken } = await (0, lightspeedKSync_1.loadValidToken)(company_id, s, ss);
        const env = (token.environment || "production");
        const rawBiz = await (0, lightspeedKSync_1.fetchBusinesses)(env, accessToken);
        const businesses = (0, lightspeedKSync_1.buildLocationOptions)(rawBiz);
        const settingsSnap = await admin_1.db.ref(settingsPath(company_id, site_id, subsite_id)).get();
        const settings = settingsSnap.exists() ? settingsSnap.val() : {};
        const selectedId = Number.isFinite(businessLocationId) && businessLocationId > 0 ? businessLocationId : Number((settings === null || settings === void 0 ? void 0 : settings.businessLocationId) || 0);
        let itemCount = 0;
        let financialCount = 0;
        let selectedBusinessLocationName = null;
        if (Number.isFinite(selectedId) && selectedId > 0) {
            const match = businesses.find((b) => b.businessLocationId === selectedId);
            selectedBusinessLocationName = (match === null || match === void 0 ? void 0 : match.businessLocationName) ? String(match.businessLocationName) : null;
            const items = await (0, lightspeedKSync_1.fetchAllItems)(env, accessToken, selectedId);
            itemCount = items.length;
            const sales = await (0, lightspeedKSync_1.fetchSales)(env, accessToken, selectedId, financial_from || undefined, financial_to || undefined);
            financialCount = sales.length;
        }
        kAdminLog("preview_ok", { company_id, selectedId, itemCount, financialCount });
        json(res, 200, {
            businesses,
            selectedBusinessLocationId: Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null,
            selectedBusinessLocationName,
            itemCount,
            financialCount,
        });
    }
    catch (e) {
        kAdminLog("preview_error", { message: e === null || e === void 0 ? void 0 : e.message });
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesSaveCredentials = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        const actor = await requireIntegrationsActor(req);
        const body = typeof req.body === "object" && req.body ? req.body : {};
        const company_id = String(body.company_id || "").trim();
        const site_id = String(body.site_id || "default").trim() || "default";
        const subsite_id = String(body.subsite_id || "default").trim() || "default";
        const env = String(body.env || "production") === "trial" ? "trial" : "production";
        const client_id = String(body.client_id || "").trim();
        const client_secret = String(body.client_secret || "").trim();
        const redirect_uri = String(body.redirect_uri || "").trim() || lightspeedKOAuthCallbackUrl();
        const scope = String(body.scope || "").trim() || oauthLightspeedK_1.LIGHTSPEED_K_DEFAULT_SCOPES;
        if (!company_id || !client_id) {
            json(res, 400, { error: "Missing company_id or client_id" });
            return;
        }
        const path = settingsPath(company_id, site_id, subsite_id);
        const docId = (0, oauthLightspeedK_1.operatorOAuthDocId)(company_id, site_id, subsite_id);
        const firePayload = {
            client_id,
            redirect_uri: redirect_uri || null,
            scope: scope || null,
            environment: env,
            updatedAt: new Date(),
            updatedByUid: actor.uid,
        };
        if (client_secret) {
            firePayload.client_secret = client_secret;
        }
        await admin_1.firestore.collection(oauthLightspeedK_1.K_OPERATOR_OAUTH_COLLECTION).doc(docId).set(firePayload, { merge: true });
        const op = await (0, oauthLightspeedK_1.loadOperatorOAuthCreds)(company_id, site_id, subsite_id);
        await admin_1.db.ref(path).update({
            clientId: client_id,
            redirectUri: redirect_uri || null,
            scope: scope || null,
            environment: env,
            hasServerSecret: Boolean(op === null || op === void 0 ? void 0 : op.client_secret),
            updatedAt: Date.now(),
        });
        await admin_1.db.ref(`${path}/integrationAudit`).push({
            ts: Date.now(),
            action: "admin_save_credentials",
            actorUid: actor.uid,
        });
        kAdminLog("save_credentials", { company_id, site_id, subsite_id, hasSecret: Boolean(client_secret) });
        json(res, 200, { ok: true });
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesSaveBusinessLocation = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        const actor = await requireIntegrationsActor(req);
        const body = typeof req.body === "object" && req.body ? req.body : {};
        const company_id = String(body.company_id || "").trim();
        const site_id = String(body.site_id || "default").trim() || "default";
        const subsite_id = String(body.subsite_id || "default").trim() || "default";
        const business_location_id = Number((_a = body.business_location_id) !== null && _a !== void 0 ? _a : 0);
        if (!company_id || !Number.isFinite(business_location_id) || business_location_id <= 0) {
            json(res, 400, { error: "Missing company_id or business_location_id" });
            return;
        }
        const s = site_id === "default" ? undefined : site_id;
        const ss = subsite_id === "default" ? undefined : subsite_id;
        const { token, accessToken } = await (0, lightspeedKSync_1.loadValidToken)(company_id, s, ss);
        const env = (token.environment || "production");
        const rawBiz = await (0, lightspeedKSync_1.fetchBusinesses)(env, accessToken);
        const businesses = (0, lightspeedKSync_1.buildLocationOptions)(rawBiz);
        const match = businesses.find((b) => b.businessLocationId === business_location_id);
        const path = settingsPath(company_id, site_id, subsite_id);
        await admin_1.db.ref(path).update({
            businessLocationId: business_location_id,
            businessLocationName: (match === null || match === void 0 ? void 0 : match.businessLocationName) || "",
            updatedAt: Date.now(),
        });
        await admin_1.db.ref(`${path}/integrationAudit`).push({
            ts: Date.now(),
            action: "admin_save_business_location",
            actorUid: actor.uid,
            businessLocationId: business_location_id,
        });
        json(res, 200, { ok: true });
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesSyncItems = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const body = typeof req.body === "object" && req.body ? req.body : {};
        const authHeader = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
        const companyId = String(body.company_id || "").trim();
        const siteId = String(body.site_id || "default").trim();
        const subsiteId = String(body.subsite_id || "default").trim();
        const business_location_id = Number((_c = body.business_location_id) !== null && _c !== void 0 ? _c : 0);
        if (!companyId || !Number.isFinite(business_location_id) || business_location_id <= 0) {
            json(res, 400, { error: "Missing company_id or business_location_id" });
            return;
        }
        const data = await forwardLightspeedRunSync(authHeader, {
            companyId,
            siteId: siteId === "default" ? undefined : siteId,
            subsiteId: subsiteId === "default" ? undefined : subsiteId,
            businessLocationId: business_location_id,
            syncProducts: true,
            syncSales: false,
            syncInventory: false,
        });
        json(res, 200, data);
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
exports.adminIntegrationsKSeriesSyncFinancials = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c;
    try {
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }
        if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        await requireIntegrationsActor(req);
        const body = typeof req.body === "object" && req.body ? req.body : {};
        const authHeader = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
        const companyId = String(body.company_id || "").trim();
        const siteId = String(body.site_id || "default").trim();
        const subsiteId = String(body.subsite_id || "default").trim();
        const business_location_id = Number((_c = body.business_location_id) !== null && _c !== void 0 ? _c : 0);
        const financial_from = body.financial_from ? String(body.financial_from) : undefined;
        const financial_to = body.financial_to ? String(body.financial_to) : undefined;
        if (!companyId || !Number.isFinite(business_location_id) || business_location_id <= 0) {
            json(res, 400, { error: "Missing company_id or business_location_id" });
            return;
        }
        const data = await forwardLightspeedRunSync(authHeader, {
            companyId,
            siteId: siteId === "default" ? undefined : siteId,
            subsiteId: subsiteId === "default" ? undefined : subsiteId,
            businessLocationId: business_location_id,
            syncProducts: false,
            syncSales: true,
            syncInventory: false,
            startDate: financial_from,
            endDate: financial_to,
        });
        json(res, 200, data);
    }
    catch (e) {
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { error: (e === null || e === void 0 ? void 0 : e.message) || "Failed" });
    }
});
//# sourceMappingURL=adminIntegrationsKSeries.js.map