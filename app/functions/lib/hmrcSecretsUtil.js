"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = exports.encryptSecret = exports.getHMRCEncryptionKey = exports.findHMRCLevel = exports.getHMRCSecretsPath = exports.getHMRCSettingsPath = void 0;
const https_1 = require("firebase-functions/v2/https");
const hrCrypto_1 = require("./hrCrypto");
const admin_1 = require("./admin");
function getHMRCSettingsPath(params) {
    const { companyId, siteId, subsiteId, level } = params;
    if (level === "subsite" && siteId && subsiteId) {
        return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSettings`;
    }
    if (level === "site" && siteId) {
        return `companies/${companyId}/sites/${siteId}/data/company/hmrcSettings`;
    }
    return `companies/${companyId}/data/company/hmrcSettings`;
}
exports.getHMRCSettingsPath = getHMRCSettingsPath;
function getHMRCSecretsPath(params) {
    const { companyId, siteId, subsiteId, level } = params;
    if (level === "subsite" && siteId && subsiteId) {
        return `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/company/hmrcSecrets`;
    }
    if (level === "site" && siteId) {
        return `companies/${companyId}/sites/${siteId}/data/company/hmrcSecrets`;
    }
    return `companies/${companyId}/data/company/hmrcSecrets`;
}
exports.getHMRCSecretsPath = getHMRCSecretsPath;
async function findHMRCLevel(companyId, siteId, subsiteId) {
    const candidates = [];
    if (siteId && subsiteId)
        candidates.push({ level: "subsite", path: getHMRCSettingsPath({ companyId, siteId, subsiteId, level: "subsite" }) });
    if (siteId)
        candidates.push({ level: "site", path: getHMRCSettingsPath({ companyId, siteId, level: "site" }) });
    candidates.push({ level: "company", path: getHMRCSettingsPath({ companyId, level: "company" }) });
    for (const c of candidates) {
        const snap = await admin_1.db.ref(c.path).get();
        if (snap.exists())
            return c.level;
    }
    return null;
}
exports.findHMRCLevel = findHMRCLevel;
function getHMRCEncryptionKey() {
    const key = String(process.env.HMRC_ENCRYPTION_KEY || "").trim();
    if (!key || key.length < 32) {
        throw new https_1.HttpsError("failed-precondition", "Missing HMRC_ENCRYPTION_KEY (min 32 chars)");
    }
    return key;
}
exports.getHMRCEncryptionKey = getHMRCEncryptionKey;
function encryptSecret(value, key) {
    if (!value)
        return value;
    if ((0, hrCrypto_1.isEncryptedValue)(value))
        return value;
    return (0, hrCrypto_1.encryptString)(value, key);
}
exports.encryptSecret = encryptSecret;
function decryptSecret(value, key) {
    if (!value)
        return undefined;
    if (!(0, hrCrypto_1.isEncryptedValue)(value))
        return value;
    return (0, hrCrypto_1.decryptString)(value, key);
}
exports.decryptSecret = decryptSecret;
//# sourceMappingURL=hmrcSecretsUtil.js.map