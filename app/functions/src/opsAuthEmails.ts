import { getAuth } from "firebase-admin/auth"
import * as nodemailer from "nodemailer"
import { db } from "./admin"
import { FUNCTION_KEYS } from "./keys"

export type AuthEmailTemplateKey = "verifyEmail" | "passwordReset" | "magicLink"

export type AuthEmailSenderProvider = "gmailAppPassword" | "smtp"

export type AuthEmailSettings = {
  defaultContinueUrl?: string
  appName?: string
  supportEmail?: string
}

export type AuthEmailTemplate = {
  key: AuthEmailTemplateKey
  enabled: boolean
  subject: string
  html: string
  text?: string
  updatedAt?: number
  updatedBy?: { uid?: string; email?: string }
}

export type AuthEmailSenderConfig = {
  provider: AuthEmailSenderProvider
  email?: string
  senderName?: string
  /**
   * Stored server-side only. Never return to clients.
   */
  appPassword?: string
  updatedAt?: number
  updatedBy?: { uid?: string; email?: string }
}

export type AuthEmailSenderPublic = {
  provider: AuthEmailSenderProvider
  email?: string
  senderName?: string
  appPasswordSet?: boolean
  updatedAt?: number
  updatedBy?: { uid?: string; email?: string }
}

const SETTINGS_PATH = "admin/ops/authEmails/settings"
const TEMPLATES_PATH = "admin/ops/authEmails/templates"
const SENDER_PATH = "admin/ops/authEmails/sender"
const AUDIT_PATH = "admin/ops/authEmails/audit"

function nowMs(): number {
  return Date.now()
}

function normStr(v: any): string {
  return String(v ?? "").trim()
}

function isValidEmail(s: string): boolean {
  // simple + permissive; Firebase/SMTP will still validate further
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function safeUrl(maybeUrl: string): string | null {
  const raw = normStr(maybeUrl)
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    return u.toString()
  } catch {
    return null
  }
}

function renderTemplate(input: string, vars: Record<string, string>): string {
  return String(input ?? "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[String(key)]
    return v == null ? "" : String(v)
  })
}

