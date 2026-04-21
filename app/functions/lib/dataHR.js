"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHRDataRequest = void 0;
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
const normalizeBasePath = (raw) => String(raw || "").trim().replace(/\/+$/, "");
const parseHrScope = (rawBasePath) => {
    const basePath = normalizeBasePath(rawBasePath);
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/hr$/i);
    if (!match) {
        throw Object.assign(new Error("Invalid HR basePath"), { status: 400 });
    }
    return {
        companyId: match[1],
        siteId: match[2] || null,
        subsiteId: match[3] || null,
        basePath,
    };
};
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for HR provider"), { status: 500 });
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
const assertCompanyAccess = async (uid, companyId) => {
    const [userCompanySnap, ownedCompanySnap] = await Promise.all([
        admin_1.db.ref(`users/${uid}/companies/${companyId}`).get(),
        admin_1.db.ref(`companies/${companyId}/users/${uid}`).get(),
    ]);
    if (!userCompanySnap.exists() && !ownedCompanySnap.exists()) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
};
const getSingleRow = async (table, filters) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("limit", "1");
    for (const [key, value] of Object.entries(filters)) {
        params.set(key, `eq.${value}`);
    }
    const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const listRows = async (table, basePath) => {
    const params = new URLSearchParams();
    params.set("base_path", `eq.${basePath}`);
    params.set("select", "id,payload,created_at,updated_at");
    params.set("order", "created_at.asc");
    const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" }));
    return (rows || []).map((row) => (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { id: row === null || row === void 0 ? void 0 : row.id })));
};
const insertRow = async (table, row) => {
    const rows = (await supabaseRequest(`${table}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
    }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const patchRow = async (table, filters, patch) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    for (const [key, value] of Object.entries(filters)) {
        params.set(key, `eq.${value}`);
    }
    const rows = (await supabaseRequest(`${table}?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(stripUndefinedDeep(patch)),
    }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const deleteRow = async (table, filters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        params.set(key, `eq.${value}`);
    }
    await supabaseRequest(`${table}?${params.toString()}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
    });
};
const getCreatedAt = (payload) => {
    const value = payload === null || payload === void 0 ? void 0 : payload.createdAt;
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return Date.now();
};
const createEntityRow = (scope, id, payload, opts) => {
    var _a, _b;
    const cleaned = stripUndefinedDeep(payload);
    return {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: String((opts === null || opts === void 0 ? void 0 : opts.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.employeeName) || id),
        status: (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.status) !== null && _a !== void 0 ? _a : cleaned === null || cleaned === void 0 ? void 0 : cleaned.status) !== null && _b !== void 0 ? _b : null,
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: getCreatedAt(cleaned),
        updated_at: Date.now(),
    };
};
const upsertEntity = async (table, scope, id, payload, opts) => {
    const existing = await getSingleRow(table, { id, base_path: scope.basePath });
    const mergedPayload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), stripUndefinedDeep(payload)), { id });
    const row = createEntityRow(scope, id, mergedPayload, opts);
    if (!existing) {
        await insertRow(table, row);
    }
    else {
        await patchRow(table, { id, base_path: scope.basePath }, row);
    }
    return Object.assign(Object.assign({}, (row.payload || {})), { id });
};
const upsertEmployee = async (scope, id, payload) => upsertEntity("hr_employees", scope, id, payload, {
    name: [payload === null || payload === void 0 ? void 0 : payload.firstName, payload === null || payload === void 0 ? void 0 : payload.lastName].filter(Boolean).join(" ").trim() || (payload === null || payload === void 0 ? void 0 : payload.email) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || "active",
});
const upsertTimeOff = async (scope, id, payload) => upsertEntity("hr_time_offs", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.employeeName) || (payload === null || payload === void 0 ? void 0 : payload.employeeId) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || "pending",
});
const upsertAttendance = async (scope, id, payload) => upsertEntity("hr_attendances", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.employeeId) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || "present",
});
const upsertSchedule = async (scope, id, payload) => upsertEntity("hr_schedules", scope, id, payload, {
    name: `${(payload === null || payload === void 0 ? void 0 : payload.employeeName) || (payload === null || payload === void 0 ? void 0 : payload.employeeId) || "schedule"} ${(payload === null || payload === void 0 ? void 0 : payload.date) || ""}`.trim(),
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || "scheduled",
});
const handleHRDataRequest = async ({ req, res, path, body, user }) => {
    var _a;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    const entityMap = {
        employees: {
            table: "hr_employees",
            list: (scope) => listRows("hr_employees", scope.basePath),
            upsert: upsertEmployee,
        },
        timeOffs: {
            table: "hr_time_offs",
            list: (scope) => listRows("hr_time_offs", scope.basePath),
            upsert: upsertTimeOff,
        },
        attendances: {
            table: "hr_attendances",
            list: (scope) => listRows("hr_attendances", scope.basePath),
            upsert: upsertAttendance,
        },
        schedules: {
            table: "hr_schedules",
            list: (scope) => listRows("hr_schedules", scope.basePath),
            upsert: upsertSchedule,
        },
    };
    const listMatch = pathname.match(/^\/data\/hr\/(employees|timeOffs|attendances|schedules)$/);
    if (listMatch && method === "GET") {
        const scope = parseHrScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        send(200, { ok: true, rows: await entityMap[entity].list(scope) });
        return;
    }
    if (listMatch && method === "POST") {
        const scope = parseHrScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        const id = String(((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.id) || (0, crypto_1.randomUUID)());
        const row = await entityMap[entity].upsert(scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        send(200, { ok: true, id, row });
        return;
    }
    const itemMatch = pathname.match(/^\/data\/hr\/(employees|timeOffs|attendances|schedules)\/([^/]+)$/);
    if (itemMatch && method === "PATCH") {
        const scope = parseHrScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        const row = await entityMap[entity].upsert(scope, id, (body === null || body === void 0 ? void 0 : body.updates) || {});
        send(200, { ok: true, row });
        return;
    }
    if (itemMatch && method === "DELETE") {
        const scope = parseHrScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath });
        send(200, { ok: true });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleHRDataRequest = handleHRDataRequest;
//# sourceMappingURL=dataHR.js.map