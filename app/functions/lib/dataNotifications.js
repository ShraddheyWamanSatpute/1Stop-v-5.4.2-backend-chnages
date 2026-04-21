"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleNotificationsDataRequest = void 0;
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
const parseScope = (rawBasePath) => {
    const basePath = normalizeBasePath(rawBasePath);
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i);
    if (!match) {
        throw Object.assign(new Error("Invalid notifications basePath"), { status: 400 });
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
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Notifications provider"), { status: 500 });
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
const listRows = async (table, filters) => {
    const params = new URLSearchParams();
    params.set("select", "id,payload,created_at");
    for (const [key, value] of Object.entries(filters)) {
        params.set(key, `eq.${value}`);
    }
    const rows = (await supabaseRequest(`${table}?${params.toString()}`, { method: "GET" }));
    return rows || [];
};
const getSingleRow = async (table, filters) => {
    const rows = await listRows(table, filters);
    return rows[0] || null;
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
const normalizeNotification = (row) => {
    var _a;
    return (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { id: String((row === null || row === void 0 ? void 0 : row.id) || ((_a = row === null || row === void 0 ? void 0 : row.payload) === null || _a === void 0 ? void 0 : _a.id) || "") }));
};
const createNotificationRow = (scope, id, payload) => {
    const cleaned = stripUndefinedDeep(payload);
    const now = Date.now();
    return {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: String((cleaned === null || cleaned === void 0 ? void 0 : cleaned.title) || id),
        status: (cleaned === null || cleaned === void 0 ? void 0 : cleaned.read) ? "read" : "unread",
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: typeof (cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) === "number" ? cleaned.createdAt : now,
        updated_at: typeof (cleaned === null || cleaned === void 0 ? void 0 : cleaned.updatedAt) === "number" ? cleaned.updatedAt : now,
    };
};
const createSettingsRow = (scope, userId, payload) => {
    const cleaned = stripUndefinedDeep(payload);
    const now = Date.now();
    return {
        id: userId,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: userId,
        status: "active",
        payload: Object.assign(Object.assign({}, cleaned), { userId }),
        created_at: now,
        updated_at: now,
    };
};
const upsertNotification = async (scope, id, payload) => {
    const existing = await getSingleRow("app_notifications", { id, base_path: scope.basePath });
    const nextPayload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), payload), { id });
    const row = createNotificationRow(scope, id, nextPayload);
    if (!existing)
        await insertRow("app_notifications", row);
    else
        await patchRow("app_notifications", { id, base_path: scope.basePath }, row);
    return normalizeNotification(row);
};
const upsertSettings = async (scope, userId, payload) => {
    const existing = await getSingleRow("app_notification_settings", { id: userId, base_path: scope.basePath });
    const row = createSettingsRow(scope, userId, Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), payload), { userId }));
    if (!existing)
        await insertRow("app_notification_settings", row);
    else
        await patchRow("app_notification_settings", { id: userId, base_path: scope.basePath }, row);
    return row.payload;
};
const sortNotifications = (rows) => rows
    .map(normalizeNotification)
    .sort((a, b) => Number((b === null || b === void 0 ? void 0 : b.timestamp) || 0) - Number((a === null || a === void 0 ? void 0 : a.timestamp) || 0));
