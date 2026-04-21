"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAuthEmailInternal = exports.opsAuthEmailsSend = exports.opsAuthEmailsUpsertSender = exports.opsAuthEmailsUpsertTemplate = exports.opsAuthEmailsUpsertSettings = exports.opsAuthEmailsGetConfig = void 0;
const auth_1 = require("firebase-admin/auth");
const nodemailer = __importStar(require("nodemailer"));
const admin_1 = require("./admin");
const keys_1 = require("./keys");
const SETTINGS_PATH = "admin/ops/authEmails/settings";
const TEMPLATES_PATH = "admin/ops/authEmails/templates";
const SENDER_PATH = "admin/ops/authEmails/sender";
const AUDIT_PATH = "admin/ops/authEmails/audit";
function nowMs() {
    return Date.now();
}
function normStr(v) {
    return String(v !== null && v !== void 0 ? v : "").trim();
}
function isValidEmail(s) {
    // simple + permissive; Firebase/SMTP will still validate further
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function safeUrl(maybeUrl) {
    const raw = normStr(maybeUrl);
    if (!raw)
        return null;
    try {
        const u = new URL(raw);
        if (u.protocol !== "https:" && u.protocol !== "http:")
            return null;
        return u.toString();
    }
    catch (_a) {
        return null;
    }
}
function renderTemplate(input, vars) {
    return String(input !== null && input !== void 0 ? input : "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
        const v = vars[String(key)];
        return v == null ? "" : String(v);
    });
}
function defaultTemplates(appName) {
    const name = appName || "1Stop";
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
    };
}
async function readSettings() {
    const snap = await admin_1.db.ref(SETTINGS_PATH).get();
    const v = (snap.val() || {});
    return {
        defaultContinueUrl: normStr(v.defaultContinueUrl) || undefined,
        appName: normStr(v.appName) || undefined,
        supportEmail: normStr(v.supportEmail) || undefined,
    };
}
async function writeSettings(actor, next) {
    const payload = {
        defaultContinueUrl: normStr(next.defaultContinueUrl) || null,
        appName: normStr(next.appName) || null,
        supportEmail: normStr(next.supportEmail) || null,
        updatedAt: nowMs(),
        updatedBy: { uid: actor.uid || null, email: actor.email || null },
    };
    await admin_1.db.ref(SETTINGS_PATH).update(payload);
    const out = await readSettings();
    return out;
}
async function readStoredTemplates() {
    const snap = await admin_1.db.ref(TEMPLATES_PATH).get();
    const v = (snap.val() || {});
    return v;
}
async function readSenderSecret() {
    const snap = await admin_1.db.ref(SENDER_PATH).get();
    const v = (snap.val() || {});
    const provider = normStr(v.provider) || "gmailAppPassword";
    return {
        provider: provider === "smtp" ? "smtp" : "gmailAppPassword",
        email: normStr(v.email) || undefined,
        senderName: normStr(v.senderName) || undefined,
        appPassword: normStr(v.appPassword) || undefined,
        updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : undefined,
        updatedBy: v.updatedBy || undefined,
    };
}
function senderToPublic(s) {
    return {
        provider: s.provider,
        email: s.email,
        senderName: s.senderName,
        appPasswordSet: Boolean(s.appPassword),
        updatedAt: s.updatedAt,
        updatedBy: s.updatedBy,
    };
}
function normalizeTemplate(key, raw, fallback) {
    const enabled = typeof (raw === null || raw === void 0 ? void 0 : raw.enabled) === "boolean" ? Boolean(raw.enabled) : Boolean(fallback.enabled);
    const subject = normStr(raw === null || raw === void 0 ? void 0 : raw.subject) || fallback.subject;
    const html = normStr(raw === null || raw === void 0 ? void 0 : raw.html) || fallback.html;
    const text = normStr(raw === null || raw === void 0 ? void 0 : raw.text) || fallback.text || "";
    return {
        key,
        enabled,
        subject,
        html,
        text,
        updatedAt: typeof (raw === null || raw === void 0 ? void 0 : raw.updatedAt) === "number" ? raw.updatedAt : undefined,
        updatedBy: (raw === null || raw === void 0 ? void 0 : raw.updatedBy) || undefined,
    };
}
async function opsAuthEmailsGetConfig() {
    const settings = await readSettings();
    const appName = settings.appName || "1Stop";
    const defaults = defaultTemplates(appName);
    const stored = await readStoredTemplates();
    const templates = {
        verifyEmail: normalizeTemplate("verifyEmail", stored.verifyEmail, defaults.verifyEmail),
        passwordReset: normalizeTemplate("passwordReset", stored.passwordReset, defaults.passwordReset),
        magicLink: normalizeTemplate("magicLink", stored.magicLink, defaults.magicLink),
    };
    const sender = senderToPublic(await readSenderSecret());
    return { settings, templates, sender };
}
exports.opsAuthEmailsGetConfig = opsAuthEmailsGetConfig;
async function opsAuthEmailsUpsertSettings(actor, body) {
    const raw = normStr(body === null || body === void 0 ? void 0 : body.defaultContinueUrl);
    if (raw && !safeUrl(raw))
        throw Object.assign(new Error("Invalid defaultContinueUrl (must be http/https URL)"), { status: 400 });
    const defaultContinueUrl = safeUrl(raw);
    return writeSettings(actor, {
        defaultContinueUrl: defaultContinueUrl || undefined,
        appName: normStr(body === null || body === void 0 ? void 0 : body.appName) || undefined,
        supportEmail: normStr(body === null || body === void 0 ? void 0 : body.supportEmail) || undefined,
    });
}
exports.opsAuthEmailsUpsertSettings = opsAuthEmailsUpsertSettings;
async function opsAuthEmailsUpsertTemplate(actor, body) {
    const key = normStr(body === null || body === void 0 ? void 0 : body.key);
    if (key !== "verifyEmail" && key !== "passwordReset" && key !== "magicLink") {
        throw Object.assign(new Error("Invalid template key"), { status: 400 });
    }
    const enabled = typeof (body === null || body === void 0 ? void 0 : body.enabled) === "boolean" ? Boolean(body.enabled) : undefined;
    const subject = normStr(body === null || body === void 0 ? void 0 : body.subject);
    const html = normStr(body === null || body === void 0 ? void 0 : body.html);
    const text = normStr(body === null || body === void 0 ? void 0 : body.text);
    if (!subject)
        throw Object.assign(new Error("Subject is required"), { status: 400 });
    if (!html)
        throw Object.assign(new Error("HTML body is required"), { status: 400 });
    const payload = {
        enabled: typeof enabled === "boolean" ? enabled : true,
        subject,
        html,
        text: text || "",
        updatedAt: nowMs(),
        updatedBy: { uid: actor.uid || null, email: actor.email || null },
    };
    await admin_1.db.ref(`${TEMPLATES_PATH}/${key}`).set(payload);
    const cfg = await opsAuthEmailsGetConfig();
    return { templates: cfg.templates };
}
exports.opsAuthEmailsUpsertTemplate = opsAuthEmailsUpsertTemplate;
async function opsAuthEmailsUpsertSender(actor, body) {
    const providerRaw = normStr(body === null || body === void 0 ? void 0 : body.provider);
    const provider = providerRaw === "smtp" ? "smtp" : "gmailAppPassword";
    const email = normStr(body === null || body === void 0 ? void 0 : body.email);
    const senderName = normStr(body === null || body === void 0 ? void 0 : body.senderName);
    const appPassword = normStr(body === null || body === void 0 ? void 0 : body.appPassword);
    const existing = await readSenderSecret();
    const next = {
        provider,
        email: email || existing.email,
        senderName: senderName || existing.senderName,
        appPassword: appPassword ? appPassword : existing.appPassword,
        updatedAt: nowMs(),
        updatedBy: { uid: actor.uid || undefined, email: actor.email || undefined },
    };
    if (provider === "gmailAppPassword") {
        if (!next.email || !isValidEmail(next.email))
            throw Object.assign(new Error("Valid sender email is required"), { status: 400 });
        if (!next.appPassword)
            throw Object.assign(new Error("App password is required (Gmail App Password)"), { status: 400 });
    }
    await admin_1.db.ref(SENDER_PATH).set({
        provider: next.provider,
        email: next.email || null,
        senderName: next.senderName || null,
        appPassword: next.appPassword || null,
        updatedAt: next.updatedAt,
        updatedBy: next.updatedBy || null,
    });
    const out = senderToPublic(await readSenderSecret());
    return { sender: out };
}
exports.opsAuthEmailsUpsertSender = opsAuthEmailsUpsertSender;
async function sendEmail(params) {
    const sender = await readSenderSecret();
    // Preferred: Gmail App Password (requested)
    if (sender.provider === "gmailAppPassword" && sender.email && sender.appPassword) {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: sender.email, pass: sender.appPassword },
        });
        const fromName = sender.senderName || "";
        const from = fromName ? `"${fromName}" <${sender.email}>` : sender.email;
        return transporter.sendMail({
            from,
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: params.html,
        });
    }
    // Fallback: SMTP env keys
    const mail = keys_1.FUNCTION_KEYS.mail;
    if (!(mail === null || mail === void 0 ? void 0 : mail.host) || !(mail === null || mail === void 0 ? void 0 : mail.user) || !(mail === null || mail === void 0 ? void 0 : mail.pass) || !(mail === null || mail === void 0 ? void 0 : mail.from)) {
        throw Object.assign(new Error("Mail sender not configured (set Gmail App Password sender or FUNCTION_KEYS.mail)"), { status: 500 });
    }
    const transporter = nodemailer.createTransport({
        host: mail.host,
        port: Number(mail.port),
        secure: Boolean(mail.secure),
        auth: { user: mail.user, pass: mail.pass },
    });
    return transporter.sendMail({
        from: mail.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
    });
}
async function writeAudit(actor, row) {
    try {
        const ref = admin_1.db.ref(AUDIT_PATH).push();
        await ref.set(Object.assign(Object.assign({}, (row || {})), { at: nowMs(), actor: { uid: actor.uid || null, email: actor.email || null } }));
    }
    catch (_a) {
        // ignore
    }
}
async function opsAuthEmailsSend(actor, body) {
    return sendAuthEmailInternal(actor, body);
}
exports.opsAuthEmailsSend = opsAuthEmailsSend;
async function sendAuthEmailInternal(actor, body, opts) {
    const type = normStr(body === null || body === void 0 ? void 0 : body.type);
    const toEmail = normStr(body === null || body === void 0 ? void 0 : body.email);
    if (!toEmail || !isValidEmail(toEmail))
        throw Object.assign(new Error("Valid recipient email is required"), { status: 400 });
    if (type !== "verifyEmail" && type !== "passwordReset" && type !== "magicLink") {
        throw Object.assign(new Error("Invalid auth email type"), { status: 400 });
    }
    const cfg = await opsAuthEmailsGetConfig();
    const settings = cfg.settings;
    const t = cfg.templates[type];
    if (!(t === null || t === void 0 ? void 0 : t.enabled))
        throw Object.assign(new Error("Template is disabled"), { status: 400 });
    const continueUrl = safeUrl(body === null || body === void 0 ? void 0 : body.continueUrl) || safeUrl(settings.defaultContinueUrl || "");
    if (!continueUrl)
        throw Object.assign(new Error("Missing continueUrl (set a default in Ops → Auth Emails)"), { status: 400 });
    const actionCodeSettings = {
        url: continueUrl,
        handleCodeInApp: false,
    };
    let actionLink = "";
    let firstName = "there";
    try {
        const u = await (0, auth_1.getAuth)().getUserByEmail(toEmail).catch(() => null);
        const displayName = normStr(u === null || u === void 0 ? void 0 : u.displayName);
        if (displayName) {
            const token = displayName.split(/\s+/).filter(Boolean)[0];
            if (token)
                firstName = token;
        }
        if (type === "verifyEmail") {
            actionLink = await (0, auth_1.getAuth)().generateEmailVerificationLink(toEmail, actionCodeSettings);
        }
        else if (type === "passwordReset") {
            actionLink = await (0, auth_1.getAuth)().generatePasswordResetLink(toEmail, actionCodeSettings);
        }
        else {
            actionLink = await (0, auth_1.getAuth)().generateSignInWithEmailLink(toEmail, actionCodeSettings);
        }
    }
    catch (e) {
        if ((opts === null || opts === void 0 ? void 0 : opts.suppressUserNotFound) && String((e === null || e === void 0 ? void 0 : e.code) || "").includes("user-not-found")) {
            await writeAudit(actor, { ok: true, type, toEmail, suppressed: "user-not-found" });
            return { ok: true };
        }
        await writeAudit(actor, { ok: false, type, toEmail, error: (e === null || e === void 0 ? void 0 : e.message) || "Failed to generate link" });
        throw Object.assign(new Error((e === null || e === void 0 ? void 0 : e.message) || "Failed to generate action link"), { status: 400 });
    }
    const vars = {
        actionLink,
        email: toEmail,
        continueUrl,
        appName: settings.appName || "1Stop",
        supportEmail: settings.supportEmail || "",
        firstName,
    };
    const subject = renderTemplate(t.subject, vars);
    const html = renderTemplate(t.html, vars);
    const text = renderTemplate(t.text || "", vars) || subject;
    const info = await sendEmail({ to: toEmail, subject, html, text });
    await writeAudit(actor, { ok: true, type, toEmail, messageId: (info === null || info === void 0 ? void 0 : info.messageId) || null });
    return { ok: true, messageId: info === null || info === void 0 ? void 0 : info.messageId };
}
exports.sendAuthEmailInternal = sendAuthEmailInternal;
//# sourceMappingURL=opsAuthEmails.js.map