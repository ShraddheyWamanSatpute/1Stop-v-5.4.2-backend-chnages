"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFinanceDataRequest = void 0;
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
const parseFinanceScope = (rawBasePath) => {
    const basePath = normalizeBasePath(rawBasePath);
    const match = basePath.match(/^companies\/([^/]+)(?:\/sites\/([^/]+))?(?:\/subsites\/([^/]+))?\/data\/finance$/i);
    if (!match) {
        throw Object.assign(new Error("Invalid finance basePath"), { status: 400 });
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
        throw Object.assign(new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Finance provider"), { status: 500 });
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
const createEntityRow = (scope, id, payload, opts) => {
    var _a, _b, _c, _d;
    const cleaned = stripUndefinedDeep(payload);
    return {
        id,
        company_id: scope.companyId,
        site_id: scope.siteId,
        subsite_id: scope.subsiteId,
        base_path: scope.basePath,
        name: String((opts === null || opts === void 0 ? void 0 : opts.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.name) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.billNumber) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.transactionNumber) || id),
        status: (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.status) !== null && _a !== void 0 ? _a : cleaned === null || cleaned === void 0 ? void 0 : cleaned.status) !== null && _b !== void 0 ? _b : null,
        code: (_d = (_c = opts === null || opts === void 0 ? void 0 : opts.code) !== null && _c !== void 0 ? _c : cleaned === null || cleaned === void 0 ? void 0 : cleaned.code) !== null && _d !== void 0 ? _d : null,
        payload: Object.assign(Object.assign({}, cleaned), { id }),
        created_at: Date.parse((cleaned === null || cleaned === void 0 ? void 0 : cleaned.createdAt) || (cleaned === null || cleaned === void 0 ? void 0 : cleaned.created_at) || new Date().toISOString()),
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
const upsertAccount = async (scope, id, payload) => upsertEntity("finance_accounts", scope, id, payload, {
    name: payload === null || payload === void 0 ? void 0 : payload.name,
    status: (payload === null || payload === void 0 ? void 0 : payload.isArchived) ? "archived" : "active",
    code: (payload === null || payload === void 0 ? void 0 : payload.code) || null,
});
const upsertTransaction = async (scope, id, payload) => upsertEntity("finance_transactions", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.description) || (payload === null || payload === void 0 ? void 0 : payload.transactionNumber) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || null,
    code: (payload === null || payload === void 0 ? void 0 : payload.transactionNumber) || null,
});
const upsertBill = async (scope, id, payload) => upsertEntity("finance_bills", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.supplierName) || (payload === null || payload === void 0 ? void 0 : payload.billNumber) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || null,
    code: (payload === null || payload === void 0 ? void 0 : payload.billNumber) || null,
});
const upsertContact = async (scope, id, payload) => upsertEntity("finance_contacts", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.name) || (payload === null || payload === void 0 ? void 0 : payload.companyName) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.isArchived) ? "archived" : (payload === null || payload === void 0 ? void 0 : payload.isActive) === false ? "inactive" : "active",
    code: null,
});
const upsertBudget = async (scope, id, payload) => upsertEntity("finance_budgets", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.name) || (payload === null || payload === void 0 ? void 0 : payload.category) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.status) || null,
    code: null,
});
const normalizeJournalLine = (journalId, line, index) => (Object.assign(Object.assign({}, (stripUndefinedDeep(line) || {})), { id: String((line === null || line === void 0 ? void 0 : line.id) || `${journalId}-line-${index + 1}`), journal_id: journalId, line_number: Number((line === null || line === void 0 ? void 0 : line.line_number) || index + 1), debit: Number((line === null || line === void 0 ? void 0 : line.debit) || 0), credit: Number((line === null || line === void 0 ? void 0 : line.credit) || 0), created_at: typeof (line === null || line === void 0 ? void 0 : line.created_at) === "string" && line.created_at
        ? line.created_at
        : new Date().toISOString() }));
