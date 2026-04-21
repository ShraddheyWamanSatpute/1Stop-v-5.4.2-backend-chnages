"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMailboxSecretSettingsStatus = exports.saveMailboxSecretSettings = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const mailConfigSecrets_1 = require("./mailConfigSecrets");
function parseConfigType(value) {
    if (value === "bookings" || value === "hr" || value === "stock")
        return value;
    throw new https_1.HttpsError("invalid-argument", "Invalid configType (bookings|hr|stock)");
}
async function requireCompanyMemberOrAdmin(uid, companyId) {
    var _a;
    const userSnap = await admin_1.db.ref(`users/${uid}`).get();
    const user = (userSnap.val() || {});
    const isAdmin = Boolean(user === null || user === void 0 ? void 0 : user.isAdmin);
    const isAdminStaff = Boolean((_a = user === null || user === void 0 ? void 0 : user.adminStaff) === null || _a === void 0 ? void 0 : _a.active);
    const membershipSnap = await admin_1.db.ref(`users/${uid}/companies/${companyId}`).get();
    const membership = (membershipSnap.val() || {});
    const role = typeof (membership === null || membership === void 0 ? void 0 : membership.role) === "string" ? membership.role : undefined;
    if (isAdmin || isAdminStaff)
        return { role, isAdmin, isAdminStaff };
    if (membershipSnap.exists())
        return { role, isAdmin, isAdminStaff };
    throw new https_1.HttpsError("permission-denied", "User is not a member of this company");
}
function requireOwnerOrAdmin(meta) {
    if (meta.isAdmin || meta.isAdminStaff)
        return;
    const r = String(meta.role || "").trim().toLowerCase();
    if (r === "owner")
        return;
    throw new https_1.HttpsError("permission-denied", "Owner/admin required");
}
function buildBasePath(companyId, siteId, subsiteId) {
    const resolvedSite = String(siteId || "default").trim();
    const resolvedSubsite = String(subsiteId || "default").trim();
    return `companies/${companyId}/sites/${resolvedSite}/subsites/${resolvedSubsite}`;
}
function buildConfigPath(basePath, configType) {
    if (configType === "hr")
        return `${basePath}/hrEmailConfig`;
    if (configType === "stock")
        return `${basePath}/stockEmailConfig`;
    return `${basePath}/emailConfig`;
}
exports.saveMailboxSecretSettings = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    const configType = parseConfigType((_g = req.data) === null || _g === void 0 ? void 0 : _g.configType);
    const email = String(((_h = req.data) === null || _h === void 0 ? void 0 : _h.email) || "").trim();
    const senderName = String(((_j = req.data) === null || _j === void 0 ? void 0 : _j.senderName) || "").trim();
    const appPassword = String(((_k = req.data) === null || _k === void 0 ? void 0 : _k.appPassword) || "").trim();
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    if (!email)
        throw new https_1.HttpsError("invalid-argument", "email is required");
    const meta = await requireCompanyMemberOrAdmin(uid, companyId);
    requireOwnerOrAdmin(meta);
    const basePath = buildBasePath(companyId, siteId, subsiteId);
    const configPath = buildConfigPath(basePath, configType);
    const now = Date.now();
    const existing = await (0, mailConfigSecrets_1.loadMailboxConfig)(basePath, configPath, configType);
    const effectivePassword = appPassword || existing.appPassword;
    if (!effectivePassword) {
        throw new https_1.HttpsError("invalid-argument", "appPassword is required");
    }
    const loaded = await (0, mailConfigSecrets_1.saveMailboxConfig)(basePath, configPath, configType, {
        email,
        senderName,
        appPassword: effectivePassword,
        updatedAt: now,
    });
    if (!loaded.appPassword) {
        throw new https_1.HttpsError("unknown", "Failed to persist mailbox secret");
    }
    return {
        success: true,
        email,
        senderName: senderName || undefined,
        hasAppPassword: true,
        updatedAt: now,
        configType,
    };
});
exports.getMailboxSecretSettingsStatus = (0, https_1.onCall)({ cors: true }, async (req) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const uid = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Login required");
    const companyId = String(((_b = req.data) === null || _b === void 0 ? void 0 : _b.companyId) || "").trim();
    const siteId = (_d = (_c = req.data) === null || _c === void 0 ? void 0 : _c.siteId) !== null && _d !== void 0 ? _d : null;
    const subsiteId = (_f = (_e = req.data) === null || _e === void 0 ? void 0 : _e.subsiteId) !== null && _f !== void 0 ? _f : null;
    const configType = parseConfigType((_g = req.data) === null || _g === void 0 ? void 0 : _g.configType);
    if (!companyId)
        throw new https_1.HttpsError("invalid-argument", "companyId is required");
    await requireCompanyMemberOrAdmin(uid, companyId);
    const basePath = buildBasePath(companyId, siteId, subsiteId);
    const configPath = buildConfigPath(basePath, configType);
    const loaded = await (0, mailConfigSecrets_1.loadMailboxConfig)(basePath, configPath, configType);
    return {
        email: loaded.email || undefined,
        senderName: loaded.senderName || undefined,
        hasAppPassword: Boolean(loaded.appPassword),
        updatedAt: loaded.updatedAt,
        configType,
    };
});
//# sourceMappingURL=mailboxSecretSettings.js.map