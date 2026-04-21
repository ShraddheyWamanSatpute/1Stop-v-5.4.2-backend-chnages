"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMailboxConfig = exports.saveMailboxConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const admin_1 = require("./admin");
function getMailboxKey() {
    const raw = String(process.env.MAILBOX_ENCRYPTION_KEY || process.env.HMRC_ENCRYPTION_KEY || "").trim();
    if (!raw) {
        throw new Error("Missing MAILBOX_ENCRYPTION_KEY (or HMRC_ENCRYPTION_KEY fallback) for mailbox secret encryption");
    }
    const normalized = raw.startsWith("base64:")
        ? Buffer.from(raw.slice("base64:".length), "base64")
        : /^[A-Fa-f0-9]{64}$/.test(raw)
            ? Buffer.from(raw, "hex")
            : Buffer.from(raw, "utf8");
    if (normalized.length === 32)
        return normalized;
    return crypto_1.default.createHash("sha256").update(normalized).digest();
}
function encryptSecret(secret) {
    const iv = crypto_1.default.randomBytes(12);
    const key = getMailboxKey();
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return JSON.stringify({
        alg: "aes-256-gcm",
        iv: iv.toString("base64"),
        tag: authTag.toString("base64"),
        data: ciphertext.toString("base64"),
    });
}
function decryptSecret(payload) {
    if (typeof payload !== "string" || !payload.trim())
        return undefined;
    try {
        const parsed = JSON.parse(payload);
        if (!(parsed === null || parsed === void 0 ? void 0 : parsed.iv) || !(parsed === null || parsed === void 0 ? void 0 : parsed.tag) || !(parsed === null || parsed === void 0 ? void 0 : parsed.data))
            return undefined;
        const key = getMailboxKey();
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, Buffer.from(String(parsed.iv), "base64"));
        decipher.setAuthTag(Buffer.from(String(parsed.tag), "base64"));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(String(parsed.data), "base64")),
            decipher.final(),
        ]);
        return plaintext.toString("utf8");
    }
    catch (_a) {
        return undefined;
    }
}
function getSecretPath(basePath, configType) {
    return `${basePath}/secureMailboxSecrets/${configType}`;
}
async function saveMailboxConfig(basePath, configPath, configType, input) {
    const now = input.updatedAt || Date.now();
    await Promise.all([
        admin_1.db.ref(configPath).update({
            email: input.email,
            senderName: input.senderName || null,
            secretStorage: "encrypted_server_side",
            updatedAt: now,
            appPassword: null,
        }),
        admin_1.db.ref(getSecretPath(basePath, configType)).update({
            appPassword: encryptSecret(input.appPassword),
            updatedAt: now,
        }),
    ]);
    return {
        email: input.email,
        senderName: input.senderName || undefined,
        appPassword: input.appPassword,
        updatedAt: now,
    };
}
exports.saveMailboxConfig = saveMailboxConfig;
async function loadMailboxConfig(basePath, configPath, configType) {
    const [publicSnap, secretSnap] = await Promise.all([
        admin_1.db.ref(configPath).get(),
        admin_1.db.ref(getSecretPath(basePath, configType)).get(),
    ]);
    const publicConfig = (publicSnap.val() || {});
    const secretRecord = (secretSnap.val() || {});
    let appPassword = decryptSecret(secretRecord.appPassword);
    let migratedFromPlaintext = false;
    if (!appPassword && typeof publicConfig.appPassword === "string" && publicConfig.appPassword.trim()) {
        appPassword = publicConfig.appPassword.trim();
        migratedFromPlaintext = true;
        await Promise.all([
            admin_1.db.ref(getSecretPath(basePath, configType)).update({
                appPassword: encryptSecret(appPassword),
                updatedAt: Date.now(),
            }),
            admin_1.db.ref(configPath).update({
                appPassword: null,
                secretStorage: "encrypted_server_side",
                updatedAt: publicConfig.updatedAt || Date.now(),
            }),
        ]);
    }
    return {
        email: typeof publicConfig.email === "string" ? publicConfig.email.trim() : undefined,
        senderName: typeof publicConfig.senderName === "string" ? publicConfig.senderName.trim() : undefined,
        updatedAt: typeof publicConfig.updatedAt === "number" ? publicConfig.updatedAt : undefined,
        appPassword,
        migratedFromPlaintext,
    };
}
exports.loadMailboxConfig = loadMailboxConfig;
//# sourceMappingURL=mailConfigSecrets.js.map