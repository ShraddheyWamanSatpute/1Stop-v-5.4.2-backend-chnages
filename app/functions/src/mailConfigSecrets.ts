import crypto from "crypto"
import { db } from "./admin"

type MailboxConfigType = "bookings" | "hr" | "stock"

type MailboxPublicConfig = {
  email?: string
  senderName?: string
  appPassword?: string
  updatedAt?: number
}

type MailboxResolvedConfig = {
  email?: string
  senderName?: string
  appPassword?: string
  updatedAt?: number
  migratedFromPlaintext?: boolean
}

function getMailboxKey(): Buffer {
  const raw = String(process.env.MAILBOX_ENCRYPTION_KEY || process.env.HMRC_ENCRYPTION_KEY || "").trim()
  if (!raw) {
    throw new Error("Missing MAILBOX_ENCRYPTION_KEY (or HMRC_ENCRYPTION_KEY fallback) for mailbox secret encryption")
  }

  const normalized = raw.startsWith("base64:")
    ? Buffer.from(raw.slice("base64:".length), "base64")
    : /^[A-Fa-f0-9]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "utf8")

  if (normalized.length === 32) return normalized
  return crypto.createHash("sha256").update(normalized).digest()
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12)
  const key = getMailboxKey()
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return JSON.stringify({
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    data: ciphertext.toString("base64"),
  })
}

function decryptSecret(payload: unknown): string | undefined {
  if (typeof payload !== "string" || !payload.trim()) return undefined
  try {
    const parsed = JSON.parse(payload)
    if (!parsed?.iv || !parsed?.tag || !parsed?.data) return undefined
    const key = getMailboxKey()
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(String(parsed.iv), "base64"),
    )
    decipher.setAuthTag(Buffer.from(String(parsed.tag), "base64"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(String(parsed.data), "base64")),
      decipher.final(),
    ])
    return plaintext.toString("utf8")
  } catch {
    return undefined
  }
}

function getSecretPath(basePath: string, configType: MailboxConfigType): string {
  return `${basePath}/secureMailboxSecrets/${configType}`
}

export async function saveMailboxConfig(
  basePath: string,
  configPath: string,
  configType: MailboxConfigType,
  input: { email: string; senderName?: string; appPassword: string; updatedAt?: number },
): Promise<MailboxResolvedConfig> {
  const now = input.updatedAt || Date.now()
  await Promise.all([
    db.ref(configPath).update({
      email: input.email,
      senderName: input.senderName || null,
      secretStorage: "encrypted_server_side",
      updatedAt: now,
      appPassword: null,
    }),
    db.ref(getSecretPath(basePath, configType)).update({
      appPassword: encryptSecret(input.appPassword),
      updatedAt: now,
    }),
  ])

  return {
    email: input.email,
    senderName: input.senderName || undefined,
    appPassword: input.appPassword,
    updatedAt: now,
  }
}

export async function loadMailboxConfig(
  basePath: string,
  configPath: string,
  configType: MailboxConfigType,
): Promise<MailboxResolvedConfig> {
  const [publicSnap, secretSnap] = await Promise.all([
    db.ref(configPath).get(),
    db.ref(getSecretPath(basePath, configType)).get(),
  ])

  const publicConfig = (publicSnap.val() || {}) as MailboxPublicConfig
  const secretRecord = (secretSnap.val() || {}) as { appPassword?: string; updatedAt?: number }

  let appPassword = decryptSecret(secretRecord.appPassword)
  let migratedFromPlaintext = false

  if (!appPassword && typeof publicConfig.appPassword === "string" && publicConfig.appPassword.trim()) {
    appPassword = publicConfig.appPassword.trim()
    migratedFromPlaintext = true
    await Promise.all([
      db.ref(getSecretPath(basePath, configType)).update({
        appPassword: encryptSecret(appPassword),
        updatedAt: Date.now(),
      }),
      db.ref(configPath).update({
        appPassword: null,
        secretStorage: "encrypted_server_side",
        updatedAt: publicConfig.updatedAt || Date.now(),
      }),
    ])
  }

  return {
    email: typeof publicConfig.email === "string" ? publicConfig.email.trim() : undefined,
    senderName: typeof publicConfig.senderName === "string" ? publicConfig.senderName.trim() : undefined,
    updatedAt: typeof publicConfig.updatedAt === "number" ? publicConfig.updatedAt : undefined,
    appPassword,
    migratedFromPlaintext,
  }
}