const matchesFilter = (notification, filter) => {
    var _a, _b, _c, _d;
    if (filter.userId && notification.userId !== filter.userId)
        return false;
    if (filter.companyId && notification.companyId !== filter.companyId)
        return false;
    if (filter.siteId && notification.siteId !== filter.siteId)
        return false;
    if (filter.subsiteId && notification.subsiteId !== filter.subsiteId)
        return false;
    if (((_a = filter.type) === null || _a === void 0 ? void 0 : _a.length) && !filter.type.includes(notification.type))
        return false;
    if (((_b = filter.action) === null || _b === void 0 ? void 0 : _b.length) && !filter.action.includes(notification.action))
        return false;
    if (((_c = filter.priority) === null || _c === void 0 ? void 0 : _c.length) && !filter.priority.includes(notification.priority))
        return false;
    if (((_d = filter.category) === null || _d === void 0 ? void 0 : _d.length) && !filter.category.includes(notification.category))
        return false;
    if (filter.read !== undefined && notification.read !== filter.read)
        return false;
    if (filter.dateFrom !== undefined && Number(notification.timestamp || 0) < filter.dateFrom)
        return false;
    if (filter.dateTo !== undefined && Number(notification.timestamp || 0) > filter.dateTo)
        return false;
    return true;
};
const listNotifications = async (basePath) => {
    const rows = await listRows("app_notifications", { base_path: basePath });
    return sortNotifications(rows);
};
const listUserNotifications = async (basePath, userId, limit) => {
    const rows = (await listNotifications(basePath)).filter((notification) => notification.userId === userId);
    return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows;
};
const handleNotificationsDataRequest = async ({ req, res, path, body, user }) => {
    var _a;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    if (pathname === "/data/notifications/notifications" && method === "GET") {
        const scope = parseScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const limit = Number.parseInt(getQuery("limit"), 10);
        const rows = await listUserNotifications(scope.basePath, getQuery("userId"), Number.isFinite(limit) ? limit : undefined);
        send(200, { ok: true, rows });
        return;
    }
    if (pathname === "/data/notifications/notifications/filter" && method === "POST") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const rows = (await listNotifications(scope.basePath)).filter((notification) => matchesFilter(notification, ((body === null || body === void 0 ? void 0 : body.filter) || {})));
        send(200, { ok: true, rows });
        return;
    }
    if (pathname === "/data/notifications/notifications" && method === "POST") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = String(((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.id) || (0, crypto_1.randomUUID)());
        const row = await upsertNotification(scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        send(200, { ok: true, id, row });
        return;
    }
    const notificationMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)$/);
    if (notificationMatch && method === "DELETE") {
        const scope = parseScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = decodeURIComponent(notificationMatch[1]);
        await deleteRow("app_notifications", { id, base_path: scope.basePath });
        send(200, { ok: true });
        return;
    }
    const readMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)\/read$/);
    if (readMatch && method === "PATCH") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = decodeURIComponent(readMatch[1]);
        const row = await upsertNotification(scope, id, { read: true, updatedAt: Date.now() });
        send(200, { ok: true, row });
        return;
    }
    const readByMatch = pathname.match(/^\/data\/notifications\/notifications\/([^/]+)\/readBy\/([^/]+)$/);
    if (readByMatch && method === "PATCH") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const notificationId = decodeURIComponent(readByMatch[1]);
        const targetUserId = decodeURIComponent(readByMatch[2]);
        const existing = await getSingleRow("app_notifications", { id: notificationId, base_path: scope.basePath });
        const now = Date.now();
        const readBy = Object.assign(Object.assign({}, (((existing === null || existing === void 0 ? void 0 : existing.payload) || {}).readBy || {})), { [targetUserId]: {
                readAt: now,
                seen: true,
            } });
        const row = await upsertNotification(scope, notificationId, { readBy, updatedAt: now });
        send(200, { ok: true, row });
        return;
    }
    if (pathname === "/data/notifications/notifications/readAll" && method === "PATCH") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const userId = String((body === null || body === void 0 ? void 0 : body.userId) || "").trim();
        const rows = await listUserNotifications(scope.basePath, userId);
        await Promise.all(rows
            .filter((notification) => !notification.read)
            .map((notification) => upsertNotification(scope, String(notification.id), { read: true, updatedAt: Date.now() })));
        send(200, { ok: true });
        return;
    }
    if (pathname === "/data/notifications/notifications" && method === "DELETE") {
        const scope = parseScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const userId = getQuery("userId");
        const rows = await listUserNotifications(scope.basePath, userId);
        await Promise.all(rows.map((notification) => deleteRow("app_notifications", { id: String(notification.id), base_path: scope.basePath })));
        send(200, { ok: true });
        return;
    }
    if (pathname === "/data/notifications/settings" && method === "GET") {
        const scope = parseScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const userId = getQuery("userId");
        const row = await getSingleRow("app_notification_settings", { id: userId, base_path: scope.basePath });
        send(200, { ok: true, row: (row === null || row === void 0 ? void 0 : row.payload) || null });
        return;
    }
    if (pathname === "/data/notifications/settings" && method === "PUT") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const settings = (body === null || body === void 0 ? void 0 : body.settings) || {};
        const row = await upsertSettings(scope, String((settings === null || settings === void 0 ? void 0 : settings.userId) || ""), settings);
        send(200, { ok: true, row });
        return;
    }
    if (pathname === "/data/notifications/unreadCount" && method === "GET") {
        const scope = parseScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const userId = getQuery("userId");
        const rows = await listNotifications(scope.basePath);
        const count = rows.reduce((sum, notification) => {
            var _a, _b;
            const seen = Boolean((_b = (_a = notification === null || notification === void 0 ? void 0 : notification.readBy) === null || _a === void 0 ? void 0 : _a[userId]) === null || _b === void 0 ? void 0 : _b.seen);
            return sum + (seen ? 0 : 1);
        }, 0);
        send(200, { ok: true, count });
        return;
    }
    if (pathname === "/data/notifications/history" && method === "POST") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const userId = String((body === null || body === void 0 ? void 0 : body.userId) || "").trim();
        const filter = ((body === null || body === void 0 ? void 0 : body.filter) || {});
        const rows = (await listNotifications(scope.basePath))
            .map((notification) => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({}, notification), { isReadByUser: Boolean((_b = (_a = notification === null || notification === void 0 ? void 0 : notification.readBy) === null || _a === void 0 ? void 0 : _a[userId]) === null || _b === void 0 ? void 0 : _b.seen), readAtByUser: (_e = (_d = (_c = notification === null || notification === void 0 ? void 0 : notification.readBy) === null || _c === void 0 ? void 0 : _c[userId]) === null || _d === void 0 ? void 0 : _d.readAt) !== null && _e !== void 0 ? _e : null }));
        })
            .filter((notification) => {
            var _a;
            if (filter.read !== undefined && notification.isReadByUser !== filter.read)
                return false;
            if (((_a = filter.type) === null || _a === void 0 ? void 0 : _a.length) && !filter.type.includes(notification.type))
                return false;
            if (filter.dateFrom !== undefined && Number(notification.timestamp || 0) < filter.dateFrom)
                return false;
            if (filter.dateTo !== undefined && Number(notification.timestamp || 0) > filter.dateTo)
                return false;
            return true;
        });
        send(200, { ok: true, rows });
        return;
    }
    if (pathname === "/data/notifications/cleanup" && method === "POST") {
        const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const daysOld = Number((body === null || body === void 0 ? void 0 : body.daysOld) || 30);
        const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
        const rows = await listNotifications(scope.basePath);
        await Promise.all(rows
            .filter((notification) => Number(notification.timestamp || 0) < cutoffTime)
            .map((notification) => deleteRow("app_notifications", { id: String(notification.id), base_path: scope.basePath })));
        send(200, { ok: true });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleNotificationsDataRequest = handleNotificationsDataRequest;
//# sourceMappingURL=dataNotifications.js.map