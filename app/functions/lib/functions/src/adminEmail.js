"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmailOutboxUser = exports.processEmailOutbox = exports.syncEmailInbox = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("firebase-functions/v2/database");
const googleapis_1 = require("googleapis");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
function tokenDocIdFor(opts) {
    return opts.userId
        ? `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.userId}_${opts.provider}`
        : `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.provider}`;
}
async function getOAuthTokenDoc(companyId, provider, siteId, subsiteId, userId) {
    const docId = tokenDocIdFor({ companyId, provider, siteId, subsiteId, userId });
    const doc = await admin_1.firestore.collection("oauth_tokens").doc(docId).get();
    if (!doc.exists)
        return null;
    return Object.assign({ id: docId }, doc.data());
}
async function ensureOutlookAccessToken(tokenDoc) {
    const tokens = tokenDoc.tokens || {};
    const fromEmail = tokenDoc.email || "";
    // If token looks usable, return it.
    if (tokens.access_token)
        return { accessToken: tokens.access_token, tokenDocId: tokenDoc.id, fromEmail };
    throw new Error("Missing outlook access token");
}
async function ensureGmailClient(tokenDoc) {
    const oauth2Client = new googleapis_1.google.auth.OAuth2(keys_1.FUNCTION_KEYS.google.clientId, keys_1.FUNCTION_KEYS.google.clientSecret);
    oauth2Client.setCredentials(tokenDoc.tokens || {});
    return oauth2Client;
}
exports.syncEmailInbox = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const companyId = req.query.company_id || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.companyId) || "admin";
        const provider = (req.query.provider || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.provider) || "gmail");
        const siteId = req.query.site_id || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.siteId) || "default";
        const subsiteId = req.query.subsite_id || ((_d = req.body) === null || _d === void 0 ? void 0 : _d.subsiteId) || "default";
        const userId = req.query.user_id || ((_e = req.body) === null || _e === void 0 ? void 0 : _e.userId) || "";
        const limit = Number(req.query.limit || ((_f = req.body) === null || _f === void 0 ? void 0 : _f.limit) || 25);
        const tokenDoc = await getOAuthTokenDoc(companyId, provider, siteId, subsiteId, userId || undefined);
        if (!tokenDoc) {
            res.status(404).json({ success: false, error: `No ${provider} OAuth token connected` });
            return;
        }
        if (provider === "gmail") {
            const client = await ensureGmailClient(tokenDoc);
            const gmail = googleapis_1.google.gmail({ version: "v1", auth: client });
            const list = await gmail.users.messages.list({
                userId: "me",
                maxResults: Math.min(Math.max(limit, 1), 50),
                q: "newer_than:30d",
            });
            const msgs = list.data.messages || [];
            const updates = {};
            for (const m of msgs) {
                const full = await gmail.users.messages.get({
                    userId: "me",
                    id: m.id,
                    format: "metadata",
                    metadataHeaders: ["Subject", "From", "To", "Date"],
                });
                const headers = ((_g = full.data.payload) === null || _g === void 0 ? void 0 : _g.headers) || [];
                const h = (name) => { var _a; return ((_a = headers.find((x) => String(x.name).toLowerCase() === name.toLowerCase())) === null || _a === void 0 ? void 0 : _a.value) || ""; };
                const internalDate = Number(full.data.internalDate || Date.now());
                const id = `gmail_${full.data.id}`;
                updates[id] = {
                    provider: "gmail",
                    direction: "inbound",
                    from: h("From"),
                    to: h("To"),
                    subject: h("Subject"),
                    bodyPreview: full.data.snippet || "",
                    receivedAt: internalDate,
                    createdAt: internalDate,
                    updatedAt: Date.now(),
                };
            }
            const basePath = userId ? `admin/email/users/${userId}/messages` : `admin/email/messages`;
            await admin_1.db.ref(basePath).update(updates);
            res.json({ success: true, provider, count: Object.keys(updates).length });
            return;
        }
        // Outlook
        const { accessToken } = await ensureOutlookAccessToken(tokenDoc);
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=${Math.min(Math.max(limit, 1), 50)}&$select=subject,from,toRecipients,receivedDateTime,bodyPreview`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            res.status(500).json({ success: false, error: `Outlook sync failed: ${response.statusText}`, details: text });
            return;
        }
        const data = await response.json();
        const updates = {};
        for (const item of data.value || []) {
            const id = `outlook_${item.id}`;
            updates[id] = {
                provider: "outlook",
                direction: "inbound",
                from: ((_j = (_h = item === null || item === void 0 ? void 0 : item.from) === null || _h === void 0 ? void 0 : _h.emailAddress) === null || _j === void 0 ? void 0 : _j.address) || "",
                to: ((item === null || item === void 0 ? void 0 : item.toRecipients) || []).map((r) => { var _a; return (_a = r === null || r === void 0 ? void 0 : r.emailAddress) === null || _a === void 0 ? void 0 : _a.address; }).filter(Boolean).join(", "),
                subject: (item === null || item === void 0 ? void 0 : item.subject) || "",
                bodyPreview: (item === null || item === void 0 ? void 0 : item.bodyPreview) || "",
                receivedAt: (item === null || item === void 0 ? void 0 : item.receivedDateTime) ? new Date(item.receivedDateTime).getTime() : Date.now(),
                createdAt: (item === null || item === void 0 ? void 0 : item.receivedDateTime) ? new Date(item.receivedDateTime).getTime() : Date.now(),
                updatedAt: Date.now(),
            };
        }
        const basePath = userId ? `admin/email/users/${userId}/messages` : `admin/email/messages`;
        await admin_1.db.ref(basePath).update(updates);
        res.json({ success: true, provider, count: Object.keys(updates).length });
    }
    catch (e) {
        console.error("syncEmailInbox error", e);
        res.status(500).json({ success: false, error: e.message || "Unknown error" });
    }
});
async function sendWithGmail(opts) {
    const tokenDoc = await getOAuthTokenDoc(opts.companyId, "gmail", "default", "default", opts.userId || undefined);
    if (!tokenDoc)
        throw new Error("No Gmail OAuth connected");
    const client = await ensureGmailClient(tokenDoc);
    const gmail = googleapis_1.google.gmail({ version: "v1", auth: client });
    const fromEmail = tokenDoc.email || "me";
    const message = [`To: ${opts.to}`, `From: ${fromEmail}`, `Subject: ${opts.subject}`, "", opts.body].join("\n");
    const encoded = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encoded },
    });
    return { fromEmail };
}
async function sendWithOutlook(opts) {
    const tokenDoc = await getOAuthTokenDoc(opts.companyId, "outlook", "default", "default", opts.userId || undefined);
    if (!tokenDoc)
        throw new Error("No Outlook OAuth connected");
    const { accessToken, fromEmail } = await ensureOutlookAccessToken(tokenDoc);
    const payload = {
        message: {
            subject: opts.subject,
            body: { contentType: "Text", content: opts.body },
            toRecipients: [{ emailAddress: { address: opts.to } }],
        },
        saveToSentItems: "true",
    };
    const resp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Outlook send failed: ${resp.statusText} ${text}`);
    }
    return { fromEmail };
}
exports.processEmailOutbox = (0, database_1.onValueCreated)("admin/email/outbox/{outboxId}", async (event) => {
    const companyId = "admin";
    const outboxId = event.params.outboxId;
    const val = event.data.val();
    const outRef = admin_1.db.ref(`admin/email/outbox/${outboxId}`);
    try {
        const to = String((val === null || val === void 0 ? void 0 : val.to) || "").trim();
        const subject = String((val === null || val === void 0 ? void 0 : val.subject) || "").trim();
        const body = String((val === null || val === void 0 ? void 0 : val.body) || "");
        if (!to || !subject) {
            await outRef.update({ status: "failed", error: "Missing to/subject", updatedAt: Date.now() });
            return;
        }
        await outRef.update({ status: "sending", updatedAt: Date.now() });
        // Prefer gmail if connected; otherwise outlook
        let sent = null;
        try {
            sent = await sendWithGmail({ companyId, to, subject, body });
        }
        catch (e) {
            sent = await sendWithOutlook({ companyId, to, subject, body });
        }
        const now = Date.now();
        const msgRef = admin_1.db.ref(`admin/email/messages`).push();
        await msgRef.set({
            provider: (sent === null || sent === void 0 ? void 0 : sent.fromEmail) ? (sent.fromEmail.includes("@") ? "gmail" : "outlook") : "gmail",
            direction: "outbound",
            from: (sent === null || sent === void 0 ? void 0 : sent.fromEmail) || "",
            to,
            subject,
            bodyPreview: body.slice(0, 500),
            body,
            createdAt: now,
            updatedAt: now,
        });
        await outRef.update({ status: "sent", sentAt: now, updatedAt: now });
    }
    catch (e) {
        console.error("processEmailOutbox error", e);
        await outRef.update({ status: "failed", error: e.message || "Unknown error", updatedAt: Date.now() });
    }
});
// Per-user outbox processing (Admin Email should be per current account)
exports.processEmailOutboxUser = (0, database_1.onValueCreated)("admin/email/users/{userId}/outbox/{outboxId}", async (event) => {
    const companyId = "admin";
    const userId = String(event.params.userId || "");
    const outboxId = event.params.outboxId;
    const val = event.data.val();
    const outRef = admin_1.db.ref(`admin/email/users/${userId}/outbox/${outboxId}`);
    try {
        const to = String((val === null || val === void 0 ? void 0 : val.to) || "").trim();
        const subject = String((val === null || val === void 0 ? void 0 : val.subject) || "").trim();
        const body = String((val === null || val === void 0 ? void 0 : val.body) || "");
        if (!to || !subject) {
            await outRef.update({ status: "failed", error: "Missing to/subject", updatedAt: Date.now() });
            return;
        }
        await outRef.update({ status: "sending", updatedAt: Date.now() });
        let sent = null;
        try {
            sent = await sendWithGmail({ companyId, userId, to, subject, body });
        }
        catch (e) {
            sent = await sendWithOutlook({ companyId, userId, to, subject, body });
        }
        const now = Date.now();
        const msgRef = admin_1.db.ref(`admin/email/users/${userId}/messages`).push();
        await msgRef.set({
            provider: (sent === null || sent === void 0 ? void 0 : sent.fromEmail) ? (sent.fromEmail.includes("@") ? "gmail" : "outlook") : "gmail",
            direction: "outbound",
            from: (sent === null || sent === void 0 ? void 0 : sent.fromEmail) || "",
            to,
            subject,
            bodyPreview: body.slice(0, 500),
            body,
            createdAt: now,
            updatedAt: now,
        });
        await outRef.update({ status: "sent", sentAt: now, updatedAt: now });
    }
    catch (e) {
        console.error("processEmailOutboxUser error", e);
        await outRef.update({ status: "failed", error: e.message || "Unknown error", updatedAt: Date.now() });
    }
});
//# sourceMappingURL=adminEmail.js.map