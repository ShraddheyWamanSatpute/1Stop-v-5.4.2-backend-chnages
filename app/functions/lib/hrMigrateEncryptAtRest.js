"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrMigrateEncryptAtRestV2 = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const admin_1 = require("./admin");
const hrCrypto_1 = require("./hrCrypto");
// Mirror allowlists from hrSecureData
const EMPLOYEE_FIELDS = [
    "nationalInsuranceNumber",
    "dateOfBirth",
    "bankDetails.accountNumber",
    "bankDetails.routingNumber",
    "bankDetails.iban",
    "bankDetails.swift",
    "taxInformation.taxId",
    "taxCode",
    "p45Data.previousEmployerPAYERef",
    "p45Data.taxCodeAtLeaving",
    "p45Data.payToDate",
    "p45Data.taxToDate",
    "pensionSchemeReference",
    "email",
    "phone",
    "emergencyContact.phone",
    "address.street",
    "address.zipCode",
    "salary",
    "hourlyRate",
];
const PAYROLL_FIELDS = [
    "grossPay",
    "netPay",
    "taxDeductions",
    "employeeNIDeductions",
    "employerNIContributions",
    "studentLoanDeductions",
    "postgraduateLoanDeductions",
    "employeePensionDeductions",
    "employerPensionContributions",
    "ytdData.grossPayYTD",
    "ytdData.taxablePayYTD",
    "ytdData.taxPaidYTD",
    "ytdData.employeeNIPaidYTD",
    "ytdData.employerNIPaidYTD",
];
function json(res, status, body) {
    res.set("Cache-Control", "no-store");
    res.status(status).json(body);
}
function getBearerToken(req) {
    var _a, _b;
    const h = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization) || "");
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
async function requireAdminOrOwner(decoded, companyId) {
    var _a;
    // Allow global admin
    const userSnap = await admin_1.db.ref(`users/${decoded.uid}`).get();
    const user = (userSnap.val() || {});
    if (Boolean(user === null || user === void 0 ? void 0 : user.isAdmin) || Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active))
        return;
    // Allow company owner
    const membershipSnap = await admin_1.db.ref(`users/${decoded.uid}/companies/${companyId}`).get();
    const membership = (membershipSnap.val() || {});
    const role = String((membership === null || membership === void 0 ? void 0 : membership.role) || "").trim().toLowerCase();
    if (role === "owner")
        return;
    throw Object.assign(new Error("Forbidden"), { status: 403 });
}
function getEmployeeKey() {
    const key = String(process.env.EMPLOYEE_DATA_KEY || "").trim();
    if (!key || key.length < 32)
        throw new Error("Missing EMPLOYEE_DATA_KEY (min 32 chars)");
    return key;
}
function getPayrollKey() {
    const key = String(process.env.PAYROLL_DATA_KEY || "").trim();
    if (!key || key.length < 32)
        throw new Error("Missing PAYROLL_DATA_KEY (min 32 chars)");
    return key;
}
function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
}
function encryptObject(data, fields, key) {
    const out = deepClone(data || {});
    let changed = false;
    let encryptedFields = 0;
    for (const path of fields) {
        const v = (0, hrCrypto_1.getNestedValue)(out, path);
        if (v === undefined || v === null)
            continue;
        if (typeof v !== "string" && typeof v !== "number")
            continue;
        const s = String(v);
        if ((0, hrCrypto_1.isEncryptedValue)(s))
            continue;
        const enc = (0, hrCrypto_1.encryptString)(s, key);
        (0, hrCrypto_1.setNestedValue)(out, path, enc);
        changed = true;
        encryptedFields++;
    }
    if (changed) {
        ;
        out.__encryptionMeta = { version: "v2", encryptedAt: Date.now(), migrated: true };
    }
    return { out, changed, encryptedFields };
}
async function listHrPaths(companyId) {
    const paths = [];
    const companyHr = `companies/${companyId}/data/hr`;
    paths.push(companyHr);
    const sitesSnap = await admin_1.db.ref(`companies/${companyId}/sites`).get();
    const sites = (sitesSnap.val() || {});
    const siteIds = Object.keys(sites);
    for (const siteId of siteIds) {
        paths.push(`companies/${companyId}/sites/${siteId}/data/hr`);
        const subsitesSnap = await admin_1.db.ref(`companies/${companyId}/sites/${siteId}/subsites`).get();
        const subsites = (subsitesSnap.val() || {});
        const subsiteIds = Object.keys(subsites);
        for (const subsiteId of subsiteIds) {
            paths.push(`companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/hr`);
        }
    }
    // De-dup while preserving order
    return Array.from(new Set(paths));
}
async function migrateNode(params) {
    const { baseHrPath, nodeName, fields, key, dryRun } = params;
    const nodePath = `${baseHrPath}/${nodeName}`;
    const snap = await admin_1.db.ref(nodePath).get();
    if (!snap.exists()) {
        return { nodePath, scanned: 0, updated: 0, encryptedFields: 0, skipped: 0 };
    }
    const raw = (snap.val() || {});
    const ids = Object.keys(raw);
    let updated = 0;
    let encryptedFields = 0;
    let skipped = 0;
    // Batch multi-location updates to avoid huge payloads
    const batch = {};
    const FLUSH_AT = 200;
    const flush = async () => {
        const keys = Object.keys(batch);
        if (!keys.length)
            return;
        if (!dryRun) {
            await admin_1.db.ref().update(batch);
        }
        keys.forEach((k) => delete batch[k]);
    };
    for (const id of ids) {
        const record = raw[id];
        if (!record || typeof record !== "object") {
            skipped++;
            continue;
        }
        const { out, changed, encryptedFields: ef } = encryptObject(record, fields, key);
        encryptedFields += ef;
        if (!changed) {
            skipped++;
            continue;
        }
        batch[`${nodePath}/${id}`] = out;
        updated++;
        if (updated % FLUSH_AT === 0) {
            await flush();
        }
    }
    await flush();
    return { nodePath, scanned: ids.length, updated, encryptedFields, skipped };
}
/**
 * One-time migration: encrypt existing HR employees + payrolls at rest.
 *
 * Request:
 * - Authorization: Bearer <Firebase ID token>
 * - POST JSON: { companyId: string, dryRun?: boolean, includeLegacyPayroll?: boolean }
 *
 * One-time behavior:
 * - Writes marker at `companies/<companyId>/data/hr/__migrations/encryptAtRestV2`
 * - If marker exists, returns 409 unless `dryRun=true`
 */
