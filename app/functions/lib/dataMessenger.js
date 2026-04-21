"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessengerDataRequest = void 0;
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
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?$/i);
    if (!match)
        throw Object.assign(new Error("Invalid messenger basePath"), { status: 400 });
    return { companyId: match[1], siteId: match[2] || null, subsiteId: match[3] || null, basePath };
};
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Messenger provider"), {
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
const listRows = async (filters, order = "created_at.asc") => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", order);
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "")
            continue;
        params.set(key, `eq.${value}`);
    }
    return (await supabaseRequest(`app_messenger_entities?${params.toString()}`, { method: "GET" })) || [];
};
const getRow = async (filters) => {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("limit", "1");
    for (const [key, value] of Object.entries(filters)) {
        params.set(key, `eq.${value}`);
    }
    const rows = (await supabaseRequest(`app_messenger_entities?${params.toString()}`, { method: "GET" }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const insertRow = async (row) => {
    const rows = (await supabaseRequest("app_messenger_entities", {
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
    const rows = (await supabaseRequest(`app_messenger_entities?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(stripUndefinedDeep(patch)),
    }));
    return (rows === null || rows === void 0 ? void 0 : rows[0]) || null;
};
const deleteRow = async (rowId) => {
    const params = new URLSearchParams();
    params.set("row_id", `eq.${rowId}`);
    await supabaseRequest(`app_messenger_entities?${params.toString()}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
    });
};
const rowIdFor = (entityType, entityId, basePath, userId, secondaryId) => [entityType, basePath || "", userId || "", secondaryId || "", entityId].join("::");
const assertCompanyAccess = async (uid, companyId) => {
    const [userCompanySnap, ownedCompanySnap] = await Promise.all([
        admin_1.db.ref(`users/${uid}/companies/${companyId}`).get(),
        admin_1.db.ref(`companies/${companyId}/users/${uid}`).get(),
    ]);
    if (!userCompanySnap.exists() && !ownedCompanySnap.exists())
        throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const assertSelfAccess = (actorUid, userId) => {
    if (actorUid !== userId)
        throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const normalizeRow = (row) => { var _a; return (Object.assign(Object.assign({}, ((row === null || row === void 0 ? void 0 : row.payload) || {})), { id: String((row === null || row === void 0 ? void 0 : row.entity_id) || ((_a = row === null || row === void 0 ? void 0 : row.payload) === null || _a === void 0 ? void 0 : _a.id) || "") })); };
const createEntityRow = (params) => {
    var _a, _b;
    const now = Date.now();
    const cleaned = stripUndefinedDeep(params.payload || {});
    return {
        row_id: rowIdFor(params.entityType, params.entityId, params.basePath, params.userId, params.secondaryId),
        entity_type: params.entityType,
        entity_id: params.entityId,
        company_id: params.companyId || null,
        site_id: params.siteId || null,
        subsite_id: params.subsiteId || null,
        base_path: params.basePath || null,
        user_id: params.userId || null,
        secondary_id: params.secondaryId || null,
        name: String((cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.title) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.messagePreview) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.senderName) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.contactUserId) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.text) || params.entityId),
        status: String((cleaned === null || cleaned === void 0 ? void 0 : cleaned.status) || params.defaultStatus || "active"),
        payload: Object.assign(Object.assign(Object.assign({}, (((_a = params.existing) === null || _a === void 0 ? void 0 : _a.payload) || {})), cleaned), { id: params.entityId }),
        created_at: Number(((_b = params.existing) === null || _b === void 0 ? void 0 : _b.created_at) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) || ((cleaned === null || cleaned === void 0 ? void 0 : cleaned.timestamp) ? Date.parse(String(cleaned.timestamp)) : now) || now),
        updated_at: now,
    };
};
const listMessagesForChat = async (basePath, chatId, limit = 50) => (await listRows({ entity_type: "messages", base_path: basePath, secondary_id: chatId }, "created_at.asc"))
    .map(normalizeRow)
    .slice(-limit);
const updateChatLastMessage = async (basePath, chatId, message) => {
    const existing = await getRow({ entity_type: "chats", base_path: basePath, entity_id: chatId });
    if (!existing)
        return;
    const next = createEntityRow({
        entityType: "chats",
        entityId: chatId,
        basePath,
        companyId: existing.company_id,
        siteId: existing.site_id,
        subsiteId: existing.subsite_id,
        payload: Object.assign(Object.assign({}, existing.payload), { lastMessage: {
                id: String((message === null || message === void 0 ? void 0 : message.id) || ""),
                text: String((message === null || message === void 0 ? void 0 : message.text) || ""),
                timestamp: String((message === null || message === void 0 ? void 0 : message.timestamp) || new Date().toISOString()),
                senderId: String((message === null || message === void 0 ? void 0 : message.senderId) || (message === null || message === void 0 ? void 0 : message.uid) || ""),
                senderName: `${String((message === null || message === void 0 ? void 0 : message.firstName) || "")} ${String((message === null || message === void 0 ? void 0 : message.lastName) || "")}`.trim(),
            }, updatedAt: String((message === null || message === void 0 ? void 0 : message.timestamp) || new Date().toISOString()) }),
        existing,
    });
    await patchRow(existing.row_id, next);
};
const handleMessengerDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11;
    try {
        const method = String(req.method || "GET").toUpperCase();
        if (method === "GET" && path === "/data/messenger/chats/user") {
            const scope = parseScope(firstQueryValue((_a = req.query) === null || _a === void 0 ? void 0 : _a.basePath) || "");
            const userId = String(firstQueryValue((_b = req.query) === null || _b === void 0 ? void 0 : _b.userId) || user.uid).trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            const rows = (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                .map(normalizeRow)
                .filter((chat) => Array.isArray(chat === null || chat === void 0 ? void 0 : chat.participants) && (chat.participants.includes(userId) || chat.createdBy === userId));
            json(res, 200, { ok: true, rows });
            return;
        }
        if (method === "GET" && path === "/data/messenger/chats/company") {
            const scope = parseScope(firstQueryValue((_c = req.query) === null || _c === void 0 ? void 0 : _c.basePath) || "");
            await assertCompanyAccess(user.uid, scope.companyId);
            json(res, 200, {
                ok: true,
                rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                    .map(normalizeRow)
                    .filter((chat) => chat.type === "company"),
            });
            return;
        }
        if (method === "GET" && path === "/data/messenger/chats/site") {
            const scope = parseScope(firstQueryValue((_d = req.query) === null || _d === void 0 ? void 0 : _d.basePath) || "");
            const siteId = String(firstQueryValue((_e = req.query) === null || _e === void 0 ? void 0 : _e.siteId) || "").trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            json(res, 200, {
                ok: true,
                rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                    .map(normalizeRow)
                    .filter((chat) => chat.siteId === siteId || chat.subsiteId === siteId),
            });
            return;
        }
        if (method === "GET" && path === "/data/messenger/chats/department") {
            const scope = parseScope(firstQueryValue((_f = req.query) === null || _f === void 0 ? void 0 : _f.basePath) || "");
            const departmentId = String(firstQueryValue((_g = req.query) === null || _g === void 0 ? void 0 : _g.departmentId) || "").trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            json(res, 200, {
                ok: true,
                rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                    .map(normalizeRow)
                    .filter((chat) => chat.departmentId === departmentId),
            });
            return;
        }
        if (method === "GET" && path === "/data/messenger/chats/role") {
            const scope = parseScope(firstQueryValue((_h = req.query) === null || _h === void 0 ? void 0 : _h.basePath) || "");
            const roleId = String(firstQueryValue((_j = req.query) === null || _j === void 0 ? void 0 : _j.roleId) || "").trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            json(res, 200, {
                ok: true,
                rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                    .map(normalizeRow)
                    .filter((chat) => chat.roleId === roleId),
            });
            return;
        }
        if (path === "/data/messenger/chats") {
            if (method === "GET") {
                const scope = parseScope(firstQueryValue((_k = req.query) === null || _k === void 0 ? void 0 : _k.basePath) || "");
                const chatId = String(firstQueryValue((_l = req.query) === null || _l === void 0 ? void 0 : _l.chatId) || "").trim();
                await assertCompanyAccess(user.uid, scope.companyId);
                if (chatId) {
                    const row = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId });
                    json(res, 200, { ok: true, row: row ? normalizeRow(row) : null });
                    return;
                }
                json(res, 200, { ok: true, rows: (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc")).map(normalizeRow) });
                return;
            }
            if (method === "POST") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const entityId = String(((_m = body === null || body === void 0 ? void 0 : body.data) === null || _m === void 0 ? void 0 : _m.id) || (0, crypto_1.randomUUID)());
                const row = createEntityRow({ entityType: "chats", entityId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: (body === null || body === void 0 ? void 0 : body.data) || {} });
                await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row), id: entityId });
                return;
            }
        }
        const chatByIdMatch = path.match(/^\/data\/messenger\/chats\/([^/]+)$/);
        if (chatByIdMatch) {
            const chatId = decodeURIComponent(chatByIdMatch[1]);
            if (method === "PATCH") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const existing = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId });
                if (!existing)
                    throw Object.assign(new Error("Chat not found"), { status: 404 });
                const row = createEntityRow({ entityType: "chats", entityId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: Object.assign(Object.assign({}, existing.payload), ((body === null || body === void 0 ? void 0 : body.updates) || {})), existing });
                await patchRow(existing.row_id, row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
            if (method === "DELETE") {
                const scope = parseScope(firstQueryValue((_o = req.query) === null || _o === void 0 ? void 0 : _o.basePath) || "");
                await assertCompanyAccess(user.uid, scope.companyId);
                const row = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId });
                if (row)
                    await deleteRow(row.row_id);
                const messageRows = await listRows({ entity_type: "messages", base_path: scope.basePath, secondary_id: chatId });
                for (const messageRow of messageRows)
                    await deleteRow(messageRow.row_id);
                json(res, 200, { ok: true });
                return;
            }
        }
        if (path === "/data/messenger/messages") {
            if (method === "GET") {
                const scope = parseScope(firstQueryValue((_p = req.query) === null || _p === void 0 ? void 0 : _p.basePath) || "");
                const chatId = String(firstQueryValue((_q = req.query) === null || _q === void 0 ? void 0 : _q.chatId) || "").trim();
                const limit = Number(firstQueryValue((_r = req.query) === null || _r === void 0 ? void 0 : _r.limit) || 50);
                await assertCompanyAccess(user.uid, scope.companyId);
                json(res, 200, { ok: true, rows: await listMessagesForChat(scope.basePath, chatId, Number.isFinite(limit) ? limit : 50) });
                return;
            }
            if (method === "POST") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const chatId = String(((_s = body === null || body === void 0 ? void 0 : body.data) === null || _s === void 0 ? void 0 : _s.chatId) || "").trim();
                const entityId = String(((_t = body === null || body === void 0 ? void 0 : body.data) === null || _t === void 0 ? void 0 : _t.id) || (0, crypto_1.randomUUID)());
                const row = createEntityRow({
                    entityType: "messages",
                    entityId,
                    secondaryId: chatId,
                    basePath: scope.basePath,
                    companyId: scope.companyId,
                    siteId: scope.siteId,
                    subsiteId: scope.subsiteId,
                    payload: Object.assign(Object.assign({}, ((body === null || body === void 0 ? void 0 : body.data) || {})), { timestamp: ((_u = body === null || body === void 0 ? void 0 : body.data) === null || _u === void 0 ? void 0 : _u.timestamp) || new Date().toISOString() }),
                    defaultStatus: "sent",
                });
                await insertRow(row);
                await updateChatLastMessage(scope.basePath, chatId, row.payload);
                json(res, 200, { ok: true, row: normalizeRow(row), id: entityId });
                return;
            }
        }
        if (method === "POST" && path === "/data/messenger/messages/search") {
            const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
            const term = String((body === null || body === void 0 ? void 0 : body.query) || "").toLowerCase();
            const userId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
            const chatId = String((body === null || body === void 0 ? void 0 : body.chatId) || "").trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            let rows = chatId
                ? await listMessagesForChat(scope.basePath, chatId, 2000)
                : (await listRows({ entity_type: "messages", base_path: scope.basePath }, "created_at.asc")).map(normalizeRow);
            if (!chatId) {
                const allowedChats = (await listRows({ entity_type: "chats", base_path: scope.basePath }, "updated_at.desc"))
                    .map(normalizeRow)
                    .filter((chat) => Array.isArray(chat === null || chat === void 0 ? void 0 : chat.participants) && (chat.participants.includes(userId) || chat.createdBy === userId));
                const allowedIds = new Set(allowedChats.map((chat) => String(chat.id)));
                rows = rows.filter((message) => allowedIds.has(String(message.chatId)));
            }
            json(res, 200, { ok: true, rows: rows.filter((message) => String((message === null || message === void 0 ? void 0 : message.text) || "").toLowerCase().includes(term)) });
            return;
        }
        const messageActionMatch = path.match(/^\/data\/messenger\/messages\/([^/]+)\/(read|reactions|edit|delete|pin|unpin)$/);
        if (messageActionMatch && method === "PATCH") {
            const messageId = decodeURIComponent(messageActionMatch[1]);
            const action = messageActionMatch[2];
            const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
            const chatId = String((body === null || body === void 0 ? void 0 : body.chatId) || "").trim();
            await assertCompanyAccess(user.uid, scope.companyId);
            const existing = await getRow({ entity_type: "messages", base_path: scope.basePath, secondary_id: chatId, entity_id: messageId });
            if (!existing)
                throw Object.assign(new Error("Message not found"), { status: 404 });
            const payload = Object.assign({}, (existing.payload || {}));
            if (action === "read") {
                const readBy = Array.isArray(payload.readBy) ? [...payload.readBy] : [];
                const userId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
                if (!readBy.includes(userId))
                    readBy.push(userId);
                payload.readBy = readBy;
            }
            if (action === "reactions") {
                const emoji = String((body === null || body === void 0 ? void 0 : body.emoji) || "").trim();
                const userId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
                const reactions = payload.reactions && typeof payload.reactions === "object" ? Object.assign({}, payload.reactions) : {};
                const current = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
                const next = (body === null || body === void 0 ? void 0 : body.add) ? Array.from(new Set([...current, userId])) : current.filter((id) => id !== userId);
                if (next.length)
                    reactions[emoji] = next;
                else
                    delete reactions[emoji];
                payload.reactions = reactions;
            }
            if (action === "edit") {
                const actorId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
                if (String(payload.senderId || payload.uid || "") !== actorId)
                    throw Object.assign(new Error("Only the author can edit this message"), { status: 403 });
                const editHistory = Array.isArray(payload.editHistory) ? [...payload.editHistory] : [];
                editHistory.push({ text: payload.text, timestamp: new Date().toISOString() });
                payload.text = String((body === null || body === void 0 ? void 0 : body.newText) || "");
                payload.isEdited = true;
                payload.editHistory = editHistory;
            }
            if (action === "delete") {
                const actorId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
                if (String(payload.senderId || payload.uid || "") !== actorId)
                    throw Object.assign(new Error("Only the author can delete this message"), { status: 403 });
                payload.isDeleted = true;
                payload.text = "This message was deleted";
                payload.attachments = null;
            }
            if (action === "pin")
                payload.isPinned = true;
            if (action === "unpin")
                payload.isPinned = false;
            const row = createEntityRow({ entityType: "messages", entityId: messageId, secondaryId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload, existing, defaultStatus: "sent" });
            await patchRow(existing.row_id, row);
            if (action === "pin" || action === "unpin") {
                const chatRow = await getRow({ entity_type: "chats", base_path: scope.basePath, entity_id: chatId });
                if (chatRow) {
                    const pinned = new Set(Array.isArray((_v = chatRow.payload) === null || _v === void 0 ? void 0 : _v.pinnedMessages) ? chatRow.payload.pinnedMessages : []);
                    if (action === "pin")
                        pinned.add(messageId);
                    else
                        pinned.delete(messageId);
                    const nextChat = createEntityRow({ entityType: "chats", entityId: chatId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, payload: Object.assign(Object.assign({}, chatRow.payload), { pinnedMessages: Array.from(pinned) }), existing: chatRow });
                    await patchRow(chatRow.row_id, nextChat);
                }
            }
            if (action === "edit" || action === "delete")
                await updateChatLastMessage(scope.basePath, chatId, row.payload);
            json(res, 200, { ok: true, row: normalizeRow(row) });
            return;
        }
        if (path === "/data/messenger/categories") {
            if (method === "GET") {
                const companyId = String(firstQueryValue((_w = req.query) === null || _w === void 0 ? void 0 : _w.companyId) || "").trim();
                await assertCompanyAccess(user.uid, companyId);
                json(res, 200, { ok: true, rows: (await listRows({ entity_type: "categories", company_id: companyId }, "created_at.asc")).map(normalizeRow) });
                return;
            }
            if (method === "POST") {
                const companyId = String((body === null || body === void 0 ? void 0 : body.companyId) || ((_x = body === null || body === void 0 ? void 0 : body.data) === null || _x === void 0 ? void 0 : _x.companyId) || "").trim();
                await assertCompanyAccess(user.uid, companyId);
                const entityId = String(((_y = body === null || body === void 0 ? void 0 : body.data) === null || _y === void 0 ? void 0 : _y.id) || (0, crypto_1.randomUUID)());
                const row = createEntityRow({ entityType: "categories", entityId, companyId, payload: (body === null || body === void 0 ? void 0 : body.data) || {} });
                await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row), id: entityId });
                return;
            }
        }
        const categoryMatch = path.match(/^\/data\/messenger\/categories\/([^/]+)$/);
        if (categoryMatch) {
            const categoryId = decodeURIComponent(categoryMatch[1]);
            const companyId = String(method === "DELETE" ? firstQueryValue((_z = req.query) === null || _z === void 0 ? void 0 : _z.companyId) || "" : (body === null || body === void 0 ? void 0 : body.companyId) || "").trim();
            await assertCompanyAccess(user.uid, companyId);
            if (method === "PATCH") {
                const existing = await getRow({ entity_type: "categories", company_id: companyId, entity_id: categoryId });
                if (!existing)
                    throw Object.assign(new Error("Category not found"), { status: 404 });
                const row = createEntityRow({ entityType: "categories", entityId: categoryId, companyId, payload: Object.assign(Object.assign({}, existing.payload), ((body === null || body === void 0 ? void 0 : body.updates) || {})), existing });
                await patchRow(existing.row_id, row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
            if (method === "DELETE") {
                const existing = await getRow({ entity_type: "categories", company_id: companyId, entity_id: categoryId });
                if (existing)
                    await deleteRow(existing.row_id);
                const chats = await listRows({ entity_type: "chats", company_id: companyId }, "updated_at.desc");
                for (const chatRow of chats) {
                    if (String(((_0 = chatRow === null || chatRow === void 0 ? void 0 : chatRow.payload) === null || _0 === void 0 ? void 0 : _0.categoryId) || "") !== categoryId)
                        continue;
                    const next = createEntityRow({
                        entityType: "chats",
                        entityId: String(chatRow.entity_id),
                        companyId,
                        siteId: chatRow.site_id,
                        subsiteId: chatRow.subsite_id,
                        basePath: chatRow.base_path,
                        payload: Object.assign(Object.assign({}, chatRow.payload), { categoryId: null }),
                        existing: chatRow,
                    });
                    await patchRow(chatRow.row_id, next);
                }
                json(res, 200, { ok: true });
                return;
            }
        }
        if (path === "/data/messenger/statuses") {
            if (method === "GET") {
                const scope = parseScope(firstQueryValue((_1 = req.query) === null || _1 === void 0 ? void 0 : _1.basePath) || "");
                const userId = String(firstQueryValue((_2 = req.query) === null || _2 === void 0 ? void 0 : _2.userId) || "").trim();
                await assertCompanyAccess(user.uid, scope.companyId);
                const row = await getRow({ entity_type: "userStatuses", base_path: scope.basePath, user_id: userId, entity_id: userId });
                json(res, 200, { ok: true, row: row ? normalizeRow(row) : null });
                return;
            }
            if (method === "PUT") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                const userId = String((body === null || body === void 0 ? void 0 : body.userId) || user.uid).trim();
                await assertCompanyAccess(user.uid, scope.companyId);
                const existing = await getRow({ entity_type: "userStatuses", base_path: scope.basePath, user_id: userId, entity_id: userId });
                const row = createEntityRow({
                    entityType: "userStatuses",
                    entityId: userId,
                    userId,
                    basePath: scope.basePath,
                    companyId: scope.companyId,
                    siteId: scope.siteId,
                    subsiteId: scope.subsiteId,
                    payload: { status: body === null || body === void 0 ? void 0 : body.status, lastSeen: new Date().toISOString(), customStatus: body === null || body === void 0 ? void 0 : body.customStatus },
                    existing,
                });
                if (existing)
                    await patchRow(existing.row_id, row);
                else
                    await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
        }
        if (path === "/data/messenger/chatSettings") {
            const userId = String(method === "GET" ? firstQueryValue((_3 = req.query) === null || _3 === void 0 ? void 0 : _3.userId) || "" : (body === null || body === void 0 ? void 0 : body.userId) || "").trim();
            const chatId = String(method === "GET" ? firstQueryValue((_4 = req.query) === null || _4 === void 0 ? void 0 : _4.chatId) || "" : (body === null || body === void 0 ? void 0 : body.chatId) || "").trim();
            assertSelfAccess(user.uid, userId);
            if (method === "GET") {
                const row = await getRow({ entity_type: "chatSettings", user_id: userId, secondary_id: chatId, entity_id: chatId });
                json(res, 200, { ok: true, row: row ? normalizeRow(row) : null });
                return;
            }
            if (method === "PATCH") {
                const existing = await getRow({ entity_type: "chatSettings", user_id: userId, secondary_id: chatId, entity_id: chatId });
                const row = createEntityRow({
                    entityType: "chatSettings",
                    entityId: chatId,
                    userId,
                    secondaryId: chatId,
                    payload: Object.assign(Object.assign({ userId, chatId, isMuted: false, isStarred: false, isPinned: false, notificationLevel: "all" }, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), ((body === null || body === void 0 ? void 0 : body.settings) || {})),
                    existing,
                });
                if (existing)
                    await patchRow(existing.row_id, row);
                else
                    await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
        }
        if (path === "/data/messenger/drafts") {
            const userId = String(method === "GET" || method === "DELETE" ? firstQueryValue((_5 = req.query) === null || _5 === void 0 ? void 0 : _5.userId) || "" : (body === null || body === void 0 ? void 0 : body.userId) || "").trim();
            const chatId = String(method === "GET" || method === "DELETE" ? firstQueryValue((_6 = req.query) === null || _6 === void 0 ? void 0 : _6.chatId) || "" : (body === null || body === void 0 ? void 0 : body.chatId) || "").trim();
            assertSelfAccess(user.uid, userId);
            if (method === "GET") {
                const row = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId });
                json(res, 200, { ok: true, row: row ? normalizeRow(row) : null });
                return;
            }
            if (method === "PUT") {
                const existing = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId });
                const row = createEntityRow({
                    entityType: "drafts",
                    entityId: chatId,
                    userId,
                    secondaryId: chatId,
                    payload: { userId, chatId, text: (body === null || body === void 0 ? void 0 : body.text) || "", attachments: body === null || body === void 0 ? void 0 : body.attachments, lastUpdated: new Date().toISOString() },
                    existing,
                });
                if (existing)
                    await patchRow(existing.row_id, row);
                else
                    await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
            if (method === "DELETE") {
                const existing = await getRow({ entity_type: "drafts", user_id: userId, secondary_id: chatId, entity_id: chatId });
                if (existing)
                    await deleteRow(existing.row_id);
                json(res, 200, { ok: true });
                return;
            }
        }
        if (method === "GET" && path === "/data/messenger/notifications") {
            const userId = String(firstQueryValue((_7 = req.query) === null || _7 === void 0 ? void 0 : _7.userId) || "").trim();
            assertSelfAccess(user.uid, userId);
            json(res, 200, { ok: true, rows: (await listRows({ entity_type: "notifications", user_id: userId }, "created_at.desc")).map(normalizeRow) });
            return;
        }
        if (method === "PATCH" && path === "/data/messenger/notifications/readAll") {
            const userId = String((body === null || body === void 0 ? void 0 : body.userId) || "").trim();
            assertSelfAccess(user.uid, userId);
            const rows = await listRows({ entity_type: "notifications", user_id: userId }, "created_at.asc");
            for (const row of rows) {
                const next = createEntityRow({ entityType: "notifications", entityId: String(row.entity_id), userId, payload: Object.assign(Object.assign({}, (row.payload || {})), { isRead: true }), existing: row });
                await patchRow(row.row_id, next);
            }
            json(res, 200, { ok: true });
            return;
        }
        const notificationMatch = path.match(/^\/data\/messenger\/notifications\/([^/]+)\/read$/);
        if (notificationMatch && method === "PATCH") {
            const notificationId = decodeURIComponent(notificationMatch[1]);
            const userId = String((body === null || body === void 0 ? void 0 : body.userId) || "").trim();
            assertSelfAccess(user.uid, userId);
            const row = await getRow({ entity_type: "notifications", user_id: userId, entity_id: notificationId });
            if (!row)
                throw Object.assign(new Error("Notification not found"), { status: 404 });
            const next = createEntityRow({ entityType: "notifications", entityId: notificationId, userId, payload: Object.assign(Object.assign({}, (row.payload || {})), { isRead: true }), existing: row });
            await patchRow(row.row_id, next);
            json(res, 200, { ok: true });
            return;
        }
        if (path === "/data/messenger/contacts") {
            if (method === "GET") {
                const scope = parseScope(firstQueryValue((_8 = req.query) === null || _8 === void 0 ? void 0 : _8.basePath) || "");
                await assertCompanyAccess(user.uid, scope.companyId);
                json(res, 200, { ok: true, rows: (await listRows({ entity_type: "contacts", base_path: scope.basePath }, "created_at.asc")).map(normalizeRow) });
                return;
            }
            if (method === "POST") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const entityId = String(((_9 = body === null || body === void 0 ? void 0 : body.data) === null || _9 === void 0 ? void 0 : _9.id) || (0, crypto_1.randomUUID)());
                const row = createEntityRow({ entityType: "contacts", entityId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, userId: ((_10 = body === null || body === void 0 ? void 0 : body.data) === null || _10 === void 0 ? void 0 : _10.userId) || null, payload: (body === null || body === void 0 ? void 0 : body.data) || {} });
                await insertRow(row);
                json(res, 200, { ok: true, row: normalizeRow(row), id: entityId });
                return;
            }
        }
        const contactMatch = path.match(/^\/data\/messenger\/contacts\/([^/]+)$/);
        if (contactMatch) {
            const contactId = decodeURIComponent(contactMatch[1]);
            if (method === "PATCH") {
                const scope = parseScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
                await assertCompanyAccess(user.uid, scope.companyId);
                const existing = await getRow({ entity_type: "contacts", base_path: scope.basePath, entity_id: contactId });
                if (!existing)
                    throw Object.assign(new Error("Contact not found"), { status: 404 });
                const row = createEntityRow({ entityType: "contacts", entityId: contactId, basePath: scope.basePath, companyId: scope.companyId, siteId: scope.siteId, subsiteId: scope.subsiteId, userId: existing.user_id, payload: Object.assign(Object.assign({}, existing.payload), ((body === null || body === void 0 ? void 0 : body.updates) || {})), existing });
                await patchRow(existing.row_id, row);
                json(res, 200, { ok: true, row: normalizeRow(row) });
                return;
            }
            if (method === "DELETE") {
                const scope = parseScope(firstQueryValue((_11 = req.query) === null || _11 === void 0 ? void 0 : _11.basePath) || "");
                await assertCompanyAccess(user.uid, scope.companyId);
                const existing = await getRow({ entity_type: "contacts", base_path: scope.basePath, entity_id: contactId });
                if (existing)
                    await deleteRow(existing.row_id);
                json(res, 200, { ok: true });
                return;
            }
        }
        json(res, 404, { error: `Unhandled messenger route: ${method} ${path}` });
    }
    catch (error) {
        json(res, (error === null || error === void 0 ? void 0 : error.status) || 500, { error: (error === null || error === void 0 ? void 0 : error.message) || "Unexpected messenger data error" });
    }
};
exports.handleMessengerDataRequest = handleMessengerDataRequest;
//# sourceMappingURL=dataMessenger.js.map