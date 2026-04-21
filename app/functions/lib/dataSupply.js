"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSupplyDataRequest = void 0;
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
const normalizeSupplyPath = (raw) => String(raw || "").trim().replace(/\/+$/, "");
const parseSupplyScope = (rawSupplyPath) => {
    const supplyPath = normalizeSupplyPath(rawSupplyPath);
    const match = supplyPath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/supply$/i);
    if (!match) {
        throw Object.assign(new Error("Invalid supplyPath"), { status: 400 });
    }
    return {
        companyId: match[1],
        siteId: match[2] || null,
        subsiteId: match[3] || null,
        supplyPath,
    };
};
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Supply provider"), { status: 500 });
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
const createEntityRow = (scope, id, payload) => {
    var _a;
    const cleaned = stripUndefinedDeep(payload);
    return {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        supply_path: scope.supplyPath,
        name: String((cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.clientName) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.orderNumber) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.deliveryNumber) || id),
        status: (_a = cleaned === null || cleaned === void 0 ? void 0 : cleaned.status) !== null && _a !== void 0 ? _a : null,
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: Number((cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) || Date.now()),
        updated_at: Number((cleaned === null || cleaned === void 0 ? void 0 : cleaned.updatedAt) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) || Date.now()),
    };
};
const listRows = async (table, supplyPath) => {
    const params = new URLSearchParams();
    params.set("supply_path", `eq.${supplyPath}`);
    params.set("select", "id,payload,created_at,updated_at");
    params.set("order", "created_at.asc");
    const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" }));
    return (rows || []).map((row) => (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { id: row === null || row === void 0 ? void 0 : row.id })));
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
const insertRow = async (table, row) => {
    const rows = (await supabaseRequest(`${table}`, {
        method: "POST",
        headers: {
            Prefer: "return=representation",
        },
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
        headers: {
            Prefer: "return=representation",
        },
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
        headers: {
            Prefer: "return=minimal",
        },
    });
};
const upsertEntity = async (table, scope, id, payload) => {
    var _a;
    const existing = await getSingleRow(table, { id, supply_path: scope.supplyPath });
    const mergedPayload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), stripUndefinedDeep(payload)), { id, createdAt: Number(((_a = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _a === void 0 ? void 0 : _a.createdAt) || (payload === null || payload === void 0 ? void 0 : payload.createdAt) || Date.now()), updatedAt: Date.now() });
    const row = createEntityRow(scope, id, mergedPayload);
    if (!existing) {
        await insertRow(table, row);
    }
    else {
        await patchRow(table, { id, supply_path: scope.supplyPath }, row);
    }
    return id;
};
const upsertInvite = async (scope, invite) => {
    const id = String((invite === null || invite === void 0 ? void 0 : invite.code) || (invite === null || invite === void 0 ? void 0 : invite.id) || "").trim();
    if (!id)
        throw Object.assign(new Error("Invite code is required"), { status: 400 });
    const payload = Object.assign(Object.assign({}, stripUndefinedDeep(invite)), { id, code: id, supplierCompanyId: (invite === null || invite === void 0 ? void 0 : invite.supplierCompanyId) || scope.companyId, supplierSupplyPath: (invite === null || invite === void 0 ? void 0 : invite.supplierSupplyPath) || scope.supplyPath, createdAt: Number((invite === null || invite === void 0 ? void 0 : invite.createdAt) || Date.now()), updatedAt: Date.now() });
    const existing = await getSingleRow("supply_client_invites", { id });
    const row = {
        id,
        code: id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        supply_path: scope.supplyPath,
        status: payload.status || "pending",
        expires_at: Number(payload.expiresAt || 0),
        payload,
        created_at: Number((existing === null || existing === void 0 ? void 0 : existing.created_at) || payload.createdAt || Date.now()),
        updated_at: Date.now(),
    };
    if (!existing) {
        await insertRow("supply_client_invites", row);
    }
    else {
        await patchRow("supply_client_invites", { id }, row);
    }
    return id;
};
const handleSupplyDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    if (method === "GET" && pathname === "/data/supply/clients") {
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        send(200, { ok: true, rows: await listRows("supply_clients", scope.supplyPath) });
        return;
    }
    if (method === "GET" && pathname === "/data/supply/orders") {
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        send(200, { ok: true, rows: await listRows("supply_orders", scope.supplyPath) });
        return;
    }
    if (method === "GET" && pathname === "/data/supply/deliveries") {
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        send(200, { ok: true, rows: await listRows("supply_deliveries", scope.supplyPath) });
        return;
    }
    if (method === "POST" && pathname === "/data/supply/clients") {
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = String(((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.id) || (0, crypto_1.randomUUID)());
        await upsertEntity("supply_clients", scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        send(200, { ok: true, id });
        return;
    }
    if (method === "POST" && pathname === "/data/supply/orders") {
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = String(((_b = body === null || body === void 0 ? void 0 : body.data) === null || _b === void 0 ? void 0 : _b.id) || (0, crypto_1.randomUUID)());
        await upsertEntity("supply_orders", scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        send(200, { ok: true, id });
        return;
    }
    if (method === "POST" && pathname === "/data/supply/deliveries") {
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = String(((_c = body === null || body === void 0 ? void 0 : body.data) === null || _c === void 0 ? void 0 : _c.id) || (0, crypto_1.randomUUID)());
        await upsertEntity("supply_deliveries", scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        send(200, { ok: true, id });
        return;
    }
    const entityMatch = pathname.match(/^\/data\/supply\/(clients|orders|deliveries)\/([^/]+)$/);
    if (entityMatch && method === "PATCH") {
        const entity = entityMatch[1];
        const id = decodeURIComponent(entityMatch[2]);
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const table = entity === "clients" ? "supply_clients" : entity === "orders" ? "supply_orders" : "supply_deliveries";
        await upsertEntity(table, scope, id, (body === null || body === void 0 ? void 0 : body.updates) || {});
        send(200, { ok: true });
        return;
    }
    if (entityMatch && method === "DELETE") {
        const entity = entityMatch[1];
        const id = decodeURIComponent(entityMatch[2]);
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const table = entity === "clients" ? "supply_clients" : entity === "orders" ? "supply_orders" : "supply_deliveries";
        await deleteRow(table, { id, supply_path: scope.supplyPath });
        send(200, { ok: true });
        return;
    }
    if (method === "POST" && pathname === "/data/supply/clientInvites") {
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = await upsertInvite(scope, (body === null || body === void 0 ? void 0 : body.invite) || {});
        send(200, { ok: true, id });
        return;
    }
    const inviteMatch = pathname.match(/^\/data\/supply\/clientInvites\/([^/]+)$/);
    if (inviteMatch && method === "GET") {
        const code = decodeURIComponent(inviteMatch[1]);
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const row = await getSingleRow("supply_client_invites", { id: code, supply_path: scope.supplyPath });
        send(200, { ok: true, row: (row === null || row === void 0 ? void 0 : row.payload) || null });
        return;
    }
    if (inviteMatch && method === "PATCH") {
        const code = decodeURIComponent(inviteMatch[1]);
        const scope = parseSupplyScope(String((body === null || body === void 0 ? void 0 : body.supplyPath) || ""));
        const existing = await getSingleRow("supply_client_invites", { id: code });
        if (!existing)
            throw Object.assign(new Error("Invite not found"), { status: 404 });
        const acceptedByCompanyId = String(((_d = body === null || body === void 0 ? void 0 : body.updates) === null || _d === void 0 ? void 0 : _d.acceptedByCompanyId) || "").trim();
        if (acceptedByCompanyId) {
            await assertCompanyAccess(user.uid, acceptedByCompanyId);
        }
        else {
            await assertCompanyAccess(user.uid, scope.companyId);
        }
        await upsertInvite(scope, Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id: code, code }));
        send(200, { ok: true });
        return;
    }
    if (inviteMatch && method === "DELETE") {
        const code = decodeURIComponent(inviteMatch[1]);
        const scope = parseSupplyScope(getQuery("supplyPath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const existing = await getSingleRow("supply_client_invites", { id: code });
        if (!existing)
            throw Object.assign(new Error("Invite not found"), { status: 404 });
        await upsertInvite(scope, Object.assign(Object.assign({}, (existing.payload || {})), { id: code, code, status: "cancelled" }));
        send(200, { ok: true });
        return;
    }
    const globalInviteMatch = pathname.match(/^\/data\/supply\/globalInvites\/([^/]+)$/);
    if (globalInviteMatch && method === "GET") {
        const code = decodeURIComponent(globalInviteMatch[1]);
        const row = await getSingleRow("supply_client_invites", { id: code });
        send(200, { ok: true, row: (row === null || row === void 0 ? void 0 : row.payload) || null });
        return;
    }
    if (globalInviteMatch && method === "PATCH") {
        const code = decodeURIComponent(globalInviteMatch[1]);
        const existing = await getSingleRow("supply_client_invites", { id: code });
        if (!existing)
            throw Object.assign(new Error("Invite not found"), { status: 404 });
        const acceptedByCompanyId = String(((_e = body === null || body === void 0 ? void 0 : body.updates) === null || _e === void 0 ? void 0 : _e.acceptedByCompanyId) || ((_f = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _f === void 0 ? void 0 : _f.acceptedByCompanyId) || "").trim();
        if (acceptedByCompanyId) {
            await assertCompanyAccess(user.uid, acceptedByCompanyId);
        }
        const scope = parseSupplyScope(String(existing.supply_path));
        await upsertInvite(scope, Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id: code, code }));
        send(200, { ok: true });
        return;
    }
    if (method === "GET" && pathname === "/data/supply/supplierConnection") {
        const customerCompanyId = getQuery("customerCompanyId");
        const supplierCompanyId = getQuery("supplierCompanyId");
        if (!customerCompanyId || !supplierCompanyId) {
            throw Object.assign(new Error("Missing customerCompanyId or supplierCompanyId"), { status: 400 });
        }
        await assertCompanyAccess(user.uid, customerCompanyId);
        const row = await getSingleRow("supply_supplier_connections", {
            customer_company_id: customerCompanyId,
            supplier_company_id: supplierCompanyId,
        });
        send(200, { ok: true, row: (row === null || row === void 0 ? void 0 : row.payload) || null });
        return;
    }
    if (method === "POST" && pathname === "/data/supply/supplierConnection") {
        const params = (body === null || body === void 0 ? void 0 : body.params) || {};
        const customerCompanyId = String((params === null || params === void 0 ? void 0 : params.customerCompanyId) || "").trim();
        const supplierCompanyId = String((params === null || params === void 0 ? void 0 : params.supplierCompanyId) || "").trim();
        if (!customerCompanyId || !supplierCompanyId) {
            throw Object.assign(new Error("Missing customerCompanyId or supplierCompanyId"), { status: 400 });
        }
        await assertCompanyAccess(user.uid, customerCompanyId);
        const existing = await getSingleRow("supply_supplier_connections", {
            customer_company_id: customerCompanyId,
            supplier_company_id: supplierCompanyId,
        });
        const payload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), stripUndefinedDeep(params)), { updatedAt: Date.now(), linkedAt: Number(((_g = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _g === void 0 ? void 0 : _g.linkedAt) || Date.now()) });
        const row = {
            id: `${customerCompanyId}__${supplierCompanyId}`,
            customer_company_id: customerCompanyId,
            supplier_company_id: supplierCompanyId,
            payload,
            linked_at: payload.linkedAt,
            updated_at: payload.updatedAt,
        };
        if (!existing) {
            await insertRow("supply_supplier_connections", row);
        }
        else {
            await patchRow("supply_supplier_connections", { customer_company_id: customerCompanyId, supplier_company_id: supplierCompanyId }, row);
        }
        send(200, { ok: true });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleSupplyDataRequest = handleSupplyDataRequest;
//# sourceMappingURL=dataSupply.js.map