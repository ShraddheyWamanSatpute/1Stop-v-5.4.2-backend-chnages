import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto"

const ENCRYPTION_VERSION = 2
const SALT_LENGTH = 16
const IV_LENGTH = 12
const PBKDF2_ITERS = 100000

const ENC_PREFIX = "ENC:"

function deriveKeyV2(masterKey: string, salt: Buffer): Buffer {
  // 32 bytes = AES-256 key length
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERS, 32, "sha256")
}

function deriveKeyLegacy(masterKey: string): Buffer {
  const salt = Buffer.from("hmrc-compliance-salt-v1", "utf8")
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERS, 32, "sha256")
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith(ENC_PREFIX) || value.startsWith("__encrypted__"))
}

export function encryptString(plaintext: string, masterKey: string): string {
  if (!plaintext) return plaintext
  if (!masterKey || masterKey.length < 32) throw new Error("Missing/invalid encryption key")
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext

  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKeyV2(masterKey, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()])
  const tag = cipher.getAuthTag()

  // Match browser WebCrypto behavior: ciphertext includes tag. Node splits tag.
  const ciphertextWithTag = Buffer.concat([ciphertext, tag])

  // Envelope: version(1) + salt(16) + iv(12) + ciphertext+tag
  const combined = Buffer.concat([Buffer.from([ENCRYPTION_VERSION]), salt, iv, ciphertextWithTag])
  return `${ENC_PREFIX}${combined.toString("base64")}`
}

export function decryptString(encrypted: string, masterKey: string): string {
  if (!encrypted) return encrypted
  if (!masterKey || masterKey.length < 32) throw new Error("Missing/invalid encryption key")

  let raw = encrypted
  if (raw.startsWith(ENC_PREFIX)) raw = raw.slice(ENC_PREFIX.length)
  if (raw.startsWith("__encrypted__")) raw = raw.slice("__encrypted__".length)

  const combined = Buffer.from(raw, "base64")
  const version = combined[0]

  if (version === ENCRYPTION_VERSION) {
    const salt = combined.subarray(1, 1 + SALT_LENGTH)
    const iv = combined.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH)
    const encryptedData = combined.subarray(1 + SALT_LENGTH + IV_LENGTH)

    const key = deriveKeyV2(masterKey, salt)

    // Split ciphertext and tag (last 16 bytes are tag for GCM)
    const tag = encryptedData.subarray(encryptedData.length - 16)
    const ciphertext = encryptedData.subarray(0, encryptedData.length - 16)

    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString("utf8")
  }

  // Legacy v1: iv(12) + ciphertext+tag (fixed salt)
  const iv = combined.subarray(0, IV_LENGTH)
  const encryptedData = combined.subarray(IV_LENGTH)
  const key = deriveKeyLegacy(masterKey)
  const tag = encryptedData.subarray(encryptedData.length - 16)
  const ciphertext = encryptedData.subarray(0, encryptedData.length - 16)

  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString("utf8")
}

export function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((cur, key) => (cur && typeof cur === "object" ? cur[key] : undefined), obj)
}

export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split(".")
  const last = keys.pop()
  if (!last) return
  let cur = obj
  for (const k of keys) {
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {}
    cur = cur[k]
  }
  cur[last] = value
}