exports.hrMigrateEncryptAtRestV2 = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c;
    try {
        if (req.method !== "POST")
            return json(res, 405, { ok: false, error: "Use POST" });
        const token = getBearerToken(req);
        if (!token)
            return json(res, 401, { ok: false, error: "Missing Authorization Bearer token" });
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token).catch(() => null);
        if (!(decoded === null || decoded === void 0 ? void 0 : decoded.uid))
            return json(res, 401, { ok: false, error: "Invalid token" });
        const companyId = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || "").trim();
        if (!companyId)
            return json(res, 400, { ok: false, error: "companyId is required" });
        const dryRun = Boolean((_b = req.body) === null || _b === void 0 ? void 0 : _b.dryRun);
        const includeLegacyPayroll = Boolean((_c = req.body) === null || _c === void 0 ? void 0 : _c.includeLegacyPayroll);
        await requireAdminOrOwner(decoded, companyId);
        const markerPath = `companies/${companyId}/data/hr/__migrations/encryptAtRestV2`;
        const markerSnap = await admin_1.db.ref(markerPath).get();
        if (markerSnap.exists() && !dryRun) {
            return json(res, 409, { ok: false, error: "Migration already completed", marker: markerSnap.val() });
        }
        const employeeKey = getEmployeeKey();
        const payrollKey = getPayrollKey();
        const hrPaths = await listHrPaths(companyId);
        const startedAt = Date.now();
        const perPath = [];
        let totals = { scanned: 0, updated: 0, encryptedFields: 0, skipped: 0 };
        for (const hrPath of hrPaths) {
            const emp = await migrateNode({
                baseHrPath: hrPath,
                nodeName: "employees",
                fields: EMPLOYEE_FIELDS,
                key: employeeKey,
                dryRun,
            });
            const pay = await migrateNode({
                baseHrPath: hrPath,
                nodeName: "payrolls",
                fields: PAYROLL_FIELDS,
                key: payrollKey,
                dryRun,
            });
            let legacy = null;
            if (includeLegacyPayroll) {
                legacy = await migrateNode({
                    baseHrPath: hrPath,
                    nodeName: "payroll",
                    fields: PAYROLL_FIELDS,
                    key: payrollKey,
                    dryRun,
                });
            }
            const rollup = [emp, pay, legacy].filter(Boolean);
            for (const r of rollup) {
                totals.scanned += r.scanned;
                totals.updated += r.updated;
                totals.encryptedFields += r.encryptedFields;
                totals.skipped += r.skipped;
            }
            perPath.push({ hrPath, employees: emp, payrolls: pay, legacyPayroll: legacy });
        }
        const finishedAt = Date.now();
        if (!dryRun) {
            await admin_1.db.ref(markerPath).set({
                completedAt: finishedAt,
                durationMs: finishedAt - startedAt,
                totals,
                performedBy: { uid: decoded.uid, email: decoded.email || null },
                includeLegacyPayroll,
            });
        }
        return json(res, 200, {
            ok: true,
            dryRun,
            companyId,
            totals,
            durationMs: finishedAt - startedAt,
            hrPathsCount: hrPaths.length,
            includeLegacyPayroll,
            perPath,
        });
    }
    catch (e) {
        const status = typeof (e === null || e === void 0 ? void 0 : e.status) === "number" ? e.status : 500;
        return json(res, status, { ok: false, error: String((e === null || e === void 0 ? void 0 : e.message) || e) });
    }
});
//# sourceMappingURL=hrMigrateEncryptAtRest.js.map