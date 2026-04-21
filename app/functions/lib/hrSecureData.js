"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrSavePayroll = exports.hrGetPayroll = exports.hrListPayrolls = exports.hrDeleteEmployee = exports.hrUpsertEmployee = exports.hrGetEmployee = exports.hrListEmployees = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const hrCrypto_1 = require("./hrCrypto");
// Field allowlists (mirror app/backend SensitiveDataService)
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
    // “Sensitive” but included to match current behavior
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
function getEmployeeKey() {
    const key = String(process.env.EMPLOYEE_DATA_KEY || "").trim();
    if (!key || key.length < 32) {
        throw new https_1.HttpsError("failed-precondition", "Missing EMPLOYEE_DATA_KEY (min 32 chars)");
    }
    return key;
}
function getPayrollKey() {
    const key = String(process.env.PAYROLL_DATA_KEY || "").trim();
    if (!key || key.length < 32) {
        throw new https_1.HttpsError("failed-precondition", "Missing PAYROLL_DATA_KEY (min 32 chars)");
    }
    return key;
}
function parseCompanyIdFromHrPath(hrPath) {
    const m = String(hrPath || "").match(/^companies\/([^/]+)\/.+\/data\/hr$/) || String(hrPath || "").match(/^companies\/([^/]+)\/data\/hr$/);
    if (!(m === null || m === void 0 ? void 0 : m[1]))
        throw new https_1.HttpsError("invalid-argument", "Invalid hrPath");
    return m[1];
}
async function requireCompanyMember(uid, companyId) {
    const snap = await admin_1.db.ref(`users/${uid}/companies/${companyId}`).get();
    if (!snap.exists())
        throw new https_1.HttpsError("permission-denied", "User is not a member of this company");
}
function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
}
function encryptObject(data, fields, masterKey) {
    const out = deepClone(data || {});
    for (const path of fields) {
        const v = (0, hrCrypto_1.getNestedValue)(out, path);
        if (v === undefined || v === null)
            continue;
        if (typeof v !== "string" && typeof v !== "number")
            continue;
        const s = String(v);
        if ((0, hrCrypto_1.isEncryptedValue)(s))
            continue;
        (0, hrCrypto_1.setNestedValue)(out, path, (0, hrCrypto_1.encryptString)(s, masterKey));
    }
    // Minimal metadata marker (optional)
    ;
    out.__encryptionMeta = { version: "v2", encryptedAt: Date.now() };
    return out;
}
function decryptObject(data, fields, masterKey) {
    const out = deepClone(data || {});
    for (const path of fields) {
        const v = (0, hrCrypto_1.getNestedValue)(out, path);
        if (v === undefined || v === null)
            continue;
        if (typeof v !== "string")
            continue;
        if (!(0, hrCrypto_1.isEncryptedValue)(v))
            continue;
        try {
            (0, hrCrypto_1.setNestedValue)(out, path, (0, hrCrypto_1.decryptString)(v, masterKey));
        }
        catch (_a) {
            // Leave field as-is for backward compatibility
        }
    }
    return out;
}
exports.hrListEmployees = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const snap = await admin_1.db.ref(`${hrPath}/employees`).get();
    const raw = snap.val() || {};
    const masterKey = getEmployeeKey();
    const employees = Object.entries(raw).map(([id, emp]) => {
        const merged = Object.assign({ id }, emp);
        return decryptObject(merged, EMPLOYEE_FIELDS, masterKey);
    });
    return { employees };
});
exports.hrGetEmployee = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const employeeId = String(((_c = req.data) === null || _c === void 0 ? void 0 : _c.employeeId) || "");
    if (!employeeId)
        throw new https_1.HttpsError("invalid-argument", "employeeId is required");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const snap = await admin_1.db.ref(`${hrPath}/employees/${employeeId}`).get();
    if (!snap.exists())
        return { employee: null };
    const masterKey = getEmployeeKey();
    const employee = decryptObject(Object.assign({ id: employeeId }, snap.val()), EMPLOYEE_FIELDS, masterKey);
    return { employee };
});
exports.hrUpsertEmployee = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const masterKey = getEmployeeKey();
    const employeeIdRaw = (_c = req.data) === null || _c === void 0 ? void 0 : _c.employeeId;
    const employeeId = employeeIdRaw ? String(employeeIdRaw) : "";
    const employee = (_d = req.data) === null || _d === void 0 ? void 0 : _d.employee;
    if (!employee || typeof employee !== "object")
        throw new https_1.HttpsError("invalid-argument", "employee is required");
    if (employeeId) {
        const currentSnap = await admin_1.db.ref(`${hrPath}/employees/${employeeId}`).get();
        const current = currentSnap.exists() ? currentSnap.val() : {};
        const merged = Object.assign(Object.assign(Object.assign({}, current), employee), { updatedAt: Date.now() });
        const toSave = encryptObject(merged, EMPLOYEE_FIELDS, masterKey);
        await admin_1.db.ref(`${hrPath}/employees/${employeeId}`).set(toSave);
        return { employeeId };
    }
    const newRef = admin_1.db.ref(`${hrPath}/employees`).push();
    const newId = newRef.key;
    if (!newId)
        throw new https_1.HttpsError("internal", "Failed to create employee");
    const toSave = encryptObject(Object.assign(Object.assign({}, employee), { createdAt: Date.now(), updatedAt: Date.now() }), EMPLOYEE_FIELDS, masterKey);
    await newRef.set(toSave);
    return { employeeId: newId };
});
exports.hrDeleteEmployee = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const employeeId = String(((_c = req.data) === null || _c === void 0 ? void 0 : _c.employeeId) || "");
    if (!employeeId)
        throw new https_1.HttpsError("invalid-argument", "employeeId is required");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    await admin_1.db.ref(`${hrPath}/employees/${employeeId}`).remove();
    return { success: true };
});
exports.hrListPayrolls = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const snap = await admin_1.db.ref(`${hrPath}/payrolls`).get();
    const raw = snap.val() || {};
    const masterKey = getPayrollKey();
    const payrolls = Object.entries(raw).map(([id, p]) => {
        const merged = Object.assign({ id }, p);
        return decryptObject(merged, PAYROLL_FIELDS, masterKey);
    });
    return { payrolls };
});
exports.hrGetPayroll = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const payrollId = String(((_c = req.data) === null || _c === void 0 ? void 0 : _c.payrollId) || "");
    if (!payrollId)
        throw new https_1.HttpsError("invalid-argument", "payrollId is required");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const snap = await admin_1.db.ref(`${hrPath}/payrolls/${payrollId}`).get();
    if (!snap.exists())
        return { payroll: null };
    const masterKey = getPayrollKey();
    const payroll = decryptObject(Object.assign({ id: payrollId }, snap.val()), PAYROLL_FIELDS, masterKey);
    return { payroll };
});
exports.hrSavePayroll = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const hrPath = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.hrPath) || "");
    const payrollId = String(((_c = req.data) === null || _c === void 0 ? void 0 : _c.payrollId) || "");
    const payroll = (_d = req.data) === null || _d === void 0 ? void 0 : _d.payroll;
    if (!payrollId)
        throw new https_1.HttpsError("invalid-argument", "payrollId is required");
    if (!payroll || typeof payroll !== "object")
        throw new https_1.HttpsError("invalid-argument", "payroll is required");
    const companyId = parseCompanyIdFromHrPath(hrPath);
    await requireCompanyMember(uid, companyId);
    const masterKey = getPayrollKey();
    const toSave = encryptObject(Object.assign(Object.assign({}, payroll), { updatedAt: Date.now() }), PAYROLL_FIELDS, masterKey);
    await admin_1.db.ref(`${hrPath}/payrolls/${payrollId}`).set(toSave);
    return { success: true };
});
//# sourceMappingURL=hrSecureData.js.map