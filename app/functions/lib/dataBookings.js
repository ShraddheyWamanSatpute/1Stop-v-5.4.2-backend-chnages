"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBookingsDataRequest = void 0;
const crypto_1 = require("crypto");
const admin_1 = require("./admin");
const DEFAULT_BOOKING_SETTINGS = {
    openTimes: {},
    bookingTypes: {},
    businessHours: [],
    blackoutDates: [],
    allowOnlineBookings: false,
    maxDaysInAdvance: 30,
    minHoursInAdvance: 1,
    timeSlotInterval: 30,
    defaultDuration: 2,
    maxPartySize: 20,
};
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
const parseBookingScope = (rawBasePath) => {
    const basePath = normalizeBasePath(rawBasePath);
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/bookings$/i);
    if (!match) {
        throw Object.assign(new Error("Invalid bookings basePath"), { status: 400 });
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
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Bookings provider"), { status: 500 });
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
    params.set("select", "id,payload,created_at");
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
const createEntityRow = (scope, id, payload, opts) => {
    var _a, _b, _c, _d, _e;
    const cleaned = stripUndefinedDeep(payload);
    return {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: String((opts === null || opts === void 0 ? void 0 : opts.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.firstName) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.description) || id),
        status: (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.status) !== null && _a !== void 0 ? _a : cleaned === null || cleaned === void 0 ? void 0 : cleaned.status) !== null && _b !== void 0 ? _b : null,
        code: (_d = (_c = opts === null || opts === void 0 ? void 0 : opts.code) !== null && _c !== void 0 ? _c : cleaned === null || cleaned === void 0 ? void 0 : cleaned.code) !== null && _d !== void 0 ? _d : null,
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: (_e = opts === null || opts === void 0 ? void 0 : opts.createdAt) !== null && _e !== void 0 ? _e : Date.parse((cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.timeAdded) || new Date().toISOString()),
        updated_at: Date.now(),
    };
};
const upsertEntity = async (table, scope, id, payload, opts) => {
    const existing = await getSingleRow(table, { id, base_path: scope.basePath });
    const mergedPayload = Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), stripUndefinedDeep(payload)), { id });
    const row = createEntityRow(scope, id, mergedPayload, opts);
    if (!existing)
        await insertRow(table, row);
    else
        await patchRow(table, { id, base_path: scope.basePath }, row);
    return Object.assign(Object.assign({}, (row.payload || {})), { id });
};
const lower = (value) => String(value || "").toLowerCase();
const tableTypeRowName = (payload) => String((payload === null || payload === void 0 ? void 0 : payload.name) || payload || "Table Type");
const buildBookingStats = (bookings) => {
    const stats = {
        totalBookings: bookings.length,
        confirmedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        noShowBookings: 0,
        averagePartySize: 0,
        totalCovers: 0,
        peakHours: {},
        bookingsByType: {},
        bookingsByDay: {},
        occupancyRate: 0,
    };
    let totalGuests = 0;
    for (const booking of bookings) {
        const status = lower(booking === null || booking === void 0 ? void 0 : booking.status);
        if (status === "confirmed")
            stats.confirmedBookings += 1;
        else if (status === "cancelled" || status === "canceled")
            stats.cancelledBookings += 1;
        else if (status === "pending")
            stats.pendingBookings += 1;
        else if (status === "no-show" || status === "no show")
            stats.noShowBookings += 1;
        const guests = Number((booking === null || booking === void 0 ? void 0 : booking.guests) || (booking === null || booking === void 0 ? void 0 : booking.covers) || (booking === null || booking === void 0 ? void 0 : booking.guestCount) || 0);
        totalGuests += guests;
        stats.totalCovers += guests;
        const hour = String((booking === null || booking === void 0 ? void 0 : booking.arrivalTime) || "").split(":")[0] || "Unknown";
        stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
        const bookingType = String((booking === null || booking === void 0 ? void 0 : booking.bookingType) || "Standard");
        stats.bookingsByType[bookingType] = (stats.bookingsByType[bookingType] || 0) + 1;
        const bookingDate = new Date(String((booking === null || booking === void 0 ? void 0 : booking.date) || ""));
        if (!Number.isNaN(bookingDate.getTime())) {
            const day = bookingDate.toLocaleDateString("en-US", { weekday: "long" });
            stats.bookingsByDay[day] = (stats.bookingsByDay[day] || 0) + 1;
        }
    }
    stats.averagePartySize = bookings.length > 0 ? totalGuests / bookings.length : 0;
    return stats;
};
const handleBookingsDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    const entityMap = {
        bookings: {
            table: "app_bookings",
            list: (scope) => listRows("app_bookings", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_bookings", scope, id, payload, {
                name: [payload === null || payload === void 0 ? void 0 : payload.firstName, payload === null || payload === void 0 ? void 0 : payload.lastName].filter(Boolean).join(" ") || (payload === null || payload === void 0 ? void 0 : payload.email) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.status) || null,
                code: (payload === null || payload === void 0 ? void 0 : payload.date) || null,
            }),
        },
        tables: {
            table: "app_booking_tables",
            list: (scope) => listRows("app_booking_tables", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_tables", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.active) === false ? "inactive" : "active",
                code: (payload === null || payload === void 0 ? void 0 : payload.number) ? String(payload.number) : null,
            }),
        },
        tableTypes: {
            table: "app_booking_table_types",
            list: async (scope) => (await listRows("app_booking_table_types", scope.basePath)).map((row) => ({
                id: row.id,
                name: row.name || row.payload || row.value || "",
            })),
            upsert: (scope, id, payload) => upsertEntity("app_booking_table_types", scope, id, typeof payload === "string" ? { name: payload } : payload, {
                name: tableTypeRowName(payload),
                status: "active",
                code: null,
            }),
        },
        bookingTypes: {
            table: "app_booking_types",
            list: (scope) => listRows("app_booking_types", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_types", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.active) === false ? "inactive" : "active",
                code: null,
            }),
        },
        statuses: {
            table: "app_booking_statuses",
            list: (scope) => listRows("app_booking_statuses", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_statuses", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.active) === false ? "inactive" : "active",
                code: null,
            }),
        },
        waitlist: {
            table: "app_booking_waitlist",
            list: (scope) => listRows("app_booking_waitlist", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_waitlist", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.status) || "Waiting",
                code: null,
            }),
        },
        customers: {
            table: "app_booking_customers",
            list: (scope) => listRows("app_booking_customers", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_customers", scope, id, payload, {
                name: [payload === null || payload === void 0 ? void 0 : payload.firstName, payload === null || payload === void 0 ? void 0 : payload.lastName].filter(Boolean).join(" ") || (payload === null || payload === void 0 ? void 0 : payload.email) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.active) === false ? "inactive" : "active",
                code: null,
            }),
        },
        floorPlans: {
            table: "app_booking_floor_plans",
            list: (scope) => listRows("app_booking_floor_plans", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_floor_plans", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.isDefault) ? "default" : "active",
                code: null,
            }),
        },
        tags: {
            table: "app_booking_tags",
            list: (scope) => listRows("app_booking_tags", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_tags", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: (payload === null || payload === void 0 ? void 0 : payload.active) === false ? "inactive" : "active",
                code: null,
            }),
        },
        preorderProfiles: {
            table: "app_booking_preorder_profiles",
            list: (scope) => listRows("app_booking_preorder_profiles", scope.basePath),
            upsert: (scope, id, payload) => upsertEntity("app_booking_preorder_profiles", scope, id, payload, {
                name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
                status: "active",
                code: null,
            }),
        },
    };
    const listMatch = pathname.match(/^\/data\/bookings\/(bookings|tables|tableTypes|bookingTypes|statuses|waitlist|customers|floorPlans|tags|preorderProfiles)$/);
    if (listMatch && method === "GET") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        send(200, { ok: true, rows: await entityMap[entity].list(scope) });
        return;
    }
    if (pathname === "/data/bookings/bookings/byDate" && method === "GET") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const wanted = getQuery("date");
        const rows = (await entityMap.bookings.list(scope)).filter((booking) => String((booking === null || booking === void 0 ? void 0 : booking.date) || "") === wanted);
        send(200, { ok: true, rows });
        return;
    }
    if (listMatch && method === "POST") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        const data = (_b = (_a = body === null || body === void 0 ? void 0 : body.data) !== null && _a !== void 0 ? _a : body === null || body === void 0 ? void 0 : body.value) !== null && _b !== void 0 ? _b : {};
        const id = String((data === null || data === void 0 ? void 0 : data.id) ||
            (entity === "customers" ? data === null || data === void 0 ? void 0 : data.id : "") ||
            (0, crypto_1.randomUUID)());
        const row = await entityMap[entity].upsert(scope, id, data);
        send(200, { ok: true, id, row });
        return;
    }
    const itemMatch = pathname.match(/^\/data\/bookings\/(bookings|tables|tableTypes|bookingTypes|statuses|waitlist|customers|floorPlans|tags|preorderProfiles)\/([^/]+)$/);
    if (itemMatch && method === "PATCH") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        const updates = (_d = (_c = body === null || body === void 0 ? void 0 : body.updates) !== null && _c !== void 0 ? _c : body === null || body === void 0 ? void 0 : body.data) !== null && _d !== void 0 ? _d : {};
        const row = await entityMap[entity].upsert(scope, id, updates);
        send(200, { ok: true, row });
        return;
    }
    if (itemMatch && method === "DELETE") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath });
        send(200, { ok: true });
        return;
    }
    const bookingMessageMatch = pathname.match(/^\/data\/bookings\/bookings\/([^/]+)\/messages$/);
    if (bookingMessageMatch && method === "POST") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const id = decodeURIComponent(bookingMessageMatch[1]);
        const existing = await getSingleRow("app_bookings", { id, base_path: scope.basePath });
        if (!(existing === null || existing === void 0 ? void 0 : existing.payload))
            throw Object.assign(new Error("Booking not found"), { status: 404 });
        const messages = Array.isArray(existing.payload.messages) ? existing.payload.messages : [];
        const row = await entityMap.bookings.upsert(scope, id, Object.assign(Object.assign({}, existing.payload), { messages: [...messages, body === null || body === void 0 ? void 0 : body.message], updatedAt: new Date().toISOString() }));
        send(200, { ok: true, row });
        return;
    }
    if (pathname === "/data/bookings/settings" && method === "GET") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const row = await getSingleRow("app_booking_settings", { id: "settings", base_path: scope.basePath });
        send(200, { ok: true, row: (row === null || row === void 0 ? void 0 : row.payload) || DEFAULT_BOOKING_SETTINGS });
        return;
    }
    if (pathname === "/data/bookings/settings" && method === "PUT") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const row = await upsertEntity("app_booking_settings", scope, "settings", (body === null || body === void 0 ? void 0 : body.settings) || {}, {
            name: "settings",
            status: "active",
            code: null,
        });
        send(200, { ok: true, row });
        return;
    }
    if (pathname === "/data/bookings/stats" && method === "GET") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const startDate = getQuery("startDate");
        const endDate = getQuery("endDate");
        const bookings = await entityMap.bookings.list(scope);
        const filtered = bookings.filter((booking) => {
            const date = String((booking === null || booking === void 0 ? void 0 : booking.date) || "");
            if (startDate && date < startDate)
                return false;
            if (endDate && date > endDate)
                return false;
            return true;
        });
        send(200, { ok: true, row: buildBookingStats(filtered) });
        return;
    }
    const floorPlanTableMatch = pathname.match(/^\/data\/bookings\/floorPlans\/([^/]+)\/tables(?:\/([^/]+))?$/);
    if (floorPlanTableMatch && method === "POST") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const floorPlanId = decodeURIComponent(floorPlanTableMatch[1]);
        const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath });
        if (!(existing === null || existing === void 0 ? void 0 : existing.payload))
            throw Object.assign(new Error("Floor plan not found"), { status: 404 });
        const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : [];
        const element = Object.assign(Object.assign({}, body === null || body === void 0 ? void 0 : body.tableElement), { id: String(((_e = body === null || body === void 0 ? void 0 : body.tableElement) === null || _e === void 0 ? void 0 : _e.id) || (0, crypto_1.randomUUID)()) });
        const row = await entityMap.floorPlans.upsert(scope, floorPlanId, Object.assign(Object.assign({}, existing.payload), { tables: [...tables, element], updatedAt: new Date().toISOString() }));
        send(200, { ok: true, row, tableElement: element });
        return;
    }
    if (floorPlanTableMatch && method === "PATCH") {
        const scope = parseBookingScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const floorPlanId = decodeURIComponent(floorPlanTableMatch[1]);
        const tableElementId = decodeURIComponent(String(floorPlanTableMatch[2] || ""));
        const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath });
        if (!(existing === null || existing === void 0 ? void 0 : existing.payload))
            throw Object.assign(new Error("Floor plan not found"), { status: 404 });
        const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : [];
        const row = await entityMap.floorPlans.upsert(scope, floorPlanId, Object.assign(Object.assign({}, existing.payload), { tables: tables.map((table) => String(table === null || table === void 0 ? void 0 : table.id) === tableElementId ? Object.assign(Object.assign({}, table), ((body === null || body === void 0 ? void 0 : body.updates) || {})) : table), updatedAt: new Date().toISOString() }));
        send(200, { ok: true, row });
        return;
    }
    if (floorPlanTableMatch && method === "DELETE") {
        const scope = parseBookingScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const floorPlanId = decodeURIComponent(floorPlanTableMatch[1]);
        const tableElementId = decodeURIComponent(String(floorPlanTableMatch[2] || ""));
        const existing = await getSingleRow("app_booking_floor_plans", { id: floorPlanId, base_path: scope.basePath });
        if (!(existing === null || existing === void 0 ? void 0 : existing.payload))
            throw Object.assign(new Error("Floor plan not found"), { status: 404 });
        const tables = Array.isArray(existing.payload.tables) ? existing.payload.tables : [];
        const row = await entityMap.floorPlans.upsert(scope, floorPlanId, Object.assign(Object.assign({}, existing.payload), { tables: tables.filter((table) => String(table === null || table === void 0 ? void 0 : table.id) !== tableElementId), updatedAt: new Date().toISOString() }));
        send(200, { ok: true, row });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleBookingsDataRequest = handleBookingsDataRequest;
//# sourceMappingURL=dataBookings.js.map