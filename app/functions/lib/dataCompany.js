"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCompanyDataRequest = void 0;
const crypto_1 = require("crypto");
const admin_1 = require("./admin");
const DEFAULT_PERMISSIONS = {
    defaultPermissions: { modules: {} },
    roles: {},
    departments: {},
    users: {},
    employees: {},
    rolesMeta: {},
    departmentsMeta: {},
    usersMeta: {},
    employeesMeta: {},
    defaultRole: "staff",
    defaultDepartment: "front-of-house",
};
const DEFAULT_CONFIG = [];
const json = (res, status, body) => {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
};
const cloneJson = (value) => JSON.parse(JSON.stringify(value));
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
const toMillis = (value, fallback = Date.now()) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return fallback;
};
const normalizeDataManagement = (value) => {
    if (!value || typeof value !== "object")
        return value;
    return {
        accessibleModules: value.accessibleModules || {},
        accessibleSites: Array.isArray(value.accessibleSites) ? value.accessibleSites : [],
        accessibleSubsites: Array.isArray(value.accessibleSubsites) ? value.accessibleSubsites : [],
    };
};
const setNestedValue = (source, path, value) => {
    const root = source && typeof source === "object" ? cloneJson(source) : {};
    if (!path.length)
        return stripUndefinedDeep(value);
    let cursor = root;
    for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        const child = cursor[key];
        if (!child || typeof child !== "object") {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = stripUndefinedDeep(value);
    return root;
};
const configRowId = (companyId, scopeType, siteId, subsiteId) => [companyId, scopeType, siteId || "", subsiteId || ""].join("::");
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Company provider"), { status: 500 });
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
const listRows = async (table, filters, order = "created_at.asc") => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", order);
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "")
            continue;
        params.set(key, `eq.${value}`);
    }
    return (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) || [];
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
const assertCompanyAccess = async (uid, companyId, opts) => {
    const [userCompanySnap, ownedCompanySnap] = await Promise.all([
        admin_1.db.ref(`users/${uid}/companies/${companyId}`).get(),
        admin_1.db.ref(`companies/${companyId}/users/${uid}`).get(),
    ]);
    if (userCompanySnap.exists() || ownedCompanySnap.exists())
        return;
    if (opts === null || opts === void 0 ? void 0 : opts.allowCreator) {
        const companyRow = await getSingleRow("companies", { id: companyId });
        if ((companyRow === null || companyRow === void 0 ? void 0 : companyRow.created_by) === uid)
            return;
    }
    throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const assertSelfAccess = (actorUid, targetUid) => {
    if (actorUid !== targetUid) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
};
const toCompanyPayload = (companyId, payload, existing) => {
    var _a, _b;
    const now = Date.now();
    const merged = stripUndefinedDeep(Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), (payload || {})), { companyID: companyId }));
    return {
        id: companyId,
        name: String(merged.companyName || merged.name || companyId),
        status: merged.companyStatus || null,
        company_type: merged.companyType || null,
        payload: merged,
        created_at: (_a = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _a !== void 0 ? _a : toMillis((_b = merged.createdAt) !== null && _b !== void 0 ? _b : merged.companyCreated, now),
        updated_at: now,
    };
};
const toSitePayload = (companyId, siteId, payload, existing) => {
    var _a, _b, _c, _d;
    const now = Date.now();
    const merged = stripUndefinedDeep(Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), (payload || {})), { siteID: siteId, companyID: companyId, updatedAt: now }));
    if (!merged.address) {
        merged.address = { street: "", city: "", state: "", zipCode: "", country: "" };
    }
    if (!merged.teams)
        merged.teams = {};
    if (merged.dataManagement)
        merged.dataManagement = normalizeDataManagement(merged.dataManagement);
    merged.createdAt = (_c = (_b = (_a = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _a === void 0 ? void 0 : _a.createdAt) !== null && _b !== void 0 ? _b : merged.createdAt) !== null && _c !== void 0 ? _c : now;
    const payloadWithoutSubsites = Object.assign(Object.assign({}, merged), { subsites: {} });
    return {
        id: siteId,
        company_id: companyId,
        name: String(merged.name || merged.siteName || siteId),
        payload: payloadWithoutSubsites,
        created_at: (_d = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _d !== void 0 ? _d : toMillis(merged.createdAt, now),
        updated_at: now,
    };
};
const toSubsitePayload = (companyId, siteId, subsiteId, payload, existing) => {
    var _a, _b, _c, _d;
    const now = Date.now();
    const merged = stripUndefinedDeep(Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), (payload || {})), { subsiteID: subsiteId, updatedAt: now }));
    if (!merged.address) {
        merged.address = { street: "", city: "", state: "", zipCode: "", country: "" };
    }
    if (!merged.teams)
        merged.teams = {};
    if (merged.dataManagement)
        merged.dataManagement = normalizeDataManagement(merged.dataManagement);
    merged.createdAt = (_c = (_b = (_a = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _a === void 0 ? void 0 : _a.createdAt) !== null && _b !== void 0 ? _b : merged.createdAt) !== null && _c !== void 0 ? _c : now;
    return {
        id: subsiteId,
        company_id: companyId,
        site_id: siteId,
        name: String(merged.name || merged.subsiteName || subsiteId),
        payload: merged,
        created_at: (_d = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _d !== void 0 ? _d : toMillis(merged.createdAt, now),
        updated_at: now,
    };
};
const buildSetupFallback = (companyId, companyPayload) => {
    var _a, _b, _c, _d;
    const safeParseIso = (iso) => {
        if (typeof iso !== "string")
            return null;
        const ms = Date.parse(iso);
        return Number.isFinite(ms) ? ms : null;
    };
    const createdAt = (_b = (_a = (typeof (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.createdAt) === "number" ? companyPayload.createdAt : null)) !== null && _a !== void 0 ? _a : safeParseIso(companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyCreated)) !== null && _b !== void 0 ? _b : Date.now();
    const updatedAt = (_d = (_c = (typeof (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.updatedAt) === "number" ? companyPayload.updatedAt : null)) !== null && _c !== void 0 ? _c : safeParseIso(companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyUpdated)) !== null && _d !== void 0 ? _d : undefined;
    return Object.assign({ id: companyId, name: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyName) || (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.name) || ""), legalName: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.legalName) || (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyName) || (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.name) || ""), companyType: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyType) || "hospitality").trim().toLowerCase() || "hospitality", address: {
            street: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyAddress) || ""),
            city: "",
            state: "",
            zipCode: "",
            country: "",
        }, contact: {
            email: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyEmail) || ""),
            phone: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyPhone) || ""),
            website: (companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyWebsite) ? String(companyPayload.companyWebsite) : "",
        }, business: {
            taxId: "",
            registrationNumber: "",
            industry: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyIndustry) || ""),
            businessType: "",
        }, settings: {
            currency: "USD",
            timezone: "UTC",
            dateFormat: "MM/DD/YYYY",
            fiscalYearStart: "01/01",
            enableNotifications: true,
            enableMultiLocation: false,
            workingDays: ["1", "2", "3", "4", "5"],
            workingHours: { start: "09:00", end: "17:00" },
        }, branding: {
            logo: String((companyPayload === null || companyPayload === void 0 ? void 0 : companyPayload.companyLogo) || ""),
            primaryColor: "",
            secondaryColor: "",
        }, createdAt }, (updatedAt !== undefined ? { updatedAt } : {}));
};
const listCompanySites = async (companyId) => {
    const [siteRows, subsiteRows] = await Promise.all([
        listRows("company_sites", { company_id: companyId }),
        listRows("company_subsites", { company_id: companyId }),
    ]);
    const subsitesBySite = new Map();
    for (const row of subsiteRows) {
        const siteId = String((row === null || row === void 0 ? void 0 : row.site_id) || "");
        if (!siteId)
            continue;
        const existing = subsitesBySite.get(siteId) || {};
        existing[row.id] = Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { subsiteID: row.id });
        subsitesBySite.set(siteId, existing);
    }
    return siteRows.map((row) => (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { siteID: row.id, companyID: companyId, subsites: subsitesBySite.get(String(row.id)) || {} })));
};
const getPermissionPayload = async (companyId) => {
    const row = await getSingleRow("company_permissions", { id: companyId });
    return (row === null || row === void 0 ? void 0 : row.payload) || null;
};
const upsertPermissions = async (companyId, payload) => {
    const row = {
        id: companyId,
        company_id: companyId,
        payload: stripUndefinedDeep(payload),
        updated_at: Date.now(),
    };
    const existing = await getSingleRow("company_permissions", { id: companyId });
    if (!existing) {
        await insertRow("company_permissions", row);
        return row.payload;
    }
    await patchRow("company_permissions", { id: companyId }, row);
    return row.payload;
};
const getConfigPayload = async (companyId, scopeType, siteId, subsiteId) => {
    var _a;
    const row = await getSingleRow("company_configs", { id: configRowId(companyId, scopeType, siteId, subsiteId) });
    return (_a = row === null || row === void 0 ? void 0 : row.payload) !== null && _a !== void 0 ? _a : null;
};
const upsertConfig = async (companyId, scopeType, siteId, subsiteId, payload) => {
    const row = {
        id: configRowId(companyId, scopeType, siteId, subsiteId),
        company_id: companyId,
        scope_type: scopeType,
        site_id: siteId,
        subsite_id: subsiteId,
        payload: stripUndefinedDeep(payload),
        updated_at: Date.now(),
    };
    const existing = await getSingleRow("company_configs", { id: row.id });
    if (!existing) {
        await insertRow("company_configs", row);
        return row.payload;
    }
    await patchRow("company_configs", { id: row.id }, row);
    return row.payload;
};
const handleCompanyDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    if (pathname === "/data/company/companies" && method === "POST") {
        const companyId = String(((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.companyID) || (0, crypto_1.randomUUID)());
        const row = Object.assign(Object.assign({}, toCompanyPayload(companyId, (body === null || body === void 0 ? void 0 : body.data) || {})), { created_by: user.uid });
        await insertRow("companies", row);
        await Promise.all([
            upsertPermissions(companyId, cloneJson(DEFAULT_PERMISSIONS)),
            upsertConfig(companyId, "company", null, null, cloneJson(DEFAULT_CONFIG)),
        ]);
        send(200, { ok: true, id: companyId, row: Object.assign(Object.assign({}, (row.payload || {})), { companyID: companyId }) });
        return;
    }
    const companyMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)$/);
    if (companyMatch) {
        const companyId = decodeURIComponent(companyMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            const row = await getSingleRow("companies", { id: companyId });
            send(200, { ok: true, company: row ? Object.assign(Object.assign({}, (row.payload || {})), { companyID: companyId }) : null });
            return;
        }
        if (method === "PATCH") {
            const existing = await getSingleRow("companies", { id: companyId });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const row = Object.assign(Object.assign({}, toCompanyPayload(companyId, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.updates) || {})), { updatedAt: Date.now() }), existing)), { created_by: existing.created_by || user.uid });
            await patchRow("companies", { id: companyId }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("companies", { id: companyId });
            send(200, { ok: true });
            return;
        }
    }
    const permissionsInitMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/permissions\/initialize$/);
    if (permissionsInitMatch && method === "POST") {
        const companyId = decodeURIComponent(permissionsInitMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        const current = await getPermissionPayload(companyId);
        const payload = current || cloneJson(DEFAULT_PERMISSIONS);
        await upsertPermissions(companyId, payload);
        send(200, { ok: true });
        return;
    }
    const permissionsMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/permissions$/);
    if (permissionsMatch) {
        const companyId = decodeURIComponent(permissionsMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            send(200, { ok: true, permissions: await getPermissionPayload(companyId) });
            return;
        }
        if (method === "PATCH") {
            const current = (await getPermissionPayload(companyId)) || cloneJson(DEFAULT_PERMISSIONS);
            const next = (body === null || body === void 0 ? void 0 : body.payload) !== undefined
                ? stripUndefinedDeep(body.payload)
                : setNestedValue(current, Array.isArray(body === null || body === void 0 ? void 0 : body.path) ? body.path.map(String) : [], body === null || body === void 0 ? void 0 : body.value);
            await upsertPermissions(companyId, next);
            send(200, { ok: true });
            return;
        }
    }
    const configInitMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/config\/initialize$/);
    if (configInitMatch && method === "POST") {
        const companyId = decodeURIComponent(configInitMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        const current = await getConfigPayload(companyId, "company");
        await upsertConfig(companyId, "company", null, null, current !== null && current !== void 0 ? current : cloneJson(DEFAULT_CONFIG));
        send(200, { ok: true });
        return;
    }
    const configMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/config$/);
    if (configMatch) {
        const companyId = decodeURIComponent(configMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            send(200, { ok: true, config: await getConfigPayload(companyId, "company") });
            return;
        }
        if (method === "PATCH") {
            const scopeType = (body === null || body === void 0 ? void 0 : body.scopeType) === "site" || (body === null || body === void 0 ? void 0 : body.scopeType) === "subsite" ? body.scopeType : "company";
            const siteId = (body === null || body === void 0 ? void 0 : body.siteId) ? String(body.siteId) : null;
            const subsiteId = (body === null || body === void 0 ? void 0 : body.subsiteId) ? String(body.subsiteId) : null;
            await upsertConfig(companyId, scopeType, siteId, subsiteId, (body === null || body === void 0 ? void 0 : body.config) || []);
            send(200, { ok: true });
            return;
        }
    }
    const sitesMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites$/);
    if (sitesMatch) {
        const companyId = decodeURIComponent(sitesMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            send(200, { ok: true, rows: await listCompanySites(companyId) });
            return;
        }
        if (method === "POST") {
            const siteId = String(((_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.siteID) || (0, crypto_1.randomUUID)());
            const existing = await getSingleRow("company_sites", { id: siteId });
            const row = toSitePayload(companyId, siteId, (body === null || body === void 0 ? void 0 : body.data) || {}, existing);
            if (!existing) {
                await insertRow("company_sites", row);
            }
            else {
                await patchRow("company_sites", { id: siteId }, row);
            }
            send(200, { ok: true, id: siteId, row: Object.assign(Object.assign({}, (row.payload || {})), { siteID: siteId, companyID: companyId }) });
            return;
        }
    }
    const siteMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)$/);
    if (siteMatch) {
        const companyId = decodeURIComponent(siteMatch[1]);
        const siteId = decodeURIComponent(siteMatch[2]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "PATCH") {
            const existing = await getSingleRow("company_sites", { id: siteId, company_id: companyId });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const row = toSitePayload(companyId, siteId, (body === null || body === void 0 ? void 0 : body.updates) || {}, existing);
            await patchRow("company_sites", { id: siteId, company_id: companyId }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("company_sites", { id: siteId, company_id: companyId });
            send(200, { ok: true });
            return;
        }
    }
    const subsitesMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)\/subsites$/);
    if (subsitesMatch) {
        const companyId = decodeURIComponent(subsitesMatch[1]);
        const siteId = decodeURIComponent(subsitesMatch[2]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "POST") {
            const subsiteId = String(((_c = body === null || body === void 0 ? void 0 : body.data) === null || _c === void 0 ? void 0 : _c.subsiteID) || (0, crypto_1.randomUUID)());
            const existing = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId });
            const row = toSubsitePayload(companyId, siteId, subsiteId, (body === null || body === void 0 ? void 0 : body.data) || {}, existing);
            if (!existing) {
                await insertRow("company_subsites", row);
            }
            else {
                await patchRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId }, row);
            }
            send(200, { ok: true, id: subsiteId, row: Object.assign(Object.assign({}, (row.payload || {})), { subsiteID: subsiteId }) });
            return;
        }
    }
    const subsiteMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/sites\/([^/]+)\/subsites\/([^/]+)$/);
    if (subsiteMatch) {
        const companyId = decodeURIComponent(subsiteMatch[1]);
        const siteId = decodeURIComponent(subsiteMatch[2]);
        const subsiteId = decodeURIComponent(subsiteMatch[3]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            const row = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId });
            send(200, { ok: true, subsite: row ? Object.assign(Object.assign({}, (row.payload || {})), { subsiteID: subsiteId }) : null });
            return;
        }
        if (method === "PATCH") {
            const existing = await getSingleRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const row = toSubsitePayload(companyId, siteId, subsiteId, (body === null || body === void 0 ? void 0 : body.updates) || {}, existing);
            await patchRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("company_subsites", { id: subsiteId, company_id: companyId, site_id: siteId });
            send(200, { ok: true });
            return;
        }
    }
    const setupMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/setup$/);
    if (setupMatch) {
        const companyId = decodeURIComponent(setupMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        if (method === "GET") {
            const setupRow = await getSingleRow("company_setups", { id: companyId });
            if (setupRow === null || setupRow === void 0 ? void 0 : setupRow.payload) {
                send(200, { ok: true, setup: Object.assign(Object.assign({}, (setupRow.payload || {})), { id: companyId }) });
                return;
            }
            const companyRow = await getSingleRow("companies", { id: companyId });
            send(200, {
                ok: true,
                setup: (companyRow === null || companyRow === void 0 ? void 0 : companyRow.payload) ? buildSetupFallback(companyId, companyRow.payload) : null,
            });
            return;
        }
        if (method === "PUT") {
            const existing = await getSingleRow("company_setups", { id: companyId });
            const payload = stripUndefinedDeep(Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), ((body === null || body === void 0 ? void 0 : body.setup) || {})), { id: companyId, createdAt: (_g = (_e = (_d = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _d === void 0 ? void 0 : _d.createdAt) !== null && _e !== void 0 ? _e : (_f = body === null || body === void 0 ? void 0 : body.setup) === null || _f === void 0 ? void 0 : _f.createdAt) !== null && _g !== void 0 ? _g : Date.now(), updatedAt: Date.now() }));
            const row = {
                id: companyId,
                company_id: companyId,
                payload,
                created_at: (_h = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _h !== void 0 ? _h : toMillis(payload.createdAt),
                updated_at: Date.now(),
            };
            if (!existing) {
                await insertRow("company_setups", row);
            }
            else {
                await patchRow("company_setups", { id: companyId }, row);
            }
            send(200, { ok: true });
            return;
        }
    }
    const companyUsersMatch = pathname.match(/^\/data\/company\/companies\/([^/]+)\/users$/);
    if (companyUsersMatch && method === "GET") {
        const companyId = decodeURIComponent(companyUsersMatch[1]);
        await assertCompanyAccess(user.uid, companyId, { allowCreator: true });
        const usersSnap = await admin_1.db.ref("users").get();
        const usersData = (usersSnap.val() || {});
        const companyUsers = [];
        for (const [userId, userData] of Object.entries(usersData)) {
            if ((userData === null || userData === void 0 ? void 0 : userData.companies) && userData.companies[companyId]) {
                companyUsers.push(Object.assign(Object.assign({ uid: userId }, userData), { companyRole: (_j = userData.companies[companyId]) === null || _j === void 0 ? void 0 : _j.role, companyDepartment: (_k = userData.companies[companyId]) === null || _k === void 0 ? void 0 : _k.department }));
            }
        }
        send(200, { ok: true, rows: companyUsers });
        return;
    }
    const userCompaniesMatch = pathname.match(/^\/data\/company\/users\/([^/]+)\/companies$/);
    if (userCompaniesMatch && method === "GET") {
        const uid = decodeURIComponent(userCompaniesMatch[1]);
        assertSelfAccess(user.uid, uid);
        const snapshot = await admin_1.db.ref(`users/${uid}/companies`).get();
        if (!snapshot.exists()) {
            send(200, { ok: true, rows: [] });
            return;
        }
        const companiesData = snapshot.val() || {};
        const companyIds = Object.keys(companiesData);
        const rows = await Promise.all(companyIds.map(async (companyId) => {
            var _a, _b, _c;
            const companyRow = await getSingleRow("companies", { id: companyId });
            if (companyRow === null || companyRow === void 0 ? void 0 : companyRow.payload) {
                return {
                    companyID: companyId,
                    companyName: ((_a = companyRow.payload) === null || _a === void 0 ? void 0 : _a.companyName) || "Unknown Company",
                    userPermission: ((_b = companiesData[companyId]) === null || _b === void 0 ? void 0 : _b.role) || "N/A",
                };
            }
            const companySnap = await admin_1.db.ref(`companies/${companyId}`).get();
            if (!companySnap.exists())
                return null;
            const companyData = companySnap.val() || {};
            return {
                companyID: companyId,
                companyName: companyData.companyName || "Unknown Company",
                userPermission: ((_c = companiesData[companyId]) === null || _c === void 0 ? void 0 : _c.role) || "N/A",
            };
        }));
        send(200, { ok: true, rows: rows.filter(Boolean) });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleCompanyDataRequest = handleCompanyDataRequest;
//# sourceMappingURL=dataCompany.js.map