const normalizeJournalPayload = (id, payload, existing) => {
    const merged = stripUndefinedDeep(Object.assign(Object.assign(Object.assign({}, (existing || {})), (payload || {})), { id }));
    const journalLines = Array.isArray(merged === null || merged === void 0 ? void 0 : merged.journal_lines)
        ? merged.journal_lines.map((line, index) => normalizeJournalLine(id, line, index))
        : [];
    const totalDebit = journalLines.reduce((sum, line) => sum + Number((line === null || line === void 0 ? void 0 : line.debit) || 0), 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + Number((line === null || line === void 0 ? void 0 : line.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw Object.assign(new Error(`Journal is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`), {
            status: 400,
        });
    }
    return Object.assign(Object.assign({}, merged), { journal_number: String((merged === null || merged === void 0 ? void 0 : merged.journal_number) || `JRN-${Date.now()}`), journal_lines: journalLines, total_debit: totalDebit, total_credit: totalCredit, is_balanced: true, created_at: typeof (merged === null || merged === void 0 ? void 0 : merged.created_at) === "string" && merged.created_at
            ? merged.created_at
            : new Date().toISOString(), updated_at: new Date().toISOString() });
};
const upsertJournal = async (scope, id, payload) => {
    const existing = await getSingleRow("finance_journals", { id, base_path: scope.basePath });
    const normalized = normalizeJournalPayload(id, payload, (existing === null || existing === void 0 ? void 0 : existing.payload) || {});
    return upsertEntity("finance_journals", scope, id, normalized, {
        name: (normalized === null || normalized === void 0 ? void 0 : normalized.description) || (normalized === null || normalized === void 0 ? void 0 : normalized.journal_number) || id,
        status: (normalized === null || normalized === void 0 ? void 0 : normalized.status) || "draft",
        code: (normalized === null || normalized === void 0 ? void 0 : normalized.journal_number) || null,
    });
};
const upsertDimension = async (scope, id, payload) => upsertEntity("finance_dimensions", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.name) || id,
    status: (payload === null || payload === void 0 ? void 0 : payload.is_active) === false ? "inactive" : "active",
    code: (payload === null || payload === void 0 ? void 0 : payload.code) || null,
});
const upsertPeriodLock = async (scope, id, payload) => upsertEntity("finance_period_locks", scope, id, payload, {
    name: `${(payload === null || payload === void 0 ? void 0 : payload.period_type) || "period"}:${(payload === null || payload === void 0 ? void 0 : payload.period_start) || id}`,
    status: (payload === null || payload === void 0 ? void 0 : payload.is_locked) ? "locked" : "open",
    code: null,
});
const upsertOpeningBalance = async (scope, id, payload) => upsertEntity("finance_opening_balances", scope, id, payload, {
    name: (payload === null || payload === void 0 ? void 0 : payload.account_id) || id,
    status: "active",
    code: null,
});
const getJournalOrThrow = async (scope, journalId) => {
    const row = await getSingleRow("finance_journals", { id: journalId, base_path: scope.basePath });
    if (!(row === null || row === void 0 ? void 0 : row.payload))
        throw Object.assign(new Error("Journal not found"), { status: 404 });
    return row;
};
const fetchAccountById = async (scope, accountId) => getSingleRow("finance_accounts", { id: accountId, base_path: scope.basePath });
const applyJournalToAccounts = async (scope, journal) => {
    const updates = await Promise.all(((journal === null || journal === void 0 ? void 0 : journal.journal_lines) || []).map(async (line) => {
        const accountRow = await fetchAccountById(scope, String((line === null || line === void 0 ? void 0 : line.account_id) || ""));
        if (!(accountRow === null || accountRow === void 0 ? void 0 : accountRow.payload))
            return null;
        const account = Object.assign(Object.assign({}, (accountRow.payload || {})), { id: accountRow.id });
        const debit = Number((line === null || line === void 0 ? void 0 : line.debit) || 0);
        const credit = Number((line === null || line === void 0 ? void 0 : line.credit) || 0);
        const balanceChange = ["asset", "expense"].includes(String(account.type || ""))
            ? debit - credit
            : credit - debit;
        return {
            id: accountRow.id,
            payload: Object.assign(Object.assign({}, account), { balance: Number(account.balance || 0) + balanceChange, updatedAt: new Date().toISOString() }),
        };
    }));
    await Promise.all(updates
        .filter(Boolean)
        .map((entry) => upsertAccount(scope, String((entry === null || entry === void 0 ? void 0 : entry.id) || ""), (entry === null || entry === void 0 ? void 0 : entry.payload) || {})));
};
const createJournalTransaction = async (scope, journalId, journal) => {
    const transactionId = (0, crypto_1.randomUUID)();
    return upsertTransaction(scope, transactionId, {
        transactionNumber: (journal === null || journal === void 0 ? void 0 : journal.journal_number) || `JRN-${Date.now()}`,
        date: journal === null || journal === void 0 ? void 0 : journal.date,
        description: journal === null || journal === void 0 ? void 0 : journal.description,
        reference: journal === null || journal === void 0 ? void 0 : journal.reference,
        type: "adjustment",
        status: "completed",
        entries: ((journal === null || journal === void 0 ? void 0 : journal.journal_lines) || []).map((line) => ({
            accountId: line === null || line === void 0 ? void 0 : line.account_id,
            amount: Number((line === null || line === void 0 ? void 0 : line.debit) || 0) > 0 ? Number((line === null || line === void 0 ? void 0 : line.debit) || 0) : Number((line === null || line === void 0 ? void 0 : line.credit) || 0),
            type: Number((line === null || line === void 0 ? void 0 : line.debit) || 0) > 0 ? "debit" : "credit",
            description: (line === null || line === void 0 ? void 0 : line.description) || (journal === null || journal === void 0 ? void 0 : journal.description),
            debit: Number((line === null || line === void 0 ? void 0 : line.debit) || 0),
            credit: Number((line === null || line === void 0 ? void 0 : line.credit) || 0),
            transactionId: journalId,
        })),
        totalAmount: Number((journal === null || journal === void 0 ? void 0 : journal.total_debit) || 0),
        currency: (journal === null || journal === void 0 ? void 0 : journal.currency) || "GBP",
        sourceDocument: {
            type: "manual",
            id: journalId,
        },
        isReconciled: false,
        createdBy: (journal === null || journal === void 0 ? void 0 : journal.created_by) || "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
};
const handleFinanceDataRequest = async ({ req, res, path, body, user }) => {
    var _a, _b, _c, _d, _e;
    const method = String(req.method || "GET").toUpperCase();
    const pathname = String(path || "").replace(/\/+$/, "");
    const send = (status, payload) => json(res, status, payload);
    const getQuery = (name) => { var _a; return String(((_a = req.query) === null || _a === void 0 ? void 0 : _a[name]) || "").trim(); };
    const entityMap = {
        accounts: {
            table: "finance_accounts",
            list: (scope) => listRows("finance_accounts", scope.basePath),
            upsert: upsertAccount,
        },
        transactions: {
            table: "finance_transactions",
            list: (scope) => listRows("finance_transactions", scope.basePath),
            upsert: upsertTransaction,
        },
        bills: {
            table: "finance_bills",
            list: (scope) => listRows("finance_bills", scope.basePath),
            upsert: upsertBill,
        },
        contacts: {
            table: "finance_contacts",
            list: (scope) => listRows("finance_contacts", scope.basePath),
            upsert: upsertContact,
        },
        budgets: {
            table: "finance_budgets",
            list: (scope) => listRows("finance_budgets", scope.basePath),
            upsert: upsertBudget,
        },
        journals: {
            table: "finance_journals",
            list: (scope) => listRows("finance_journals", scope.basePath),
            upsert: upsertJournal,
        },
        dimensions: {
            table: "finance_dimensions",
            list: (scope) => listRows("finance_dimensions", scope.basePath),
            upsert: upsertDimension,
        },
        periodLocks: {
            table: "finance_period_locks",
            list: (scope) => listRows("finance_period_locks", scope.basePath),
            upsert: upsertPeriodLock,
        },
        openingBalances: {
            table: "finance_opening_balances",
            list: (scope) => listRows("finance_opening_balances", scope.basePath),
            upsert: upsertOpeningBalance,
        },
    };
    const listMatch = pathname.match(/^\/data\/finance\/(accounts|transactions|bills|contacts|budgets|journals|dimensions|periodLocks|openingBalances)$/);
    if (listMatch && method === "GET") {
        const scope = parseFinanceScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        send(200, { ok: true, rows: await entityMap[entity].list(scope) });
        return;
    }
    if (listMatch && method === "POST") {
        const scope = parseFinanceScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = listMatch[1];
        const id = String(((_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.id) || (0, crypto_1.randomUUID)());
        const row = await entityMap[entity].upsert(scope, id, (body === null || body === void 0 ? void 0 : body.data) || {});
        if (entity === "openingBalances" && (row === null || row === void 0 ? void 0 : row.account_id)) {
            const account = await fetchAccountById(scope, String(row.account_id));
            if (account === null || account === void 0 ? void 0 : account.payload) {
                await upsertAccount(scope, String(account.id), Object.assign(Object.assign({}, (account.payload || {})), { opening_balance: Number(row.balance || 0), balance: Number(row.balance || 0), updatedAt: new Date().toISOString() }));
            }
        }
        send(200, { ok: true, id, row });
        return;
    }
    const itemMatch = pathname.match(/^\/data\/finance\/(accounts|bills|contacts|budgets|journals|dimensions|periodLocks|openingBalances)\/([^/]+)$/);
    if (itemMatch && method === "PATCH") {
        const scope = parseFinanceScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        const row = await entityMap[entity].upsert(scope, id, (body === null || body === void 0 ? void 0 : body.updates) || {});
        if (entity === "openingBalances" && (row === null || row === void 0 ? void 0 : row.account_id) && ((_b = body === null || body === void 0 ? void 0 : body.updates) === null || _b === void 0 ? void 0 : _b.balance) !== undefined) {
            const account = await fetchAccountById(scope, String(row.account_id));
            if (account === null || account === void 0 ? void 0 : account.payload) {
                await upsertAccount(scope, String(account.id), Object.assign(Object.assign({}, (account.payload || {})), { opening_balance: Number(((_c = body === null || body === void 0 ? void 0 : body.updates) === null || _c === void 0 ? void 0 : _c.balance) || 0), balance: Number(((_d = body === null || body === void 0 ? void 0 : body.updates) === null || _d === void 0 ? void 0 : _d.balance) || 0), updatedAt: new Date().toISOString() }));
            }
        }
        send(200, { ok: true });
        return;
    }
    if (itemMatch && method === "DELETE") {
        const scope = parseFinanceScope(getQuery("basePath"));
        await assertCompanyAccess(user.uid, scope.companyId);
        const entity = itemMatch[1];
        const id = decodeURIComponent(itemMatch[2]);
        const existing = entity === "openingBalances" ? await getSingleRow(entityMap[entity].table, { id, base_path: scope.basePath }) : null;
        await deleteRow(entityMap[entity].table, { id, base_path: scope.basePath });
        if (entity === "openingBalances" && ((_e = existing === null || existing === void 0 ? void 0 : existing.payload) === null || _e === void 0 ? void 0 : _e.account_id)) {
            const account = await fetchAccountById(scope, String(existing.payload.account_id));
            if (account === null || account === void 0 ? void 0 : account.payload) {
                await upsertAccount(scope, String(account.id), Object.assign(Object.assign({}, (account.payload || {})), { opening_balance: 0, updatedAt: new Date().toISOString() }));
            }
        }
        send(200, { ok: true });
        return;
    }
    const approveMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/approve$/);
    if (approveMatch && method === "PATCH") {
        const scope = parseFinanceScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const journalId = decodeURIComponent(approveMatch[1]);
        const current = await getJournalOrThrow(scope, journalId);
        const row = await upsertJournal(scope, journalId, Object.assign(Object.assign({}, ((current === null || current === void 0 ? void 0 : current.payload) || {})), { status: "approved", approved_by: body === null || body === void 0 ? void 0 : body.approvedBy, approved_at: new Date().toISOString() }));
        send(200, { ok: true, row });
        return;
    }
    const postMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/post$/);
    if (postMatch && method === "PATCH") {
        const scope = parseFinanceScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const journalId = decodeURIComponent(postMatch[1]);
        const current = await getJournalOrThrow(scope, journalId);
        const journal = current.payload || {};
        if (!["draft", "approved"].includes(String((journal === null || journal === void 0 ? void 0 : journal.status) || ""))) {
            throw Object.assign(new Error(`Cannot post journal with status: ${(journal === null || journal === void 0 ? void 0 : journal.status) || "unknown"}`), { status: 400 });
        }
        const periodLocks = await listRows("finance_period_locks", scope.basePath);
        const journalTime = new Date(String((journal === null || journal === void 0 ? void 0 : journal.date) || "")).getTime();
        const isLocked = periodLocks.some((lock) => {
            if (!(lock === null || lock === void 0 ? void 0 : lock.is_locked))
                return false;
            const start = new Date(String((lock === null || lock === void 0 ? void 0 : lock.period_start) || "")).getTime();
            const end = new Date(String((lock === null || lock === void 0 ? void 0 : lock.period_end) || "")).getTime();
            return Number.isFinite(journalTime) && journalTime >= start && journalTime <= end;
        });
        if (isLocked) {
            throw Object.assign(new Error("Cannot post journal to a locked period"), { status: 400 });
        }
        await createJournalTransaction(scope, journalId, journal);
        await applyJournalToAccounts(scope, journal);
        const row = await upsertJournal(scope, journalId, Object.assign(Object.assign({}, journal), { status: "posted", posted_by: body === null || body === void 0 ? void 0 : body.postedBy, posted_at: new Date().toISOString() }));
        send(200, { ok: true, row });
        return;
    }
    const reverseMatch = pathname.match(/^\/data\/finance\/journals\/([^/]+)\/reverse$/);
    if (reverseMatch && method === "POST") {
        const scope = parseFinanceScope(String((body === null || body === void 0 ? void 0 : body.basePath) || ""));
        await assertCompanyAccess(user.uid, scope.companyId);
        const journalId = decodeURIComponent(reverseMatch[1]);
        const current = await getJournalOrThrow(scope, journalId);
        const original = current.payload || {};
        const reversalId = (0, crypto_1.randomUUID)();
        const reversalDate = String((body === null || body === void 0 ? void 0 : body.reversalDate) || new Date().toISOString().split("T")[0]);
        const reversal = await upsertJournal(scope, reversalId, {
            entity_id: original === null || original === void 0 ? void 0 : original.entity_id,
            journal_number: `REV-${(original === null || original === void 0 ? void 0 : original.journal_number) || journalId}`,
            source: "reversal",
            date: reversalDate,
            description: `Reversal of ${(original === null || original === void 0 ? void 0 : original.journal_number) || journalId}`,
            reference: original === null || original === void 0 ? void 0 : original.reference,
            status: "draft",
            journal_lines: ((original === null || original === void 0 ? void 0 : original.journal_lines) || []).map((line, index) => (Object.assign(Object.assign({}, line), { id: `${reversalId}-line-${index + 1}`, journal_id: reversalId, debit: Number((line === null || line === void 0 ? void 0 : line.credit) || 0), credit: Number((line === null || line === void 0 ? void 0 : line.debit) || 0), created_at: new Date().toISOString() }))),
            total_debit: Number((original === null || original === void 0 ? void 0 : original.total_credit) || 0),
            total_credit: Number((original === null || original === void 0 ? void 0 : original.total_debit) || 0),
            currency: (original === null || original === void 0 ? void 0 : original.currency) || "GBP",
            is_recurring: false,
            created_by: (body === null || body === void 0 ? void 0 : body.reversedBy) || "system",
            reverses_journal_id: journalId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        await upsertJournal(scope, journalId, Object.assign(Object.assign({}, original), { status: "reversed", reversed_by: body === null || body === void 0 ? void 0 : body.reversedBy, reversed_at: new Date().toISOString(), reversed_by_journal_id: reversalId, reversal_journal_id: reversalId }));
        send(200, { ok: true, row: reversal });
        return;
    }
    throw Object.assign(new Error("Not found"), { status: 404 });
};
exports.handleFinanceDataRequest = handleFinanceDataRequest;
//# sourceMappingURL=dataFinance.js.map