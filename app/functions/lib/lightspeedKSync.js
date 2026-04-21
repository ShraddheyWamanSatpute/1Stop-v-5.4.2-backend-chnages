"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightspeedKScheduledSync = exports.lightspeedKRunSync = exports.runLightspeedKSyncCore = exports.lightspeedKGetBusinesses = exports.buildLocationOptions = exports.fetchSales = exports.fetchBusinesses = exports.fetchAllItems = exports.loadValidToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const auth_1 = require("firebase-admin/auth");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
const oauthLightspeedK_1 = require("./oauthLightspeedK");
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
function kSyncLog(event, fields) {
    try {
        console.log(JSON.stringify(Object.assign({ source: "lightspeedKSync", event, ts: Date.now() }, fields)));
    }
    catch (_a) {
        console.log(`[lightspeedKSync] ${event}`);
    }
}
function getEnvBaseUrl(environment) {
    return environment === "trial" ? "https://api.trial.lsk.lightspeed.app" : "https://api.lsk.lightspeed.app";
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
function getStockBasePath(companyId, siteId, subsiteId) {
    if (subsiteId && siteId)
        return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/stock`;
    if (siteId)
        return `companies/${companyId}/sites/${siteId}/data/stock`;
    return `companies/${companyId}/data/stock`;
}
function getPOSBasePath(companyId, siteId, subsiteId) {
    if (subsiteId && siteId)
        return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/pos`;
    if (siteId)
        return `companies/${companyId}/sites/${siteId}/data/pos`;
    return `companies/${companyId}/data/pos`;
}
function getTokenDocId(companyId, siteId, subsiteId) {
    const s = siteId || "default";
    const ss = subsiteId || "default";
    return `${companyId}_${s}_${ss}_lightspeedk`;
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
    kSyncLog("refresh_access_token", { environment: opts.environment, usingOperatorCreds: Boolean(opts.operator) });
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
        throw new Error(`Lightspeed token refresh failed (${resp.status}): ${txt}`);
    }
    return resp.json();
}
async function loadValidToken(companyId, siteId, subsiteId) {
    const tokenDocId = getTokenDocId(companyId, siteId, subsiteId);
    const docRef = admin_1.firestore.collection("pos_oauth_tokens").doc(tokenDocId);
    const snap = await docRef.get();
    if (!snap.exists)
        throw Object.assign(new Error("Not connected to Lightspeed (missing token)"), { status: 400 });
    const data = snap.data();
    if (!(data === null || data === void 0 ? void 0 : data.access_token) || !(data === null || data === void 0 ? void 0 : data.refresh_token)) {
        throw Object.assign(new Error("Invalid Lightspeed token document"), { status: 500 });
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const expiry = Number(data.expires_at_sec || 0);
    const shouldRefresh = !expiry || expiry <= nowSec + 300; // 5 min skew
    if (!shouldRefresh) {
        return { token: data, accessToken: data.access_token };
    }
    const op = await (0, oauthLightspeedK_1.loadOperatorOAuthCreds)(companyId, siteId, subsiteId);
    const refreshed = await refreshAccessToken({
        environment: data.environment || "production",
        refreshToken: data.refresh_token,
        operator: op ? { clientId: op.client_id, clientSecret: op.client_secret } : null,
    });
    const expiresAtSec = nowSec + (Number(refreshed.expires_in) || 3600);
    const merged = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || data.refresh_token,
        token_type: refreshed.token_type || data.token_type,
        scope: refreshed.scope || data.scope,
        expires_at_sec: expiresAtSec,
    };
    await docRef.set(Object.assign(Object.assign({}, merged), { updatedAt: new Date() }), { merge: true });
    // Update RTDB mirror (non-sensitive)
    const settingsPath = getSettingsPath(companyId, siteId, subsiteId);
    await admin_1.db.ref(settingsPath).update({
        tokenType: merged.token_type,
        tokenExpiry: expiresAtSec,
        scope: merged.scope,
        updatedAt: Date.now(),
    });
    const nextToken = Object.assign(Object.assign({}, data), merged);
    return { token: nextToken, accessToken: String(refreshed.access_token) };
}
exports.loadValidToken = loadValidToken;
async function apiJson(opts) {
    const baseUrl = getEnvBaseUrl(opts.environment);
    const url = `${baseUrl}${opts.path.startsWith("/") ? "" : "/"}${opts.path}`;
    const resp = await fetch(url, {
        method: opts.method || "GET",
        headers: Object.assign({ Authorization: `Bearer ${opts.accessToken}`, Accept: "application/json" }, (opts.body ? { "Content-Type": "application/json" } : {})),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Lightspeed API error (${resp.status}) for ${opts.path}: ${txt}`);
    }
    return resp.json();
}
function normKey(v) {
    return String(v || "").trim().toLowerCase();
}
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
async function fetchAllItems(environment, accessToken, businessLocationId) {
    const pageSize = 200;
    let offset = 0;
    const items = [];
    while (true) {
        const qs = new URLSearchParams({
            businessLocationId: String(businessLocationId),
            offset: String(offset),
            amount: String(pageSize),
        });
        const resp = await apiJson({
            environment,
            accessToken,
            path: `/items/v1/items?${qs.toString()}`,
            method: "GET",
        });
        const page = Array.isArray(resp) ? resp : Array.isArray(resp === null || resp === void 0 ? void 0 : resp.items) ? resp.items : resp ? [resp] : [];
        if (!page.length)
            break;
        items.push(...page);
        if (page.length < pageSize)
            break;
        offset += pageSize;
    }
    return items;
}
exports.fetchAllItems = fetchAllItems;
async function fetchBusinesses(environment, accessToken) {
    return apiJson({ environment, accessToken, path: "/o/op/data/businesses", method: "GET" });
}
exports.fetchBusinesses = fetchBusinesses;
async function fetchSales(environment, accessToken, businessLocationId, startDate, endDate) {
    const out = [];
    const include = ["payments", "table", "staff", "customer"];
    const pageSize = 200;
    let nextPageToken = undefined;
    while (true) {
        const qs = new URLSearchParams({
            include: include.join(","),
            limit: String(pageSize),
        });
        if (startDate)
            qs.set("from", startDate);
        if (endDate)
            qs.set("to", endDate);
        if (nextPageToken)
            qs.set("pageToken", nextPageToken);
        const resp = await apiJson({
            environment,
            accessToken,
            path: `/f/v2/business-location/${businessLocationId}/sales?${qs.toString()}`,
            method: "GET",
        });
        const rows = Array.isArray(resp === null || resp === void 0 ? void 0 : resp.sales) ? resp.sales : Array.isArray(resp === null || resp === void 0 ? void 0 : resp.data) ? resp.data : Array.isArray(resp) ? resp : [];
        out.push(...rows);
        nextPageToken = (resp === null || resp === void 0 ? void 0 : resp.nextPageToken) || (resp === null || resp === void 0 ? void 0 : resp.next_page_token) || undefined;
        if (!nextPageToken || rows.length < pageSize)
            break;
    }
    return out;
}
exports.fetchSales = fetchSales;
async function fetchAvailability(environment, accessToken, businessLocationId, skus) {
    const results = [];
    for (const part of chunk(skus.filter(Boolean), 200)) {
        const qs = new URLSearchParams({
            businessLocationId: String(businessLocationId),
        });
        // Some deployments expect repeated `sku` params; others accept a comma list.
        // We try repeated parameters (most compatible).
        for (const sku of part)
            qs.append("sku", sku);
        const resp = await apiJson({
            environment,
            accessToken,
            path: `/o/op/1/itemAvailability?${qs.toString()}`,
            method: "GET",
        });
        const rows = Array.isArray(resp) ? resp : Array.isArray(resp === null || resp === void 0 ? void 0 : resp.availabilities) ? resp.availabilities : Array.isArray(resp === null || resp === void 0 ? void 0 : resp.data) ? resp.data : [];
        results.push(...rows);
    }
    return results;
}
function buildLocationOptions(raw) {
    var _a, _b, _c, _d;
    const businesses = Array.isArray(raw) ? raw : Array.isArray(raw === null || raw === void 0 ? void 0 : raw.businesses) ? raw.businesses : Array.isArray(raw === null || raw === void 0 ? void 0 : raw.data) ? raw.data : [];
    const out = [];
    for (const b of businesses) {
        const bId = (_a = b === null || b === void 0 ? void 0 : b.id) !== null && _a !== void 0 ? _a : b === null || b === void 0 ? void 0 : b.businessId;
        const bName = (_b = b === null || b === void 0 ? void 0 : b.name) !== null && _b !== void 0 ? _b : b === null || b === void 0 ? void 0 : b.businessName;
        const locs = Array.isArray(b === null || b === void 0 ? void 0 : b.businessLocations)
            ? b.businessLocations
            : Array.isArray(b === null || b === void 0 ? void 0 : b.locations)
                ? b.locations
                : Array.isArray(b === null || b === void 0 ? void 0 : b.business_locations)
                    ? b.business_locations
                    : [];
        for (const loc of locs) {
            const locId = Number((_d = (_c = loc === null || loc === void 0 ? void 0 : loc.id) !== null && _c !== void 0 ? _c : loc === null || loc === void 0 ? void 0 : loc.businessLocationId) !== null && _d !== void 0 ? _d : loc === null || loc === void 0 ? void 0 : loc.business_location_id);
            if (!Number.isFinite(locId))
                continue;
            out.push({
                businessId: Number.isFinite(Number(bId)) ? Number(bId) : undefined,
                businessName: bName ? String(bName) : undefined,
                businessLocationId: locId,
                businessLocationName: (loc === null || loc === void 0 ? void 0 : loc.name) ? String(loc.name) : undefined,
            });
        }
    }
    // de-dupe
    const seen = new Set();
    return out.filter((x) => {
        const k = `${x.businessLocationId}`;
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
exports.buildLocationOptions = buildLocationOptions;
/**
 * Authenticated discovery: list businesses + locations using stored token.
 */
exports.lightspeedKGetBusinesses = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    var _a, _b, _c;
    try {
        const user = await requireUser(req);
        const companyId = String((req.method === "GET" ? req.query.companyId : (_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || "").trim();
        const siteId = String((req.method === "GET" ? req.query.siteId : (_b = req.body) === null || _b === void 0 ? void 0 : _b.siteId) || "").trim() || undefined;
        const subsiteId = String((req.method === "GET" ? req.query.subsiteId : (_c = req.body) === null || _c === void 0 ? void 0 : _c.subsiteId) || "").trim() || undefined;
        if (!companyId)
            throw Object.assign(new Error("Missing companyId"), { status: 400 });
        await (0, oauthLightspeedK_1.requireCompanyMemberOrAdminSupport)(user.uid, companyId);
        const { token, accessToken } = await loadValidToken(companyId, siteId, subsiteId);
        const raw = await fetchBusinesses(token.environment || "production", accessToken);
        const locations = buildLocationOptions(raw);
        json(res, 200, { ok: true, locations, rawSummary: { count: locations.length } });
    }
    catch (e) {
        console.error("lightspeedKGetBusinesses error:", e);
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed to fetch businesses" });
    }
});
/**
 * Server-side sync used by `lightspeedKRunSync` and the scheduled job.
 * Products → RTDB stock; inventory rows; sales summaries → RTDB POS bills.
 */
async function runLightspeedKSyncCore(input) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17;
    const { companyId, siteId, subsiteId, startDate, endDate, body, triggeredBy } = input;
    const settingsPath = getSettingsPath(companyId, siteId, subsiteId);
    const settingsSnap = await admin_1.db.ref(settingsPath).get();
    const settings = settingsSnap.exists() ? settingsSnap.val() : {};
    const b = body && typeof body === "object" ? body : {};
    const syncProducts = b.syncProducts !== undefined ? Boolean(b.syncProducts) : Boolean(settings === null || settings === void 0 ? void 0 : settings.syncProducts);
    const syncSales = b.syncSales !== undefined ? Boolean(b.syncSales) : Boolean(settings === null || settings === void 0 ? void 0 : settings.syncSales);
    const syncInventory = b.syncInventory !== undefined ? Boolean(b.syncInventory) : Boolean(settings === null || settings === void 0 ? void 0 : settings.syncInventory);
    const businessLocationId = Number((_b = (_a = b.businessLocationId) !== null && _a !== void 0 ? _a : settings === null || settings === void 0 ? void 0 : settings.businessLocationId) !== null && _b !== void 0 ? _b : 0);
    if (!Number.isFinite(businessLocationId) || businessLocationId <= 0) {
        throw Object.assign(new Error("Missing businessLocationId. Use 'Discover locations' then save a location."), { status: 400 });
    }
    const stockBasePath = getStockBasePath(companyId, siteId, subsiteId);
    const posBasePath = getPOSBasePath(companyId, siteId, subsiteId);
    try {
        await admin_1.db.ref(settingsPath).update({
            syncStatus: "syncing",
            syncError: null,
            lastSyncAt: Date.now(),
            updatedAt: Date.now(),
        });
        kSyncLog("runSync_start", {
            triggeredBy,
            companyId,
            siteId: siteId || "default",
            subsiteId: subsiteId || "default",
            businessLocationId,
            syncProducts,
            syncSales,
            syncInventory,
            hasStartDate: Boolean(startDate),
            hasEndDate: Boolean(endDate),
        });
        const { token, accessToken } = await loadValidToken(companyId, siteId, subsiteId);
        const env = token.environment || ((settings === null || settings === void 0 ? void 0 : settings.environment) === "trial" ? "trial" : "production");
        const result = {
            ok: true,
            products: { created: 0, updated: 0, errors: 0 },
            inventory: { updated: 0, errors: 0 },
            sales: { created: 0, updated: 0, errors: 0 },
        };
        const productsSnap = await admin_1.db.ref(`${stockBasePath}/products`).get();
        const existingProducts = productsSnap.exists() ? productsSnap.val() : {};
        const bySku = new Map();
        const byName = new Map();
        for (const [id, p] of Object.entries(existingProducts)) {
            const sku = p === null || p === void 0 ? void 0 : p.sku;
            const name = p === null || p === void 0 ? void 0 : p.name;
            if (sku)
                bySku.set(normKey(sku), { id, data: p });
            if (name)
                byName.set(normKey(name), { id, data: p });
        }
        if (syncProducts) {
            const items = await fetchAllItems(env, accessToken, businessLocationId);
            for (const it of items) {
                try {
                    const itemId = String((_d = (_c = it === null || it === void 0 ? void 0 : it.id) !== null && _c !== void 0 ? _c : it === null || it === void 0 ? void 0 : it.itemId) !== null && _d !== void 0 ? _d : "");
                    const name = String((_f = (_e = it === null || it === void 0 ? void 0 : it.name) !== null && _e !== void 0 ? _e : it === null || it === void 0 ? void 0 : it.description) !== null && _f !== void 0 ? _f : "").trim();
                    if (!itemId || !name)
                        continue;
                    const sku = String((_k = (_j = (_h = (_g = it === null || it === void 0 ? void 0 : it.sku) !== null && _g !== void 0 ? _g : it === null || it === void 0 ? void 0 : it.skuCode) !== null && _h !== void 0 ? _h : it === null || it === void 0 ? void 0 : it.PLU) !== null && _j !== void 0 ? _j : it === null || it === void 0 ? void 0 : it.plu) !== null && _k !== void 0 ? _k : itemId).trim();
                    const price = Number((_p = (_o = (_m = (_l = it === null || it === void 0 ? void 0 : it.price) === null || _l === void 0 ? void 0 : _l.amount) !== null && _m !== void 0 ? _m : it === null || it === void 0 ? void 0 : it.price) !== null && _o !== void 0 ? _o : it === null || it === void 0 ? void 0 : it.unitPrice) !== null && _p !== void 0 ? _p : 0);
                    const cost = Number((_s = (_r = (_q = it === null || it === void 0 ? void 0 : it.cost) === null || _q === void 0 ? void 0 : _q.amount) !== null && _r !== void 0 ? _r : it === null || it === void 0 ? void 0 : it.cost) !== null && _s !== void 0 ? _s : 0);
                    const categoryId = (it === null || it === void 0 ? void 0 : it.categoryId) ? String(it.categoryId) : "default";
                    const local = {
                        name,
                        sku,
                        type: "product",
                        categoryId,
                        subcategoryId: "default",
                        salesDivisionId: "default",
                        active: (it === null || it === void 0 ? void 0 : it.active) !== undefined ? Boolean(it.active) : true,
                        salesPrice: Number.isFinite(price) ? price : 0,
                        purchasePrice: Number.isFinite(cost) ? cost : 0,
                        predictedStock: 0,
                        description: (it === null || it === void 0 ? void 0 : it.description) ? String(it.description) : undefined,
                        image: (it === null || it === void 0 ? void 0 : it.imageUrl) ? String(it.imageUrl) : undefined,
                        metadata: {
                            lightspeedk: {
                                businessLocationId,
                                itemId,
                                sku,
                                raw: undefined,
                            },
                        },
                    };
                    if (Number.isFinite(price) && price > 0) {
                        local.sale = {
                            price,
                            measure: "unit",
                            quantity: 1,
                            supplierId: "default",
                            defaultMeasure: "unit",
                            units: [{ measure: "unit", price, quantity: 1 }],
                        };
                    }
                    if (Number.isFinite(cost) && cost > 0) {
                        local.purchase = {
                            price: cost,
                            measure: "unit",
                            quantity: 1,
                            supplierId: "default",
                            defaultMeasure: "unit",
                            units: [{ measure: "unit", price: cost, quantity: 1 }],
                        };
                    }
                    const skuKey = normKey(sku);
                    const nameKey = normKey(name);
                    const existing = (skuKey && bySku.get(skuKey)) ||
                        (nameKey && byName.get(nameKey)) ||
                        undefined;
                    if (existing) {
                        const targetRef = admin_1.db.ref(`${stockBasePath}/products/${existing.id}`);
                        await targetRef.update(Object.assign(Object.assign({}, local), { id: existing.id, updatedAt: new Date().toISOString() }));
                        result.products.updated++;
                    }
                    else {
                        const deterministicId = `lightspeedk_${businessLocationId}_${itemId}`.replace(/[^\w-]/g, "_");
                        const targetRef = admin_1.db.ref(`${stockBasePath}/products/${deterministicId}`);
                        const createdAt = new Date().toISOString();
                        await targetRef.set(Object.assign(Object.assign({}, local), { id: deterministicId, createdAt, updatedAt: createdAt }));
                        result.products.created++;
                        if (sku)
                            bySku.set(skuKey, { id: deterministicId, data: local });
                        if (name)
                            byName.set(nameKey, { id: deterministicId, data: local });
                    }
                }
                catch (err) {
                    console.error("lightspeedKRunSync product error:", err);
                    result.products.errors++;
                }
            }
        }
        if (syncInventory) {
            try {
                const currentSnap = await admin_1.db.ref(`${stockBasePath}/products`).get();
                const currentProducts = currentSnap.exists() ? currentSnap.val() : {};
                const skuToId = new Map();
                for (const [id, p] of Object.entries(currentProducts)) {
                    const sku = p === null || p === void 0 ? void 0 : p.sku;
                    if (sku)
                        skuToId.set(normKey(sku), id);
                }
                const skus = Array.from(skuToId.keys());
                const availabilityRows = await fetchAvailability(env, accessToken, businessLocationId, skus);
                for (const row of availabilityRows) {
                    try {
                        const sku = String((_u = (_t = row === null || row === void 0 ? void 0 : row.sku) !== null && _t !== void 0 ? _t : row === null || row === void 0 ? void 0 : row.itemSku) !== null && _u !== void 0 ? _u : "").trim();
                        if (!sku)
                            continue;
                        const id = skuToId.get(normKey(sku));
                        if (!id)
                            continue;
                        const qty = Number((_x = (_w = (_v = row === null || row === void 0 ? void 0 : row.availableQuantity) !== null && _v !== void 0 ? _v : row === null || row === void 0 ? void 0 : row.available) !== null && _w !== void 0 ? _w : row === null || row === void 0 ? void 0 : row.quantity) !== null && _x !== void 0 ? _x : 0);
                        await admin_1.db.ref(`${stockBasePath}/products/${id}`).update({
                            quantity: Number.isFinite(qty) ? qty : 0,
                            updatedAt: new Date().toISOString(),
                        });
                        result.inventory.updated++;
                    }
                    catch (err) {
                        console.error("lightspeedKRunSync inventory row error:", err);
                        result.inventory.errors++;
                    }
                }
            }
            catch (err) {
                console.error("lightspeedKRunSync inventory error:", err);
                result.inventory.errors++;
            }
        }
        if (syncSales) {
            const sales = await fetchSales(env, accessToken, businessLocationId, startDate, endDate);
            kSyncLog("runSync_sales_fetched", { companyId, businessLocationId, saleRows: sales.length, triggeredBy });
            const billsSnap = await admin_1.db.ref(`${posBasePath}/bills`).get();
            const existingBills = billsSnap.exists() ? billsSnap.val() : {};
            const existingIds = new Set(Object.keys(existingBills));
            for (const s of sales) {
                try {
                    const saleId = String((_0 = (_z = (_y = s === null || s === void 0 ? void 0 : s.id) !== null && _y !== void 0 ? _y : s === null || s === void 0 ? void 0 : s.saleId) !== null && _z !== void 0 ? _z : s === null || s === void 0 ? void 0 : s.orderId) !== null && _0 !== void 0 ? _0 : "");
                    if (!saleId)
                        continue;
                    const total = Number((_4 = (_3 = (_2 = (_1 = s === null || s === void 0 ? void 0 : s.total) === null || _1 === void 0 ? void 0 : _1.amount) !== null && _2 !== void 0 ? _2 : s === null || s === void 0 ? void 0 : s.totalAmount) !== null && _3 !== void 0 ? _3 : s === null || s === void 0 ? void 0 : s.total) !== null && _4 !== void 0 ? _4 : 0);
                    const subtotal = Number((_8 = (_7 = (_6 = (_5 = s === null || s === void 0 ? void 0 : s.subtotal) === null || _5 === void 0 ? void 0 : _5.amount) !== null && _6 !== void 0 ? _6 : s === null || s === void 0 ? void 0 : s.subTotalAmount) !== null && _7 !== void 0 ? _7 : s === null || s === void 0 ? void 0 : s.subtotal) !== null && _8 !== void 0 ? _8 : 0);
                    const tax = Number((_12 = (_11 = (_10 = (_9 = s === null || s === void 0 ? void 0 : s.tax) === null || _9 === void 0 ? void 0 : _9.amount) !== null && _10 !== void 0 ? _10 : s === null || s === void 0 ? void 0 : s.taxAmount) !== null && _11 !== void 0 ? _11 : s === null || s === void 0 ? void 0 : s.tax) !== null && _12 !== void 0 ? _12 : 0);
                    const createdAt = (() => {
                        var _a, _b, _c;
                        const when = Date.parse(String((_c = (_b = (_a = s === null || s === void 0 ? void 0 : s.date) !== null && _a !== void 0 ? _a : s === null || s === void 0 ? void 0 : s.createdAt) !== null && _b !== void 0 ? _b : s === null || s === void 0 ? void 0 : s.closedAt) !== null && _c !== void 0 ? _c : ""));
                        return Number.isFinite(when) ? when : Date.now();
                    })();
                    const raw = s;
                    const tableName = ((_13 = raw === null || raw === void 0 ? void 0 : raw.table) === null || _13 === void 0 ? void 0 : _13.name) ||
                        ((_14 = raw === null || raw === void 0 ? void 0 : raw.table) === null || _14 === void 0 ? void 0 : _14.tableName) ||
                        ((_15 = raw === null || raw === void 0 ? void 0 : raw.table) === null || _15 === void 0 ? void 0 : _15.displayName) ||
                        ((_16 = raw === null || raw === void 0 ? void 0 : raw.metadata) === null || _16 === void 0 ? void 0 : _16.tableName) ||
                        "TAKEAWAY";
                    const staffName = ((_17 = raw === null || raw === void 0 ? void 0 : raw.staff) === null || _17 === void 0 ? void 0 : _17.name) ||
                        (raw === null || raw === void 0 ? void 0 : raw.ownerName) ||
                        (raw === null || raw === void 0 ? void 0 : raw.staffName) ||
                        (raw === null || raw === void 0 ? void 0 : raw.customerName) ||
                        "System";
                    const billId = `lightspeedk_${businessLocationId}_${saleId}`.replace(/[^\w-]/g, "_");
                    const bill = {
                        id: billId,
                        tableName: String(tableName),
                        tableNumber: String(tableName),
                        server: String(staffName),
                        staffName: String(staffName),
                        items: [],
                        subtotal: Number.isFinite(subtotal) ? subtotal : 0,
                        tax: Number.isFinite(tax) ? tax : 0,
                        total: Number.isFinite(total) ? total : 0,
                        status: "paid",
                        paymentStatus: "completed",
                        serviceCharge: 0,
                        discount: 0,
                        createdAt,
                        updatedAt: Date.now(),
                        paymentMethod: "lightspeed",
                        locationId: String(businessLocationId),
                        locationName: (settings === null || settings === void 0 ? void 0 : settings.businessLocationName) ? String(settings.businessLocationName) : undefined,
                    };
                    const existed = existingIds.has(billId);
                    await admin_1.db.ref(`${posBasePath}/bills/${billId}`).update(bill);
                    if (existed)
                        result.sales.updated++;
                    else {
                        result.sales.created++;
                        existingIds.add(billId);
                    }
                }
                catch (err) {
                    console.error("lightspeedKRunSync sale error:", err);
                    result.sales.errors++;
                }
            }
        }
        await admin_1.db.ref(settingsPath).update({
            syncStatus: "success",
            syncError: null,
            lastSyncAt: Date.now(),
            updatedAt: Date.now(),
        });
        kSyncLog("runSync_success", {
            triggeredBy,
            companyId,
            businessLocationId,
            products: result.products,
            inventory: result.inventory,
            sales: result.sales,
        });
        return result;
    }
    catch (e) {
        console.error("runLightspeedKSyncCore error:", e);
        kSyncLog("runSync_error", {
            triggeredBy,
            message: String((e === null || e === void 0 ? void 0 : e.message) || e),
            status: e === null || e === void 0 ? void 0 : e.status,
            companyId,
        });
        try {
            await admin_1.db.ref(settingsPath).update({
                syncStatus: "error",
                syncError: (e === null || e === void 0 ? void 0 : e.message) || "Sync failed",
                updatedAt: Date.now(),
            });
        }
        catch (_18) { }
        throw e;
    }
}
exports.runLightspeedKSyncCore = runLightspeedKSyncCore;
/**
 * Authenticated sync runner (manual / app-triggered).
 */
exports.lightspeedKRunSync = (0, https_1.onRequest)({ cors: true, secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"] }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        if (req.method !== "POST") {
            json(res, 405, { ok: false, error: "Method not allowed" });
            return;
        }
        const user = await requireUser(req);
        const companyId = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || "").trim();
        const siteId = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.siteId) || "").trim() || undefined;
        const subsiteId = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.subsiteId) || "").trim() || undefined;
        const startDate = ((_d = req.body) === null || _d === void 0 ? void 0 : _d.startDate) ? String(req.body.startDate) : undefined;
        const endDate = ((_e = req.body) === null || _e === void 0 ? void 0 : _e.endDate) ? String(req.body.endDate) : undefined;
        if (!companyId)
            throw Object.assign(new Error("Missing companyId"), { status: 400 });
        await (0, oauthLightspeedK_1.requireCompanyMemberOrAdminSupport)(user.uid, companyId);
        const result = await runLightspeedKSyncCore({
            triggeredBy: "http",
            companyId,
            siteId,
            subsiteId,
            startDate,
            endDate,
            body: req.body && typeof req.body === "object" ? req.body : undefined,
        });
        json(res, 200, result);
    }
    catch (e) {
        console.error("lightspeedKRunSync error:", e);
        json(res, (e === null || e === void 0 ? void 0 : e.status) || 500, { ok: false, error: (e === null || e === void 0 ? void 0 : e.message) || "Sync failed" });
    }
});
const SCHEDULE_MAX_TARGETS = 18;
/**
 * Periodically pulls Lightspeed data for tenants that enabled auto-sync in POS settings.
 * Runs every 15 minutes; respects `autoSyncInterval` (minutes) between successful runs per tenant.
 */
exports.lightspeedKScheduledSync = (0, scheduler_1.onSchedule)({
    schedule: "every 15 minutes",
    secrets: ["LIGHTSPEEDK_CLIENT_ID", "LIGHTSPEEDK_CLIENT_SECRET"],
    timeoutSeconds: 540,
    memory: "512MiB",
}, async () => {
    kSyncLog("schedule_tick_start", {});
    const qs = await admin_1.firestore.collection("pos_oauth_tokens").where("provider", "==", "lightspeedk").limit(250).get();
    let ran = 0;
    for (const doc of qs.docs) {
        if (ran >= SCHEDULE_MAX_TARGETS)
            break;
        const data = doc.data();
        const companyId = String(data.companyId || "").trim();
        if (!companyId)
            continue;
        const siteId = String(data.siteId || "default") === "default" ? undefined : String(data.siteId);
        const subsiteId = String(data.subsiteId || "default") === "default" ? undefined : String(data.subsiteId);
        const settingsPath = getSettingsPath(companyId, siteId, subsiteId);
        const settingsSnap = await admin_1.db.ref(settingsPath).get();
        const settings = settingsSnap.exists() ? settingsSnap.val() : {};
        if (!settings.autoSyncEnabled)
            continue;
        const bl = Number(settings.businessLocationId || 0);
        if (!Number.isFinite(bl) || bl <= 0)
            continue;
        const intervalMin = Math.max(5, Number(settings.autoSyncInterval || 30));
        const lastOk = Number(settings.lastScheduledSyncAt || 0);
        if (lastOk && Date.now() - lastOk < intervalMin * 60 * 1000)
            continue;
        try {
            await runLightspeedKSyncCore({
                triggeredBy: "schedule",
                companyId,
                siteId,
                subsiteId,
            });
            await admin_1.db.ref(settingsPath).update({ lastScheduledSyncAt: Date.now() });
            ran++;
        }
        catch (e) {
            kSyncLog("schedule_target_failed", { companyId, siteId: siteId || "default", message: String((e === null || e === void 0 ? void 0 : e.message) || e) });
        }
    }
    kSyncLog("schedule_tick_done", { tokenDocs: qs.size, ran });
});
//# sourceMappingURL=lightspeedKSync.js.map