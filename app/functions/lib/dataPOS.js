"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePOSDataRequest = void 0;
const crypto_1 = require("crypto");
const admin_1 = require("./admin");
const json = (res, status, body) => {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
};
const stripUndefinedDeep = (value) => {
    if (Array.isArray(value))
        return value.map(stripUndefinedDeep);
    if (value && typeof value === "object") {
        const out = {};
        for (const [key, child] of Object.entries(value)) {
            if (child === undefined)
                continue;
            out[key] = stripUndefinedDeep(child);
        }
        return out;
    }
    return value;
};
const firstQueryValue = (value) => {
    if (Array.isArray(value))
        return typeof value[0] === "string" ? value[0] : undefined;
    return typeof value === "string" ? value : undefined;
};
const normalizeBasePath = (raw) => String(raw || "").trim().replace(/\/+$/, "");
const parseScope = (rawBasePath) => {
    const basePath = normalizeBasePath(rawBasePath);
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/pos$/i);
    if (!match)
        throw Object.assign(new Error("Invalid POS basePath"), { status: 400 });
    return {
        companyId: match[1],
        siteId: match[2] || null,
        subsiteId: match[3] || null,
        basePath,
    };
};
const ENTITY_NAMES = new Set([
    "bills",
    "transactions",
    "tillscreens",
    "paymentTypes",
    "floorplans",
    "tables",
    "discounts",
    "promotions",
    "corrections",
    "bagCheckItems",
    "locations",
    "devices",
    "paymentIntegrations",
    "tickets",
    "ticketSales",
    "paymentTransactions",
    "sales",
    "groups",
    "courses",
    "cards",
    "bagCheckConfig",
]);
const assertEntity = (value) => {
    if (!ENTITY_NAMES.has(value))
        throw Object.assign(new Error(`Unsupported POS entity: ${value}`), { status: 400 });
    return value;
};
const rowIdFor = (entityType, basePath, entityId) => `${entityType}::${basePath}::${entityId}`;
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for POS provider"), {
            status: 500,
        });
    }
    return { url, serviceRoleKey };
};
const supabaseRequest = async (path, init) => {
    const { url, serviceRoleKey } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/${path}`, Object.assign(Object.assign({}, init), { headers: Object.assign({ apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: "application/json", "Content-Type": "application/json" }, ((init === null || init === void 0 ? void 0 : init.headers) || {})) }));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw Object.assign(new Error(text || `Supabase request failed (${res.status})`), { status: 502 });
    }
    const text = await res.text().catch(() => "");
    return text ? JSON.parse(text) : null;
};
const listRows = async (entityType, basePath) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("entity_type", `eq.${entityType}`);
    params.set("base_path", `eq.${basePath}`);
    params.set("order", "created_at.asc");
    return (await supabaseRequest(`app_pos_entities?${params.toString()}`, { method: "GET" })) || [];
};
const getRow = async (entityType, basePath, entityId) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("entity_type", `eq.${entityType}`);
    params.set("base_path", `eq.${basePath}`);
    params.set("entity_id", `eq.${entityId}`);
    params.set("limit", "1");
    const rows = (await supabaseRequest(`app_pos_entities?${params.toString()}`, { method: "GET" }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const insertRow = async (row) => {
    const rows = (await supabaseRequest("app_pos_entities", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
    }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const patchRow = async (rowId, patch) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("row_id", `eq.${rowId}`);
    const rows = (await supabaseRequest(`app_pos_entities?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(stripUndefinedDeep(patch)),
    }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const deleteRow = async (rowId) => {
    const params = new URLSearchParams();
    params.set("row_id", `eq.${rowId}`);
    await supabaseRequest(`app_pos_entities?${params.toString()}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
    });
};
const assertCompanyAccess = async (uid, companyId) => {
    const [userCompanySnap, companyUserSnap] = await Promise.all([
        admin_1.db.ref(`users/${uid}/companies/${companyId}`).get(),
        admin_1.db.ref(`companies/${companyId}/users/${uid}`).get(),
    ]);
    if (!userCompanySnap.exists() && !companyUserSnap.exists()) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
};
const toTimestamp = (value, fallback = Date.now()) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const n = Number(value);
        if (Number.isFinite(n))
            return n;
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return fallback;
};
const deriveName = (entityType, payload, entityId) => String((payload === null || payload === void 0 ? void 0 : payload.name) ||
    (payload === null || payload === void 0 ? void 0 : payload.title) ||
    (payload === null || payload === void 0 ? void 0 : payload.tableName) ||
    (payload === null || payload === void 0 ? void 0 : payload.customerName) ||
    (payload === null || payload === void 0 ? void 0 : payload.ticketName) ||
    (payload === null || payload === void 0 ? void 0 : payload.locationName) ||
    (payload === null || payload === void 0 ? void 0 : payload.deviceName) ||
    (payload === null || payload === void 0 ? void 0 : payload.paymentMethod) ||
    (payload === null || payload === void 0 ? void 0 : payload.productId) ||
    (payload === null || payload === void 0 ? void 0 : payload.billId) ||
    entityId);
const deriveStatus = (payload) => {
    if (typeof (payload === null || payload === void 0 ? void 0 : payload.status) === "string")
        return payload.status;
    if ((payload === null || payload === void 0 ? void 0 : payload.isActive) === false)
        return "inactive";
    if ((payload === null || payload === void 0 ? void 0 : payload.isDefault) === true)
        return "default";
    return "active";
};
const createEntityRow = (scope, entityType, entityId, payload, existing) => {
    const now = Date.now();
    const cleaned = stripUndefinedDeep(payload);
    const createdAt = toTimestamp(cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt, (existing === null || existing === void 0 ? void 0 : existing.created_at) || now);
    const updatedAt = toTimestamp(cleaned === null || cleaned === void 0 ? void 0 : cleaned.updatedAt, now);
    return {
        row_id: rowIdFor(entityType, scope.basePath, entityId),
        entity_type: entityType,
        entity_id: entityId,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: deriveName(entityType, cleaned, entityId),
        status: deriveStatus(cleaned),
        payload: Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), cleaned), { id: entityId, createdAt,
            updatedAt }),
        created_at: createdAt,
        updated_at: updatedAt,
    };
};
const normalizeRow = (row) => {
    var _a;
    return (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { id: String((row === null || row === void 0 ? void 0 : row.entity_id) || ((_a = row === null || row === void 0 ? void 0 : row.payload) === null || _a === void 0 ? void 0 : _a.id) || "") }));
};
const handlePOSDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c;
    try {
        const method = String(req.method || "GET").toUpperCase();
        const listMatch = path.match(/^\/data\/pos\/entities\/([^/]+)\/?$/);
        if (listMatch) {
            const entityType = assertEntity(decodeURIComponent(listMatch[1]));
            if (method === "GET") {
                const scope = parseScope(firstQueryValue((_a = req.query) === null || _a === void 0 ? void 0 : _a.basePath) || "");
                await assertCompanyAccess(user.uid, scope.companyId);
                const rows = (await listRows(entityType, scope.basePath)).map(normalizeRow);
                json(res, 200, { ok: true, rows });
                return;
            }
            if (method === "POST") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const entityId = String(((_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.id) || (0, crypto_1.randomUUID)());
                const row = createEntityRow(scope, entityType, entityId, (body === null || body === void 0 ? void 0 : body.data) || {});
                await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row), id: entityId });
                return;
            }
        }
        const entityMatch = path.match(/^\/data\/pos\/entities\/([^/]+)\/([^/]+)\/?$/);
        if (entityMatch) {
            const entityType = assertEntity(decodeURIComponent(entityMatch[1]));
            const entityId = decodeURIComponent(entityMatch[2]);
            if (method === "PATCH") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const existing = await getRow(entityType, scope.basePath, entityId);
                if (!existing)
                    throw Object.assign(new Error(`${entityType} not found`), { status: 404 });
                const row = createEntityRow(scope, entityType, entityId, Object.assign(Object.assign({}, existing.payload), ((body === null || body === void 0 ? void 0 : body.updates) || {})), existing);
                await patchRow(row.row_id, row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
            if (method === "DELETE") {
                const scope = parseScope(firstQueryValue((_c = req.query) === null || _c === void 0 ? void 0 : _c.basePath) || "");
                await assertCompanyAccess(user.uid, scope.companyId);
                await deleteRow(rowIdFor(entityType, scope.basePath, entityId));
                json(res, 200, { ok: true });
                return;
            }
        }
        json(res, 404, { error: `Unhandled POS route: ${method} ${path}` });
    }
    catch (error) {
        json(res, (error === null || error === void 0 ? void 0 : error.status) || 500, { error: (error === null || error === void 0 ? void 0 : error.message) || "Unexpected POS data error" });
    }
};
exports.handlePOSDataRequest = handlePOSDataRequest;
//# sourceMappingURL=dataPOS.js.map