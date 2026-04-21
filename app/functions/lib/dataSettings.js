"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSettingsDataRequest = void 0;
const admin_1 = require("./admin");
const DEFAULT_PERSONAL_SETTINGS = {
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    avatar: "",
    address: { street: "", city: "", state: "", zipCode: "", country: "" },
    bankDetails: { accountHolderName: "", bankName: "", accountNumber: "", sortCode: "", iban: "" },
    niNumber: "",
    taxCode: "",
    emergencyContact: { name: "", relationship: "", phone: "", email: "" },
    emergencyContacts: [],
};
const DEFAULT_PREFERENCES_SETTINGS = {
    theme: "light",
    notifications: {
        email: true,
        push: true,
        sms: false,
    },
    emailPreferences: {
        lowStock: true,
        orderUpdates: true,
        systemNotifications: true,
        marketing: false,
    },
    language: "en",
};
const DEFAULT_BUSINESS_SETTINGS = {
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    taxNumber: "",
    businessLogo: "",
    industry: "",
};
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
const firstQueryValue = (value) => {
    if (Array.isArray(value))
        return typeof value[0] === "string" ? value[0] : undefined;
    return typeof value === "string" ? value : undefined;
};
const toMillis = (value, fallback = Date.now()) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber))
            return asNumber;
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return fallback;
};
const mergeObject = (base, patch) => stripUndefinedDeep(Object.assign(Object.assign({}, (base || {})), (patch || {})));
const normalizeCompaniesCollection = (raw) => {
    if (Array.isArray(raw)) {
        const map = {};
        for (const entry of raw) {
            const id = String((entry === null || entry === void 0 ? void 0 : entry.companyID) || (entry === null || entry === void 0 ? void 0 : entry.companyId) || "").trim();
            if (id)
                map[id] = entry;
        }
        return map;
    }
    return raw && typeof raw === "object" ? raw : {};
};
const companyIdsFromCollection = (raw) => {
    if (Array.isArray(raw)) {
        return raw
            .map((entry) => String((entry === null || entry === void 0 ? void 0 : entry.companyID) || (entry === null || entry === void 0 ? void 0 : entry.companyId) || "").trim())
            .filter(Boolean);
    }
    if (raw && typeof raw === "object") {
        return Object.entries(raw)
            .map(([key, value]) => String((value === null || value === void 0 ? void 0 : value.companyID) || (value === null || value === void 0 ? void 0 : value.companyId) || key || "").trim())
            .filter(Boolean);
    }
    return [];
};
const getSupabaseConfig = () => {
    const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !serviceRoleKey) {
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Settings provider"), { status: 500 });
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
const assertCompanyAccess = async (uid, companyId) => {
    const [userCompanySnap, companyUserSnap] = await Promise.all([
        admin_1.db.ref(`users/${uid}/companies/${companyId}`).get(),
        admin_1.db.ref(`companies/${companyId}/users/${uid}`).get(),
    ]);
    if (!userCompanySnap.exists() && !companyUserSnap.exists()) {
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
};
const hasSharedCompany = async (actorUid, targetUid) => {
    if (actorUid === targetUid)
        return true;
    const [actorCompaniesSnap, targetCompaniesSnap] = await Promise.all([
        admin_1.db.ref(`users/${actorUid}/companies`).get(),
        admin_1.db.ref(`users/${targetUid}/companies`).get(),
    ]);
    const actorCompanyIds = new Set(companyIdsFromCollection(actorCompaniesSnap.val()));
    const targetCompanyIds = companyIdsFromCollection(targetCompaniesSnap.val());
    return targetCompanyIds.some((companyId) => actorCompanyIds.has(companyId));
};
const assertUserAccess = async (actorUid, targetUid) => {
    const allowed = await hasSharedCompany(actorUid, targetUid);
    if (!allowed)
        throw Object.assign(new Error("Forbidden"), { status: 403 });
};
const normalizePersonalSettings = (payload) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const personal = (_a = payload === null || payload === void 0 ? void 0 : payload.settings) === null || _a === void 0 ? void 0 : _a.personal;
    if (personal && typeof personal === "object") {
        const emergencyContacts = (Array.isArray(personal.emergencyContacts) && personal.emergencyContacts) ||
            (personal.emergencyContact ? [personal.emergencyContact] : []) ||
            [];
        return Object.assign(Object.assign(Object.assign({}, DEFAULT_PERSONAL_SETTINGS), personal), { address: mergeObject(DEFAULT_PERSONAL_SETTINGS.address, personal.address), bankDetails: mergeObject(DEFAULT_PERSONAL_SETTINGS.bankDetails, personal.bankDetails), emergencyContact: mergeObject(DEFAULT_PERSONAL_SETTINGS.emergencyContact, personal.emergencyContact), emergencyContacts });
    }
    const legacy = {
        firstName: (payload === null || payload === void 0 ? void 0 : payload.firstName) || "",
        middleName: (payload === null || payload === void 0 ? void 0 : payload.middleName) || "",
        lastName: (payload === null || payload === void 0 ? void 0 : payload.lastName) || "",
        email: (payload === null || payload === void 0 ? void 0 : payload.email) || "",
        phone: (payload === null || payload === void 0 ? void 0 : payload.phone) || "",
        jobTitle: (payload === null || payload === void 0 ? void 0 : payload.jobTitle) || "",
        avatar: (payload === null || payload === void 0 ? void 0 : payload.avatar) || (payload === null || payload === void 0 ? void 0 : payload.photoURL) || "",
        address: (payload === null || payload === void 0 ? void 0 : payload.address) || ((_b = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _b === void 0 ? void 0 : _b.address),
        bankDetails: (payload === null || payload === void 0 ? void 0 : payload.bankDetails) || ((_c = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _c === void 0 ? void 0 : _c.bankDetails),
        niNumber: (payload === null || payload === void 0 ? void 0 : payload.niNumber) || ((_d = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _d === void 0 ? void 0 : _d.niNumber),
        taxCode: (payload === null || payload === void 0 ? void 0 : payload.taxCode) || ((_e = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _e === void 0 ? void 0 : _e.taxCode),
        emergencyContact: (payload === null || payload === void 0 ? void 0 : payload.emergencyContact) || ((_f = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _f === void 0 ? void 0 : _f.emergencyContact),
        emergencyContacts: (payload === null || payload === void 0 ? void 0 : payload.emergencyContacts) || ((_g = payload === null || payload === void 0 ? void 0 : payload.personal) === null || _g === void 0 ? void 0 : _g.emergencyContacts),
    };
    const emergencyContacts = (Array.isArray(legacy.emergencyContacts) && legacy.emergencyContacts) ||
        (legacy.emergencyContact ? [legacy.emergencyContact] : []) ||
        [];
    return Object.assign(Object.assign(Object.assign({}, DEFAULT_PERSONAL_SETTINGS), legacy), { address: mergeObject(DEFAULT_PERSONAL_SETTINGS.address, legacy.address), bankDetails: mergeObject(DEFAULT_PERSONAL_SETTINGS.bankDetails, legacy.bankDetails), emergencyContact: mergeObject(DEFAULT_PERSONAL_SETTINGS.emergencyContact, legacy.emergencyContact), emergencyContacts });
};
const normalizePreferencesSettings = (payload) => {
    var _a, _b;
    const source = ((_a = payload === null || payload === void 0 ? void 0 : payload.settings) === null || _a === void 0 ? void 0 : _a.preferences) || (payload === null || payload === void 0 ? void 0 : payload.settings) || {};
    return Object.assign(Object.assign(Object.assign({}, DEFAULT_PREFERENCES_SETTINGS), source), { notifications: mergeObject(DEFAULT_PREFERENCES_SETTINGS.notifications, source.notifications), emailPreferences: mergeObject(DEFAULT_PREFERENCES_SETTINGS.emailPreferences, source.emailPreferences), dashboardSettings: (_b = source.dashboardSettings) !== null && _b !== void 0 ? _b : undefined });
};
const normalizeBusinessSettings = (payload) => {
    var _a;
    const source = ((_a = payload === null || payload === void 0 ? void 0 : payload.settings) === null || _a === void 0 ? void 0 : _a.business) || (payload === null || payload === void 0 ? void 0 : payload.businessInfo) || payload || {};
    return Object.assign(Object.assign(Object.assign({}, DEFAULT_BUSINESS_SETTINGS), source), { businessLogo: source.businessLogo || source.logo || "" });
};
const defaultUserPayload = (uid, email = "") => {
    const now = Date.now();
    return {
        uid,
        email,
        firstName: "",
        lastName: "",
        phone: "",
        jobTitle: "",
        avatar: "",
        companies: [],
        currentCompanyID: "",
        settings: {
            personal: Object.assign(Object.assign({}, cloneJson(DEFAULT_PERSONAL_SETTINGS)), { email }),
            preferences: cloneJson(DEFAULT_PREFERENCES_SETTINGS),
        },
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
    };
};
const normalizeUserPayload = (uid, payload, fallbackEmail = "") => {
    const base = defaultUserPayload(uid, fallbackEmail);
    const merged = mergeObject(base, payload || {});
    merged.uid = uid;
    merged.email = String(merged.email || fallbackEmail || "");
    merged.settings = merged.settings && typeof merged.settings === "object" ? merged.settings : {};
    merged.settings.personal = normalizePersonalSettings(merged);
    merged.settings.preferences = normalizePreferencesSettings(merged);
    merged.createdAt = toMillis(merged.createdAt, base.createdAt);
    merged.updatedAt = toMillis(merged.updatedAt, Date.now());
    merged.lastLogin = toMillis(merged.lastLogin, merged.createdAt);
    return merged;
};
const normalizeUserRow = (uid, row, fallbackEmail = "") => normalizeUserPayload(uid, (row === null || row === void 0 ? void 0 : row.payload) || row, fallbackEmail);
const createUserRow = (uid, payload, existing) => {
    var _a;
    const normalized = normalizeUserPayload(uid, payload, (payload === null || payload === void 0 ? void 0 : payload.email) || (existing === null || existing === void 0 ? void 0 : existing.email) || "");
    const now = Date.now();
    return {
        id: uid,
        email: String(normalized.email || ""),
        display_name: String(normalized.displayName || normalized.firstName || uid),
        current_company_id: String(normalized.currentCompanyID || ""),
        account_status: normalized.accountStatus || "active",
        payload: normalized,
        created_at: (_a = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _a !== void 0 ? _a : toMillis(normalized.createdAt, now),
        updated_at: now,
    };
};
const createBusinessRow = (companyId, payload, existing) => {
    var _a;
    const normalized = normalizeBusinessSettings(payload);
    const now = Date.now();
    return {
        company_id: companyId,
        business_name: String(normalized.businessName || companyId),
        payload: normalized,
        created_at: (_a = existing === null || existing === void 0 ? void 0 : existing.created_at) !== null && _a !== void 0 ? _a : now,
        updated_at: now,
    };
};
const readLegacyUserPayload = async (uid) => {
    const snapshot = await admin_1.db.ref(`users/${uid}`).get();
    return snapshot.exists() ? snapshot.val() : null;
};
const readLegacyBusinessPayload = async (companyId) => {
    const [settingsSnap, businessInfoSnap] = await Promise.all([
        admin_1.db.ref(`companies/${companyId}/settings/business`).get(),
        admin_1.db.ref(`companies/${companyId}/businessInfo`).get(),
    ]);
    if (!settingsSnap.exists() && !businessInfoSnap.exists())
        return null;
    return normalizeBusinessSettings(Object.assign(Object.assign({}, (settingsSnap.val() || {})), (businessInfoSnap.val() || {})));
};
const getUserPayload = async (uid) => {
    const row = await getSingleRow("app_user_profiles", { id: uid });
    if (row)
        return normalizeUserRow(uid, row);
    const legacy = await readLegacyUserPayload(uid);
    return legacy ? normalizeUserPayload(uid, legacy) : null;
};
const upsertUserPayload = async (uid, payload) => {
    const existing = await getSingleRow("app_user_profiles", { id: uid });
    const row = createUserRow(uid, Object.assign(Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), payload), { uid }), existing);
    if (!existing)
        await insertRow("app_user_profiles", row);
    else
        await patchRow("app_user_profiles", { id: uid }, row);
    await admin_1.db.ref(`users/${uid}`).set(row.payload);
    return row.payload;
};
const patchUserPayload = async (uid, patch) => {
    const existing = (await getUserPayload(uid)) || defaultUserPayload(uid, (patch === null || patch === void 0 ? void 0 : patch.email) || "");
    const merged = normalizeUserPayload(uid, Object.assign(Object.assign(Object.assign({}, existing), patch), { settings: mergeObject(existing.settings, patch === null || patch === void 0 ? void 0 : patch.settings) }), existing.email || (patch === null || patch === void 0 ? void 0 : patch.email) || "");
    return upsertUserPayload(uid, merged);
};
const getBusinessPayload = async (companyId) => {
    const row = await getSingleRow("app_company_business_settings", { company_id: companyId });
    if (row)
        return normalizeBusinessSettings(row.payload || {});
    const legacy = await readLegacyBusinessPayload(companyId);
    return legacy || cloneJson(DEFAULT_BUSINESS_SETTINGS);
};
const upsertBusinessPayload = async (companyId, payload) => {
    const existing = await getSingleRow("app_company_business_settings", { company_id: companyId });
    const row = createBusinessRow(companyId, Object.assign(Object.assign({}, ((existing === null || existing === void 0 ? void 0 : existing.payload) || {})), payload), existing);
    if (!existing)
        await insertRow("app_company_business_settings", row);
    else
        await patchRow("app_company_business_settings", { company_id: companyId }, row);
    await Promise.all([
        admin_1.db.ref(`companies/${companyId}/settings/business`).update(row.payload),
        admin_1.db.ref(`companies/${companyId}/businessInfo`).update(Object.assign(Object.assign({}, row.payload), { logo: row.payload.businessLogo || row.payload.logo || "" })),
    ]);
    return row.payload;
};
const addCompanyMembership = (payload, company) => {
    const next = cloneJson(payload || {});
    const companyId = String((company === null || company === void 0 ? void 0 : company.companyID) || (company === null || company === void 0 ? void 0 : company.companyId) || "").trim();
    if (!companyId)
        throw Object.assign(new Error("Company companyID is required"), { status: 400 });
    next.companies = normalizeCompaniesCollection(next.companies);
    next.companies[companyId] = Object.assign(Object.assign(Object.assign({}, (next.companies[companyId] || {})), company), { companyID: companyId });
    return next;
};
const removeCompanyMembership = (payload, companyId) => {
    const next = cloneJson(payload || {});
    const normalizedCompanyId = String(companyId || "").trim();
    if (!normalizedCompanyId)
        return next;
    if (Array.isArray(next.companies)) {
        next.companies = next.companies.filter((entry) => String((entry === null || entry === void 0 ? void 0 : entry.companyID) || (entry === null || entry === void 0 ? void 0 : entry.companyId) || "").trim() !== normalizedCompanyId);
        return next;
    }
    const companies = normalizeCompaniesCollection(next.companies);
    delete companies[normalizedCompanyId];
    next.companies = companies;
    if (String(next.currentCompanyID || "").trim() === normalizedCompanyId) {
        next.currentCompanyID = "";
    }
    return next;
};
const fetchCombinedSettings = async (uid, companyId) => {
    const [userPayload, business] = await Promise.all([getUserPayload(uid), getBusinessPayload(companyId)]);
    const normalizedUser = normalizeUserPayload(uid, userPayload || {});
    return {
        personal: normalizePersonalSettings(normalizedUser),
        preferences: normalizePreferencesSettings(normalizedUser),
        business,
    };
};
const handleSettingsDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e;
    try {
        const method = String(req.method || "GET").toUpperCase();
        const permissionMatch = path.match(/^\/data\/settings\/permissions\/?$/);
        if (permissionMatch && method === "GET") {
            const uid = String(firstQueryValue((_a = req.query) === null || _a === void 0 ? void 0 : _a.uid) || user.uid).trim();
            const companyId = String(firstQueryValue((_b = req.query) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
            if (!uid || !companyId)
                throw Object.assign(new Error("uid and companyId are required"), { status: 400 });
            await assertUserAccess(user.uid, uid);
            const companyIds = companyIdsFromCollection((await admin_1.db.ref(`users/${uid}/companies`).get()).val());
            json(res, 200, { ok: true, allowed: companyIds.includes(companyId) });
            return;
        }
        const userExistsMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/exists\/?$/);
        if (userExistsMatch && method === "GET") {
            const uid = decodeURIComponent(userExistsMatch[1]);
            await assertUserAccess(user.uid, uid);
            const payload = await getUserPayload(uid);
            json(res, 200, { ok: true, exists: Boolean(payload) });
            return;
        }
        const initializeMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/initialize\/?$/);
        if (initializeMatch && method === "POST") {
            const uid = decodeURIComponent(initializeMatch[1]);
            if (uid !== user.uid)
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            const payload = defaultUserPayload(uid, String((body === null || body === void 0 ? void 0 : body.email) || user.email || ""));
            const saved = await upsertUserPayload(uid, payload);
            json(res, 200, { ok: true, row: saved });
            return;
        }
        const userAllMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/all\/?$/);
        if (userAllMatch && method === "GET") {
            const uid = decodeURIComponent(userAllMatch[1]);
            const companyId = String(firstQueryValue((_c = req.query) === null || _c === void 0 ? void 0 : _c.companyId) || "").trim();
            if (!companyId)
                throw Object.assign(new Error("companyId is required"), { status: 400 });
            await assertUserAccess(user.uid, uid);
            await assertCompanyAccess(user.uid, companyId);
            json(res, 200, { ok: true, row: await fetchCombinedSettings(uid, companyId) });
            return;
        }
        const userPersonalMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/personal\/?$/);
        if (userPersonalMatch) {
            const uid = decodeURIComponent(userPersonalMatch[1]);
            await assertUserAccess(user.uid, uid);
            if (method === "GET") {
                const payload = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
                json(res, 200, { ok: true, row: normalizePersonalSettings(payload) });
                return;
            }
            if (method === "PATCH") {
                const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
                const next = mergeObject(existing, {
                    settings: Object.assign(Object.assign({}, (existing.settings || {})), { personal: mergeObject((_d = existing.settings) === null || _d === void 0 ? void 0 : _d.personal, (body === null || body === void 0 ? void 0 : body.personalSettings) || (body === null || body === void 0 ? void 0 : body.updates) || body || {}) }),
                });
                const saved = await upsertUserPayload(uid, next);
                json(res, 200, { ok: true, row: normalizePersonalSettings(saved) });
                return;
            }
        }
        const userPreferencesMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/preferences\/?$/);
        if (userPreferencesMatch) {
            const uid = decodeURIComponent(userPreferencesMatch[1]);
            await assertUserAccess(user.uid, uid);
            if (method === "GET") {
                const payload = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
                json(res, 200, { ok: true, row: normalizePreferencesSettings(payload) });
                return;
            }
            if (method === "PATCH") {
                const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
                const next = mergeObject(existing, {
                    settings: Object.assign(Object.assign({}, (existing.settings || {})), { preferences: mergeObject((_e = existing.settings) === null || _e === void 0 ? void 0 : _e.preferences, (body === null || body === void 0 ? void 0 : body.preferencesSettings) || (body === null || body === void 0 ? void 0 : body.updates) || body || {}) }),
                });
                const saved = await upsertUserPayload(uid, next);
                json(res, 200, { ok: true, row: normalizePreferencesSettings(saved) });
                return;
            }
        }
        const currentCompanyMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/current-company\/?$/);
        if (currentCompanyMatch && method === "PUT") {
            const uid = decodeURIComponent(currentCompanyMatch[1]);
            await assertUserAccess(user.uid, uid);
            const companyId = String((body === null || body === void 0 ? void 0 : body.companyId) || (body === null || body === void 0 ? void 0 : body.companyID) || "").trim();
            const saved = await patchUserPayload(uid, { currentCompanyID: companyId });
            json(res, 200, { ok: true, row: saved });
            return;
        }
        const userCompaniesMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/companies\/?$/);
        if (userCompaniesMatch && method === "POST") {
            const uid = decodeURIComponent(userCompaniesMatch[1]);
            await assertUserAccess(user.uid, uid);
            const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
            const next = addCompanyMembership(existing, body === null || body === void 0 ? void 0 : body.company);
            const saved = await upsertUserPayload(uid, next);
            json(res, 200, { ok: true, row: saved });
            return;
        }
        const userCompanyDeleteMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/companies\/([^/]+)\/?$/);
        if (userCompanyDeleteMatch && method === "DELETE") {
            const uid = decodeURIComponent(userCompanyDeleteMatch[1]);
            await assertUserAccess(user.uid, uid);
            const companyId = decodeURIComponent(userCompanyDeleteMatch[2]);
            const existing = normalizeUserPayload(uid, (await getUserPayload(uid)) || {});
            const next = removeCompanyMembership(existing, companyId);
            const saved = await upsertUserPayload(uid, next);
            json(res, 200, { ok: true, row: saved });
            return;
        }
        const userProfileMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/profile\/?$/);
        if (userProfileMatch) {
            const uid = decodeURIComponent(userProfileMatch[1]);
            await assertUserAccess(user.uid, uid);
            if (method === "GET") {
                json(res, 200, { ok: true, row: await getUserPayload(uid) });
                return;
            }
            if (method === "PATCH") {
                const saved = await patchUserPayload(uid, (body === null || body === void 0 ? void 0 : body.updates) || body || {});
                json(res, 200, { ok: true, row: saved });
                return;
            }
        }
        const userRootMatch = path.match(/^\/data\/settings\/users\/([^/]+)\/?$/);
        if (userRootMatch) {
            const uid = decodeURIComponent(userRootMatch[1]);
            await assertUserAccess(user.uid, uid);
            if (method === "GET") {
                json(res, 200, { ok: true, row: await getUserPayload(uid) });
                return;
            }
            if (method === "PUT") {
                const payload = normalizeUserPayload(uid, (body === null || body === void 0 ? void 0 : body.userProfile) || (body === null || body === void 0 ? void 0 : body.data) || body || {});
                const saved = await upsertUserPayload(uid, payload);
                json(res, 200, { ok: true, row: saved });
                return;
            }
            if (method === "PATCH") {
                const saved = await patchUserPayload(uid, (body === null || body === void 0 ? void 0 : body.userData) || (body === null || body === void 0 ? void 0 : body.updates) || body || {});
                json(res, 200, { ok: true, row: saved });
                return;
            }
        }
        const businessLogoMatch = path.match(/^\/data\/settings\/companies\/([^/]+)\/business\/logo\/?$/);
        if (businessLogoMatch && method === "PUT") {
            const companyId = decodeURIComponent(businessLogoMatch[1]);
            await assertCompanyAccess(user.uid, companyId);
            const logoUrl = String((body === null || body === void 0 ? void 0 : body.logoUrl) || "").trim();
            const saved = await upsertBusinessPayload(companyId, {
                businessLogo: logoUrl,
                logo: logoUrl,
            });
            json(res, 200, { ok: true, row: saved });
            return;
        }
        const businessMatch = path.match(/^\/data\/settings\/companies\/([^/]+)\/business\/?$/);
        if (businessMatch) {
            const companyId = decodeURIComponent(businessMatch[1]);
            await assertCompanyAccess(user.uid, companyId);
            if (method === "GET") {
                json(res, 200, { ok: true, row: await getBusinessPayload(companyId) });
                return;
            }
            if (method === "PATCH") {
                const saved = await upsertBusinessPayload(companyId, (body === null || body === void 0 ? void 0 : body.businessSettings) || (body === null || body === void 0 ? void 0 : body.updates) || body || {});
                json(res, 200, { ok: true, row: saved });
                return;
            }
        }
        json(res, 404, { error: `Unhandled settings route: ${method} ${path}` });
    }
    catch (error) {
        json(res, (error === null || error === void 0 ? void 0 : error.status) || 500, { error: (error === null || error === void 0 ? void 0 : error.message) || "Unexpected settings data error" });
    }
};
exports.handleSettingsDataRequest = handleSettingsDataRequest;
//# sourceMappingURL=dataSettings.js.map