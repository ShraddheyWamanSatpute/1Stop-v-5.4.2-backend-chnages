"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setNestedValue = exports.getNestedValue = exports.decryptString = exports.encryptString = exports.isEncryptedValue = void 0;
const crypto_1 = require("crypto");
const ENCRYPTION_VERSION = 2;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERS = 100000;
const ENC_PREFIX = "ENC:";
function deriveKeyV2(masterKey, salt) {
    // 32 bytes = AES-256 key length
    return (0, crypto_1.pbkdf2Sync)(masterKey, salt, PBKDF2_ITERS, 32, "sha256");
}
function deriveKeyLegacy(masterKey) {
    const salt = Buffer.from("hmrc-compliance-salt-v1", "utf8");
    return (0, crypto_1.pbkdf2Sync)(masterKey, salt, PBKDF2_ITERS, 32, "sha256");
}
function isEncryptedValue(value) {
    return typeof value === "string" && (value.startsWith(ENC_PREFIX) || value.startsWith("__encrypted__"));
}
exports.isEncryptedValue = isEncryptedValue;
function encryptString(plaintext, masterKey) {
    if (!plaintext)
        return plaintext;
    if (!masterKey || masterKey.length < 32)
        throw new Error("Missing/invalid encryption key");
    if (plaintext.startsWith(ENC_PREFIX))
        return plaintext;
    const salt = (0, crypto_1.randomBytes)(SALT_LENGTH);
    const key = deriveKeyV2(masterKey, salt);
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Match browser WebCrypto behavior: ciphertext includes tag. Node splits tag.
    const ciphertextWithTag = Buffer.concat([ciphertext, tag]);
    // Envelope: version(1) + salt(16) + iv(12) + ciphertext+tag
    const combined = Buffer.concat([Buffer.from([ENCRYPTION_VERSION]), salt, iv, ciphertextWithTag]);
    return `${ENC_PREFIX}${combined.toString("base64")}`;
}
exports.encryptString = encryptString;
function decryptString(encrypted, masterKey) {
    if (!encrypted)
        return encrypted;
    if (!masterKey || masterKey.length < 32)
        throw new Error("Missing/invalid encryption key");
    let raw = encrypted;
    if (raw.startsWith(ENC_PREFIX))
        raw = raw.slice(ENC_PREFIX.length);
    if (raw.startsWith("__encrypted__"))
        raw = raw.slice("__encrypted__".length);
    const combined = Buffer.from(raw, "base64");
    const version = combined[0];
    if (version === ENCRYPTION_VERSION) {
        const salt = combined.subarray(1, 1 + SALT_LENGTH);
        const iv = combined.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
        const encryptedData = combined.subarray(1 + SALT_LENGTH + IV_LENGTH);
        const key = deriveKeyV2(masterKey, salt);
        // Split ciphertext and tag (last 16 bytes are tag for GCM)
        const tag = encryptedData.subarray(encryptedData.length - 16);
        const ciphertext = encryptedData.subarray(0, encryptedData.length - 16);
        const decipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString("utf8");
    }
    // Legacy v1: iv(12) + ciphertext+tag (fixed salt)
    const iv = combined.subarray(0, IV_LENGTH);
    const encryptedData = combined.subarray(IV_LENGTH);
    const key = deriveKeyLegacy(masterKey);
    const tag = encryptedData.subarray(encryptedData.length - 16);
    const ciphertext = encryptedData.subarray(0, encryptedData.length - 16);
    const decipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
}
exports.decryptString = decryptString;
function getNestedValue(obj, path) {
    return path.split(".").reduce((cur, key) => (cur && typeof cur === "object" ? cur[key] : undefined), obj);
}
exports.getNestedValue = getNestedValue;
function setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    if (!last)
        return;
    let cur = obj;
    for (const k of keys) {
        if (!cur[k] || typeof cur[k] !== "object")
            cur[k] = {};
        cur = cur[k];
    }
    cur[last] = value;
}
exports.setNestedValue = setNestedValue;
//# sourceMappingURL=hrCrypto.js.map