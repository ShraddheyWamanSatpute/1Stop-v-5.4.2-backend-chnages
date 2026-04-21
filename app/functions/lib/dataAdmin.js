"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAdminDataRequest = void 0;
const crypto_1 = require("crypto");
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
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Admin provider"), { status: 500 });
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
const listRows = async (table, filters, order = "created_at.asc") => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", order);
    for (const [key, value] of Object.entries(filters || {})) {
        if (value === undefined || value === null || value === "")
            continue;
        params.set(key, `eq.${value}`);
    }
    return (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" })) || [];
};
const getSingleRow = async (table, filters) => {
    const rows = await listRows(table, filters);
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
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
const rowFromPayload = (tablePrefix, id, payload, opts) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const createdAt = (_a = opts === null || opts === void 0 ? void 0 : opts.createdAt) !== null && _a !== void 0 ? _a : Number((payload === null || payload === void 0 ? void 0 : payload.timestamp) || (payload === null || payload === void 0 ? void 0 : payload.createdAt) || Date.now());
    const updatedAt = (_b = opts === null || opts === void 0 ? void 0 : opts.updatedAt) !== null && _b !== void 0 ? _b : Date.now();
    const cleaned = stripUndefinedDeep(payload);
    return {
        id,
        owner_uid: (_e = (_d = (_c = opts === null || opts === void 0 ? void 0 : opts.ownerUid) !== null && _c !== void 0 ? _c : cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdBy) !== null && _d !== void 0 ? _d : cleaned === null || cleaned === void 0 ? void 0 : cleaned.adminId) !== null && _e !== void 0 ? _e : null,
        admin_id: (_h = (_g = (_f = opts === null || opts === void 0 ? void 0 : opts.adminId) !== null && _f !== void 0 ? _f : cleaned === null || cleaned === void 0 ? void 0 : cleaned.adminId) !== null && _g !== void 0 ? _g : cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdBy) !== null && _h !== void 0 ? _h : null,
        name: String((opts === null || opts === void 0 ? void 0 : opts.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.title) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.platform) || id),
        path_key: (opts === null || opts === void 0 ? void 0 : opts.pathKey) || null,
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: createdAt,
        updated_at: updatedAt,
        table_prefix: tablePrefix,
    };
};
const requireSelfOrAdmin = (user, targetUid) => {
    if (user.isAdmin)
        return;
    if (user.uid === targetUid)
        return;
    throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const randomSeries = (days, min, spread) => Array.from({ length: days }, (_, index) => min + Math.floor((((index * 37) % 100) / 100) * spread));
const handleAdminDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    if (pathname === "/data/admin/profile" && method === "GET") {
        const uid = getQuery("uid");
        if (!uid)
            throw Object.assign(new Error("Missing uid"), { status: 400 });
        requireSelfOrAdmin(user, uid);
        const row = await getSingleRow("admin_profiles", { id: uid });
        send(200, { ok: true, row: row ? Object.assign(Object.assign({}, (row.payload || {})), { uid }) : null });
        return;
    }
    const profileMatch = pathname.match(/^\/data\/admin\/profile\/([^/]+)$/);
    if (profileMatch) {
        const uid = decodeURIComponent(profileMatch[1]);
        requireSelfOrAdmin(user, uid);
        if (method === "PUT") {
            const existing = await getSingleRow("admin_profiles", { id: uid });
            const payload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), ((body === null || body === void 0 ? void 0 : body.profile) || {})), { uid, updatedAt: Date.now(), createdAt: ((_a = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _a === void 0 ? void 0 : _a.createdAt) || ((_b = body === null || body === void 0 ? void 0 : body.profile) === null || _b === void 0 ? void 0 : _b.createdAt) || Date.now() });
            const row = rowFromPayload("profile", uid, payload, { ownerUid: uid, adminId: uid, name: payload.name || payload.email || uid });
            if (!existing)
                await insertRow("admin_profiles", row);
            else
                await patchRow("admin_profiles", { id: uid }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "PATCH") {
            const existing = await getSingleRow("admin_profiles", { id: uid });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const payload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { uid, updatedAt: Date.now() });
            const row = rowFromPayload("profile", uid, payload, { ownerUid: uid, adminId: uid, name: payload.name || payload.email || uid, createdAt: existing.created_at });
            await patchRow("admin_profiles", { id: uid }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("admin_profiles", { id: uid });
            send(200, { ok: true });
            return;
        }
    }
    const postsMatch = pathname.match(/^\/data\/admin\/content\/posts$/);
    if (postsMatch) {
        if (method === "GET") {
            const adminId = getQuery("adminId");
            const rows = await listRows("admin_content_posts", Object.assign({}, (adminId ? { owner_uid: adminId } : {})));
            send(200, { ok: true, rows: rows.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id }))) });
            return;
        }
        if (method === "POST") {
            const id = String(((_c = body === null || body === void 0 ? void 0 : body.data) === null || _c === void 0 ? void 0 : _c.id) || (0, crypto_1.randomUUID)());
            const row = rowFromPayload("content_post", id, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { id, timestamp: ((_d = body === null || body === void 0 ? void 0 : body.data) === null || _d === void 0 ? void 0 : _d.timestamp) || Date.now() }), {
                ownerUid: ((_e = body === null || body === void 0 ? void 0 : body.data) === null || _e === void 0 ? void 0 : _e.createdBy) || user.uid,
                adminId: ((_f = body === null || body === void 0 ? void 0 : body.data) === null || _f === void 0 ? void 0 : _f.createdBy) || user.uid,
                name: ((_g = body === null || body === void 0 ? void 0 : body.data) === null || _g === void 0 ? void 0 : _g.platform) || id,
            });
            await insertRow("admin_content_posts", row);
            send(200, { ok: true, id });
            return;
        }
    }
    const postMatch = pathname.match(/^\/data\/admin\/content\/posts\/([^/]+)$/);
    if (postMatch) {
        const id = decodeURIComponent(postMatch[1]);
        if (method === "PATCH") {
            const existing = await getSingleRow("admin_content_posts", { id });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const payload = Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id });
            const row = rowFromPayload("content_post", id, payload, {
                ownerUid: existing.owner_uid,
                adminId: existing.admin_id,
                name: payload.platform || existing.name || id,
                createdAt: existing.created_at,
            });
            await patchRow("admin_content_posts", { id }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("admin_content_posts", { id });
            send(200, { ok: true });
            return;
        }
    }
    const platformsMatch = pathname.match(/^\/data\/admin\/content\/platforms$/);
    if (platformsMatch) {
        if (method === "GET") {
            const rows = await listRows("admin_content_platforms");
            send(200, { ok: true, rows: rows.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id }))) });
            return;
        }
        if (method === "POST") {
            const id = String(((_h = body === null || body === void 0 ? void 0 : body.data) === null || _h === void 0 ? void 0 : _h.id) || (0, crypto_1.randomUUID)());
            const row = rowFromPayload("content_platform", id, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { id, timestamp: ((_j = body === null || body === void 0 ? void 0 : body.data) === null || _j === void 0 ? void 0 : _j.timestamp) || Date.now() }), {
                ownerUid: user.uid,
                adminId: user.uid,
                name: ((_k = body === null || body === void 0 ? void 0 : body.data) === null || _k === void 0 ? void 0 : _k.platform) || id,
            });
            await insertRow("admin_content_platforms", row);
            send(200, { ok: true, id });
            return;
        }
    }
    const platformMatch = pathname.match(/^\/data\/admin\/content\/platforms\/([^/]+)$/);
    if (platformMatch && method === "PATCH") {
        const id = decodeURIComponent(platformMatch[1]);
        const existing = await getSingleRow("admin_content_platforms", { id });
        if (!existing)
            throw Object.assign(new Error("Not found"), { status: 404 });
        const payload = Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id });
        const row = rowFromPayload("content_platform", id, payload, {
            ownerUid: existing.owner_uid,
            adminId: existing.admin_id,
            name: payload.platform || existing.name || id,
            createdAt: existing.created_at,
        });
        await patchRow("admin_content_platforms", { id }, row);
        send(200, { ok: true });
        return;
    }
    const marketingMatch = pathname.match(/^\/data\/admin\/marketing\/events$/);
    if (marketingMatch) {
        if (method === "GET") {
            const adminId = getQuery("adminId");
            const rows = await listRows("admin_marketing_events", Object.assign({}, (adminId ? { owner_uid: adminId } : {})));
            send(200, { ok: true, rows: rows.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id }))) });
            return;
        }
        if (method === "POST") {
            const id = String(((_l = body === null || body === void 0 ? void 0 : body.data) === null || _l === void 0 ? void 0 : _l.id) || (0, crypto_1.randomUUID)());
            const row = rowFromPayload("marketing_event", id, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { id, timestamp: ((_m = body === null || body === void 0 ? void 0 : body.data) === null || _m === void 0 ? void 0 : _m.timestamp) || Date.now() }), {
                ownerUid: ((_o = body === null || body === void 0 ? void 0 : body.data) === null || _o === void 0 ? void 0 : _o.createdBy) || user.uid,
                adminId: ((_p = body === null || body === void 0 ? void 0 : body.data) === null || _p === void 0 ? void 0 : _p.createdBy) || user.uid,
                name: ((_q = body === null || body === void 0 ? void 0 : body.data) === null || _q === void 0 ? void 0 : _q.name) || id,
            });
            await insertRow("admin_marketing_events", row);
            send(200, { ok: true, id });
            return;
        }
    }
    const marketingItemMatch = pathname.match(/^\/data\/admin\/marketing\/events\/([^/]+)$/);
    if (marketingItemMatch) {
        const id = decodeURIComponent(marketingItemMatch[1]);
        if (method === "PATCH") {
            const existing = await getSingleRow("admin_marketing_events", { id });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const payload = Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id });
            const row = rowFromPayload("marketing_event", id, payload, {
                ownerUid: existing.owner_uid,
                adminId: existing.admin_id,
                name: payload.name || existing.name || id,
                createdAt: existing.created_at,
            });
            await patchRow("admin_marketing_events", { id }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("admin_marketing_events", { id });
            send(200, { ok: true });
            return;
        }
    }
    const notesMatch = pathname.match(/^\/data\/admin\/notes$/);
    if (notesMatch) {
        if (method === "GET") {
            const adminId = getQuery("adminId");
            const rows = await listRows("admin_notes", Object.assign({}, (adminId ? { owner_uid: adminId } : {})));
            send(200, { ok: true, rows: rows.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id }))) });
            return;
        }
        if (method === "POST") {
            const id = String(((_r = body === null || body === void 0 ? void 0 : body.data) === null || _r === void 0 ? void 0 : _r.id) || (0, crypto_1.randomUUID)());
            const row = rowFromPayload("note", id, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { id, timestamp: ((_s = body === null || body === void 0 ? void 0 : body.data) === null || _s === void 0 ? void 0 : _s.timestamp) || Date.now() }), {
                ownerUid: ((_t = body === null || body === void 0 ? void 0 : body.data) === null || _t === void 0 ? void 0 : _t.createdBy) || user.uid,
                adminId: ((_u = body === null || body === void 0 ? void 0 : body.data) === null || _u === void 0 ? void 0 : _u.createdBy) || user.uid,
                name: ((_v = body === null || body === void 0 ? void 0 : body.data) === null || _v === void 0 ? void 0 : _v.title) || id,
            });
            await insertRow("admin_notes", row);
            send(200, { ok: true, id });
            return;
        }
    }
    const noteMatch = pathname.match(/^\/data\/admin\/notes\/([^/]+)$/);
    if (noteMatch) {
        const id = decodeURIComponent(noteMatch[1]);
        if (method === "PATCH") {
            const existing = await getSingleRow("admin_notes", { id });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const payload = Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id });
            const row = rowFromPayload("note", id, payload, {
                ownerUid: existing.owner_uid,
                adminId: existing.admin_id,
                name: payload.title || existing.name || id,
                createdAt: existing.created_at,
            });
            await patchRow("admin_notes", { id }, row);
            send(200, { ok: true });
            return;
        }
        if (method === "DELETE") {
            await deleteRow("admin_notes", { id });
            send(200, { ok: true });
            return;
        }
    }
    const qrEntityMap = {
        personal: "admin_qr_personal",
        generic: "admin_qr_generic",
        leads: "admin_qr_leads",
    };
    const qrListMatch = pathname.match(/^\/data\/admin\/qr\/(personal|generic|leads)$/);
    if (qrListMatch) {
        const entity = qrListMatch[1];
        const table = qrEntityMap[entity];
        if (method === "GET") {
            const adminId = getQuery("adminId");
            const rows = await listRows(table, Object.assign({}, (adminId ? { admin_id: adminId } : {})));
            send(200, { ok: true, rows: rows.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id }))) });
            return;
        }
        if (method === "POST") {
            const id = String(((_w = body === null || body === void 0 ? void 0 : body.data) === null || _w === void 0 ? void 0 : _w.id) || (0, crypto_1.randomUUID)());
            const ownerUid = ((_x = body === null || body === void 0 ? void 0 : body.data) === null || _x === void 0 ? void 0 : _x.adminId) || ((_y = body === null || body === void 0 ? void 0 : body.data) === null || _y === void 0 ? void 0 : _y.assignedTo) || user.uid;
            const row = rowFromPayload(`qr_${entity}`, id, Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { id, timestamp: ((_z = body === null || body === void 0 ? void 0 : body.data) === null || _z === void 0 ? void 0 : _z.timestamp) || Date.now() }), {
                ownerUid,
                adminId: ((_0 = body === null || body === void 0 ? void 0 : body.data) === null || _0 === void 0 ? void 0 : _0.adminId) || ownerUid,
                name: ((_1 = body === null || body === void 0 ? void 0 : body.data) === null || _1 === void 0 ? void 0 : _1.name) || ((_2 = body === null || body === void 0 ? void 0 : body.data) === null || _2 === void 0 ? void 0 : _2.email) || ((_3 = body === null || body === void 0 ? void 0 : body.data) === null || _3 === void 0 ? void 0 : _3.qrId) || id,
            });
            await insertRow(table, row);
            send(200, { ok: true, id });
            return;
        }
    }
    const qrItemMatch = pathname.match(/^\/data\/admin\/qr\/(personal|generic|leads)\/([^/]+)$/);
    if (qrItemMatch) {
        const entity = qrItemMatch[1];
        const id = decodeURIComponent(qrItemMatch[2]);
        const table = qrEntityMap[entity];
        if (method === "GET") {
            const row = await getSingleRow(table, { id });
            send(200, { ok: true, row: row ? Object.assign(Object.assign({}, (row.payload || {})), { id }) : null });
            return;
        }
        if (method === "PATCH") {
            const existing = await getSingleRow(table, { id });
            if (!existing)
                throw Object.assign(new Error("Not found"), { status: 404 });
            const payload = Object.assign(Object.assign(Object.assign({}, (existing.payload || {})), ((body === null || body === void 0 ? void 0 : body.updates) || {})), { id });
            const row = rowFromPayload(`qr_${entity}`, id, payload, {
                ownerUid: existing.owner_uid,
                adminId: existing.admin_id,
                name: payload.name || payload.email || payload.qrId || existing.name || id,
                createdAt: existing.created_at,
            });
            await patchRow(table, { id }, row);
            send(200, { ok: true });
            return;
        }
    }
    if (pathname === "/data/admin/settings" && method === "GET") {
        const row = await getSingleRow("admin_settings", { id: "global" });
        send(200, { ok: true, row: ((row === null || row === void 0 ? void 0 : row.payload) || null) });
        return;
    }
    if (pathname === "/data/admin/settings" && method === "PUT") {
        const existing = await getSingleRow("admin_settings", { id: "global" });
        const payload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), ((body === null || body === void 0 ? void 0 : body.settings) || {})), { updatedAt: Date.now() });
        const row = rowFromPayload("settings", "global", payload, {
            ownerUid: user.uid,
            adminId: user.uid,
            name: "global",
            createdAt: (existing === null || existing === void 0 ? void 0 : existing.created_at) || Date.now(),
        });
        if (!existing)
            await insertRow("admin_settings", row);
        else
            await patchRow("admin_settings", { id: "global" }, row);
        send(200, { ok: true });
        return;
    }
    if (pathname === "/data/admin/analytics" && method === "GET") {
        const [contentPosts, marketingEvents, leads] = await Promise.all([
            listRows("admin_content_posts"),
            listRows("admin_marketing_events"),
            listRows("admin_qr_leads"),
        ]);
        const posts = contentPosts.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id })));
        const events = marketingEvents.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id })));
        const leadRows = leads.map((row) => (Object.assign(Object.assign({}, (row.payload || {})), { id: row.id })));
        const publishedPosts = posts.filter((post) => post.status === "published");
        const totalImpressions = publishedPosts.reduce((sum, post) => sum + Number(post.impressions || 0), 0);
        const totalEngagements = publishedPosts.reduce((sum, post) => sum + Number(post.likes || 0) + Number(post.comments || 0) + Number(post.shares || 0), 0);
        const platformStats = {};
        for (const post of publishedPosts) {
            const platform = String(post.platform || "unknown");
            if (!platformStats[platform]) {
                platformStats[platform] = { posts: 0, impressions: 0, engagements: 0 };
            }
            platformStats[platform].posts += 1;
            platformStats[platform].impressions += Number(post.impressions || 0);
            platformStats[platform].engagements += Number(post.likes || 0) + Number(post.comments || 0) + Number(post.shares || 0);
        }
        const contentPerformance = Object.entries(platformStats).map(([platform, stats]) => ({
            platform,
            posts: stats.posts,
            impressions: stats.impressions,
            engagements: stats.engagements,
            engagementRate: stats.impressions > 0 ? stats.engagements / stats.impressions : 0,
        }));
        const totalSpent = events.reduce((sum, event) => sum + Number(event.spent || 0), 0);
        const leadsGenerated = leadRows.length;
        const revenue = leadRows.reduce((sum, lead) => sum + (lead.status === "won" ? 1000 : 0), 0);
        const trafficSeed = randomSeries(30, 120, 450);
        const analytics = {
            totalRevenue: revenue,
            totalLeads: leadsGenerated,
            conversionRate: leadsGenerated > 0 ? (leadRows.filter((lead) => lead.status === "won").length / leadsGenerated) * 100 : 0,
            activeCampaigns: events.filter((event) => event.status === "active").length,
            socialMediaStats: {
                totalPosts: publishedPosts.length,
                totalImpressions,
                totalEngagements,
                averageEngagementRate: totalImpressions > 0 ? totalEngagements / totalImpressions : 0,
                topPerformingPlatform: ((_4 = contentPerformance.sort((a, b) => b.engagements - a.engagements)[0]) === null || _4 === void 0 ? void 0 : _4.platform) || "instagram",
            },
            contentPerformance,
            salesData: randomSeries(6, 5000, 8000).map((sales, index) => ({
                month: new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1).toLocaleString("default", { month: "short" }),
                sales,
                leads: 20 + index * 5,
                conversion: 0.05 + index * 0.01,
            })),
            marketingData: [
                { name: "Google Ads", value: events.filter((event) => event.type === "google_ads").length, color: "#4285F4" },
                { name: "Instagram", value: events.filter((event) => event.type === "instagram_ads").length, color: "#E4405F" },
                { name: "Facebook", value: events.filter((event) => event.type === "facebook_ads").length, color: "#1877F2" },
                { name: "Email", value: events.filter((event) => event.type === "email_campaign").length, color: "#34A853" },
            ],
            trafficData: trafficSeed.map((visitors, index) => ({
                date: new Date(Date.now() - (29 - index) * 86400000).toISOString().split("T")[0],
                visitors,
                pageViews: visitors * 2,
                bounceRate: 0.2 + ((index % 10) / 50),
            })),
            socialROI: {
                totalSpent,
                leadsGenerated,
                costPerLead: leadsGenerated > 0 ? totalSpent / leadsGenerated : 0,
                revenue,
                roi: totalSpent > 0 ? ((revenue - totalSpent) / totalSpent) * 100 : 0,
            },
        };
        send(200, { ok: true, row: analytics });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleAdminDataRequest = handleAdminDataRequest;
//# sourceMappingURL=dataAdmin.js.map