function defaultTemplates(appName: string): Record<AuthEmailTemplateKey, AuthEmailTemplate> {
  const name = appName || "1Stop"
  return {
    verifyEmail: {
      key: "verifyEmail",
      enabled: true,
      subject: `Verify your email for ${name}`,
      text: `Hello {{firstName}},\n\nPlease verify your email address by clicking the link below:\n\n{{actionLink}}\n\nIf you did not request this, you can ignore this email.\n\nThanks,\n${name} Team`,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <p>Hello {{firstName}},</p>
  <p>Please verify your email address by clicking the button below.</p>
  <p>
    <a href="{{actionLink}}" style="display:inline-block;padding:10px 14px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">
      Verify email
    </a>
  </p>
  <p style="word-break: break-all;">
    Or paste this link into your browser:<br/>
    <a href="{{actionLink}}">{{actionLink}}</a>
  </p>
  <p>If you did not request this, you can ignore this email.</p>
  <p>Thanks,<br/>${name} Team</p>
</div>`,
    },
    passwordReset: {
      key: "passwordReset",
      enabled: true,
      subject: `Reset your password for ${name}`,
      text: `Hello {{firstName}},\n\nYou can reset your password using the link below:\n\n{{actionLink}}\n\nIf you did not request this, you can ignore this email.\n\nThanks,\n${name} Team`,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <p>Hello {{firstName}},</p>
  <p>You can reset your password using the button below.</p>
  <p>
    <a href="{{actionLink}}" style="display:inline-block;padding:10px 14px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">
      Reset password
    </a>
  </p>
  <p style="word-break: break-all;">
    Or paste this link into your browser:<br/>
    <a href="{{actionLink}}">{{actionLink}}</a>
  </p>
  <p>If you did not request this, you can ignore this email.</p>
  <p>Thanks,<br/>${name} Team</p>
</div>`,
    },
    magicLink: {
      key: "magicLink",
      enabled: false,
      subject: `Sign in to ${name}`,
      text: `Hello {{firstName}},\n\nUse the link below to sign in:\n\n{{actionLink}}\n\nIf you did not request this, you can ignore this email.\n\nThanks,\n${name} Team`,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <p>Hello {{firstName}},</p>
  <p>Use the button below to sign in.</p>
  <p>
    <a href="{{actionLink}}" style="display:inline-block;padding:10px 14px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">
      Sign in
    </a>
  </p>
  <p style="word-break: break-all;">
    Or paste this link into your browser:<br/>
    <a href="{{actionLink}}">{{actionLink}}</a>
  </p>
  <p>If you did not request this, you can ignore this email.</p>
  <p>Thanks,<br/>${name} Team</p>
</div>`,
    },
  }
}

async function readSettings(): Promise<AuthEmailSettings> {
  const snap = await db.ref(SETTINGS_PATH).get()
  const v = (snap.val() || {}) as any
  return {
    defaultContinueUrl: normStr(v.defaultContinueUrl) || undefined,
    appName: normStr(v.appName) || undefined,
    supportEmail: normStr(v.supportEmail) || undefined,
  }
}

async function writeSettings(actor: { uid?: string; email?: string }, next: AuthEmailSettings): Promise<AuthEmailSettings> {
  const payload = {
    defaultContinueUrl: normStr(next.defaultContinueUrl) || null,
    appName: normStr(next.appName) || null,
    supportEmail: normStr(next.supportEmail) || null,
    updatedAt: nowMs(),
    updatedBy: { uid: actor.uid || null, email: actor.email || null },
  }
  await db.ref(SETTINGS_PATH).update(payload)
  const out = await readSettings()
  return out
}

async function readStoredTemplates(): Promise<Partial<Record<AuthEmailTemplateKey, Partial<AuthEmailTemplate>>>> {
  const snap = await db.ref(TEMPLATES_PATH).get()
  const v = (snap.val() || {}) as any
  return v
}

async function readSenderSecret(): Promise<AuthEmailSenderConfig> {
  const snap = await db.ref(SENDER_PATH).get()
  const v = (snap.val() || {}) as any
  const provider = (normStr(v.provider) as AuthEmailSenderProvider) || "gmailAppPassword"
  return {
    provider: provider === "smtp" ? "smtp" : "gmailAppPassword",
    email: normStr(v.email) || undefined,
    senderName: normStr(v.senderName) || undefined,
    appPassword: normStr(v.appPassword) || undefined,
    updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : undefined,
    updatedBy: v.updatedBy || undefined,
  }
}

function senderToPublic(s: AuthEmailSenderConfig): AuthEmailSenderPublic {
  return {
    provider: s.provider,
    email: s.email,
    senderName: s.senderName,
    appPasswordSet: Boolean(s.appPassword),
    updatedAt: s.updatedAt,
    updatedBy: s.updatedBy,
  }
}

function normalizeTemplate(key: AuthEmailTemplateKey, raw: any, fallback: AuthEmailTemplate): AuthEmailTemplate {
  const enabled = typeof raw?.enabled === "boolean" ? Boolean(raw.enabled) : Boolean(fallback.enabled)
  const subject = normStr(raw?.subject) || fallback.subject
  const html = normStr(raw?.html) || fallback.html
  const text = normStr(raw?.text) || fallback.text || ""
  return {
    key,
    enabled,
    subject,
    html,
    text,
    updatedAt: typeof raw?.updatedAt === "number" ? raw.updatedAt : undefined,
    updatedBy: raw?.updatedBy || undefined,
  }
}

export async function opsAuthEmailsGetConfig(): Promise<{
  settings: AuthEmailSettings
  templates: Record<AuthEmailTemplateKey, AuthEmailTemplate>
  sender: AuthEmailSenderPublic
}> {
  const settings = await readSettings()
  const appName = settings.appName || "1Stop"
  const defaults = defaultTemplates(appName)
  const stored = await readStoredTemplates()
  const templates: Record<AuthEmailTemplateKey, AuthEmailTemplate> = {
    verifyEmail: normalizeTemplate("verifyEmail", (stored as any).verifyEmail, defaults.verifyEmail),
    passwordReset: normalizeTemplate("passwordReset", (stored as any).passwordReset, defaults.passwordReset),
    magicLink: normalizeTemplate("magicLink", (stored as any).magicLink, defaults.magicLink),
  }
  const sender = senderToPublic(await readSenderSecret())
  return { settings, templates, sender }
}

export async function opsAuthEmailsUpsertSettings(actor: { uid?: string; email?: string }, body: any): Promise<AuthEmailSettings> {
  const raw = normStr(body?.defaultContinueUrl)
  if (raw && !safeUrl(raw)) throw Object.assign(new Error("Invalid defaultContinueUrl (must be http/https URL)"), { status: 400 })
  const defaultContinueUrl = safeUrl(raw)
  return writeSettings(actor, {
    defaultContinueUrl: defaultContinueUrl || undefined,
    appName: normStr(body?.appName) || undefined,
    supportEmail: normStr(body?.supportEmail) || undefined,
  })
}

export async function opsAuthEmailsUpsertTemplate(
  actor: { uid?: string; email?: string },
  body: any,
): Promise<{ templates: Record<AuthEmailTemplateKey, AuthEmailTemplate> }> {
  const key = normStr(body?.key) as AuthEmailTemplateKey
  if (key !== "verifyEmail" && key !== "passwordReset" && key !== "magicLink") {
    throw Object.assign(new Error("Invalid template key"), { status: 400 })
  }

  const enabled = typeof body?.enabled === "boolean" ? Boolean(body.enabled) : undefined
  const subject = normStr(body?.subject)
  const html = normStr(body?.html)
  const text = normStr(body?.text)

  if (!subject) throw Object.assign(new Error("Subject is required"), { status: 400 })
  if (!html) throw Object.assign(new Error("HTML body is required"), { status: 400 })

  const payload = {
    enabled: typeof enabled === "boolean" ? enabled : true,
    subject,
    html,
    text: text || "",
    updatedAt: nowMs(),
    updatedBy: { uid: actor.uid || null, email: actor.email || null },
  }

  await db.ref(`${TEMPLATES_PATH}/${key}`).set(payload)
  const cfg = await opsAuthEmailsGetConfig()
  return { templates: cfg.templates }
}

export async function opsAuthEmailsUpsertSender(
  actor: { uid?: string; email?: string },
  body: any,
): Promise<{ sender: AuthEmailSenderPublic }> {
  const providerRaw = normStr(body?.provider) as AuthEmailSenderProvider
  const provider: AuthEmailSenderProvider = providerRaw === "smtp" ? "smtp" : "gmailAppPassword"

  const email = normStr(body?.email)
  const senderName = normStr(body?.senderName)
  const appPassword = normStr(body?.appPassword)

  const existing = await readSenderSecret()

  const next: AuthEmailSenderConfig = {
    provider,
    email: email || existing.email,
    senderName: senderName || existing.senderName,
    appPassword: appPassword ? appPassword : existing.appPassword,
    updatedAt: nowMs(),
    updatedBy: { uid: actor.uid || undefined, email: actor.email || undefined },
  }

  if (provider === "gmailAppPassword") {
    if (!next.email || !isValidEmail(next.email)) throw Object.assign(new Error("Valid sender email is required"), { status: 400 })
    if (!next.appPassword) throw Object.assign(new Error("App password is required (Gmail App Password)"), { status: 400 })
  }

  await db.ref(SENDER_PATH).set({
    provider: next.provider,
    email: next.email || null,
    senderName: next.senderName || null,
    appPassword: next.appPassword || null,
    updatedAt: next.updatedAt,
    updatedBy: next.updatedBy || null,
  })

  const out = senderToPublic(await readSenderSecret())
  return { sender: out }
}

async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  const sender = await readSenderSecret()

  // Preferred: Gmail App Password (requested)
  if (sender.provider === "gmailAppPassword" && sender.email && sender.appPassword) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: sender.email, pass: sender.appPassword },
    })
    const fromName = sender.senderName || ""
    const from = fromName ? `"${fromName}" <${sender.email}>` : sender.email
    return transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    })
  }

  // Fallback: SMTP env keys
  const mail = FUNCTION_KEYS.mail
  if (!mail?.host || !mail?.user || !mail?.pass || !mail?.from) {
    throw Object.assign(new Error("Mail sender not configured (set Gmail App Password sender or FUNCTION_KEYS.mail)"), { status: 500 })
  }
  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: Number(mail.port),
    secure: Boolean(mail.secure),
    auth: { user: mail.user, pass: mail.pass },
  })
  return transporter.sendMail({
    from: mail.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  })
}

async function writeAudit(actor: { uid?: string; email?: string }, row: any) {
  try {
    const ref = db.ref(AUDIT_PATH).push()
    await ref.set({
      ...(row || {}),
      at: nowMs(),
      actor: { uid: actor.uid || null, email: actor.email || null },
    })
  } catch {
    // ignore
  }
}

export async function opsAuthEmailsSend(
  actor: { uid?: string; email?: string },
  body: any,
): Promise<{ ok: true; messageId?: string }> {
  return sendAuthEmailInternal(actor, body)
}

export async function sendAuthEmailInternal(
  actor: { uid?: string; email?: string },
  body: any,
  opts?: { suppressUserNotFound?: boolean },
): Promise<{ ok: true; messageId?: string }> {
  const type = normStr(body?.type) as AuthEmailTemplateKey
  const toEmail = normStr(body?.email)
  if (!toEmail || !isValidEmail(toEmail)) throw Object.assign(new Error("Valid recipient email is required"), { status: 400 })
  if (type !== "verifyEmail" && type !== "passwordReset" && type !== "magicLink") {
    throw Object.assign(new Error("Invalid auth email type"), { status: 400 })
  }

  const cfg = await opsAuthEmailsGetConfig()
  const settings = cfg.settings
  const t = cfg.templates[type]
  if (!t?.enabled) throw Object.assign(new Error("Template is disabled"), { status: 400 })

  const continueUrl = safeUrl(body?.continueUrl) || safeUrl(settings.defaultContinueUrl || "")
  if (!continueUrl) throw Object.assign(new Error("Missing continueUrl (set a default in Ops → Auth Emails)"), { status: 400 })

  const actionCodeSettings: any = {
    url: continueUrl,
    handleCodeInApp: false,
  }

  let actionLink = ""
  let firstName = "there"
  try {
    const u = await getAuth().getUserByEmail(toEmail).catch(() => null as any)
    const displayName = normStr((u as any)?.displayName)
    if (displayName) {
      const token = displayName.split(/\s+/).filter(Boolean)[0]
      if (token) firstName = token
    }

    if (type === "verifyEmail") {
      actionLink = await getAuth().generateEmailVerificationLink(toEmail, actionCodeSettings)
    } else if (type === "passwordReset") {
      actionLink = await getAuth().generatePasswordResetLink(toEmail, actionCodeSettings)
    } else {
      actionLink = await getAuth().generateSignInWithEmailLink(toEmail, actionCodeSettings)
    }
  } catch (e: any) {
    if (opts?.suppressUserNotFound && String(e?.code || "").includes("user-not-found")) {
      await writeAudit(actor, { ok: true, type, toEmail, suppressed: "user-not-found" })
      return { ok: true }
    }
    await writeAudit(actor, { ok: false, type, toEmail, error: e?.message || "Failed to generate link" })
    throw Object.assign(new Error(e?.message || "Failed to generate action link"), { status: 400 })
  }

  const vars: Record<string, string> = {
    actionLink,
    email: toEmail,
    continueUrl,
    appName: settings.appName || "1Stop",
    supportEmail: settings.supportEmail || "",
    firstName,
  }
  const subject = renderTemplate(t.subject, vars)
  const html = renderTemplate(t.html, vars)
  const text = renderTemplate(t.text || "", vars) || subject

  const info = await sendEmail({ to: toEmail, subject, html, text })
  await writeAudit(actor, { ok: true, type, toEmail, messageId: (info as any)?.messageId || null })

  return { ok: true, messageId: (info as any)?.messageId }
}

