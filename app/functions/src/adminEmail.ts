import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";
import { db as adminDb, firestore } from "./admin";
import { FUNCTION_KEYS } from "./keys";
import * as nodemailer from "nodemailer";

type Provider = "gmail" | "outlook";

function tokenDocIdFor(opts: { companyId: string; siteId?: string; subsiteId?: string; userId?: string; provider: Provider }) {
  return opts.userId
    ? `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.userId}_${opts.provider}`
    : `${opts.companyId}_${opts.siteId || "default"}_${opts.subsiteId || "default"}_${opts.provider}`;
}

async function getOAuthTokenDoc(companyId: string, provider: Provider, siteId?: string, subsiteId?: string, userId?: string) {
  const docId = tokenDocIdFor({ companyId, provider, siteId, subsiteId, userId });
  const doc = await firestore.collection("oauth_tokens").doc(docId).get();
  if (!doc.exists) return null;
  return { id: docId, ...(doc.data() as any) } as any;
}

async function ensureOutlookAccessToken(tokenDoc: any): Promise<{ accessToken: string; tokenDocId: string; fromEmail: string }> {
  const tokens = tokenDoc.tokens || {};
  const fromEmail = tokenDoc.email || "";

  // If token looks usable, return it.
  if (tokens.access_token) return { accessToken: tokens.access_token, tokenDocId: tokenDoc.id, fromEmail };

  throw new Error("Missing outlook access token");
}

async function ensureGmailClient(tokenDoc: any) {
  // Lazy import to keep deploy-time export analysis fast.
  const { google } = await import("googleapis");
  const oauth2Client = new google.auth.OAuth2(FUNCTION_KEYS.google.clientId, FUNCTION_KEYS.google.clientSecret);
  oauth2Client.setCredentials(tokenDoc.tokens || {});
  return oauth2Client;
}

export const syncEmailInbox = onRequest({ cors: true }, async (req, res) => {
  try {
    const companyId = (req.query.company_id as string) || (req.body?.companyId as string) || "admin";
    const provider = ((req.query.provider as string) || req.body?.provider || "gmail") as Provider;
    const siteId = (req.query.site_id as string) || req.body?.siteId || "default";
    const subsiteId = (req.query.subsite_id as string) || req.body?.subsiteId || "default";
    const userId = (req.query.user_id as string) || req.body?.userId || "";
    const limit = Number((req.query.limit as string) || req.body?.limit || 25);

    const tokenDoc = await getOAuthTokenDoc(companyId, provider, siteId, subsiteId, userId || undefined);
    if (!tokenDoc) {
      res.status(404).json({ success: false, error: `No ${provider} OAuth token connected` });
      return;
    }

    if (provider === "gmail") {
      const client = await ensureGmailClient(tokenDoc);
      const { google } = await import("googleapis");
      const gmail = google.gmail({ version: "v1", auth: client });

      const list = await gmail.users.messages.list({
        userId: "me",
        maxResults: Math.min(Math.max(limit, 1), 50),
        q: "newer_than:30d",
      });

      const msgs = list.data.messages || [];
      const updates: Record<string, any> = {};

      for (const m of msgs) {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: m.id as string,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "To", "Date"],
        });

        const headers = full.data.payload?.headers || [];
        const h = (name: string) => headers.find((x: any) => String(x.name).toLowerCase() === name.toLowerCase())?.value || "";
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

      const basePath = userId ? `admin/email/users/${userId}/messages` : `admin/email/messages`
      await adminDb.ref(basePath).update(updates);
      res.json({ success: true, provider, count: Object.keys(updates).length });
      return;
    }

    // Outlook
    const { accessToken } = await ensureOutlookAccessToken(tokenDoc);
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${Math.min(Math.max(limit, 1), 50)}&$select=subject,from,toRecipients,receivedDateTime,bodyPreview`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!response.ok) {
      const text = await response.text();
      res.status(500).json({ success: false, error: `Outlook sync failed: ${response.statusText}`, details: text });
      return;
    }
    const data: any = await response.json();
    const updates: Record<string, any> = {};
    for (const item of data.value || []) {
      const id = `outlook_${item.id}`;
      updates[id] = {
        provider: "outlook",
        direction: "inbound",
        from: item?.from?.emailAddress?.address || "",
        to: (item?.toRecipients || []).map((r: any) => r?.emailAddress?.address).filter(Boolean).join(", "),
        subject: item?.subject || "",
        bodyPreview: item?.bodyPreview || "",
        receivedAt: item?.receivedDateTime ? new Date(item.receivedDateTime).getTime() : Date.now(),
        createdAt: item?.receivedDateTime ? new Date(item.receivedDateTime).getTime() : Date.now(),
        updatedAt: Date.now(),
      };
    }

    const basePath = userId ? `admin/email/users/${userId}/messages` : `admin/email/messages`
    await adminDb.ref(basePath).update(updates);
    res.json({ success: true, provider, count: Object.keys(updates).length });
  } catch (e: any) {
    console.error("syncEmailInbox error", e);
    res.status(500).json({ success: false, error: e.message || "Unknown error" });
  }
});

async function sendWithGmail(opts: { companyId: string; userId?: string; to: string; subject: string; body: string }) {
  // Prefer Gmail App Password SMTP if configured (similar to other app sections).
  try {
    const userScopedPath = opts.userId ? `admin/email/users/${opts.userId}/gmailAppPasswordConfig` : ""
    const sharedPath = `admin/email/gmailAppPasswordConfig`
    const snap = await adminDb.ref(userScopedPath || sharedPath).get()
    const cfg = (snap.val() || {}) as any
    const email = String(cfg?.email || "").trim()
    const appPassword = String(cfg?.appPassword || "").trim()
    const senderName = String(cfg?.senderName || "").trim()
    if (email && appPassword) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: email, pass: appPassword },
      })
      const from = senderName ? `"${senderName}" <${email}>` : email
      await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.body,
        html: String(opts.body || "").replace(/\n/g, "<br>"),
      })
      return { fromEmail: email }
    }
  } catch {
    // Ignore and fall back to OAuth.
  }

  const tokenDoc = await getOAuthTokenDoc(opts.companyId, "gmail", "default", "default", opts.userId || undefined);
  if (!tokenDoc) throw new Error("No Gmail OAuth connected");
  const client = await ensureGmailClient(tokenDoc);
  // Lazy import to keep deploy-time export analysis fast.
  const { google } = await import("googleapis");
  const gmail = google.gmail({ version: "v1", auth: client });

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

async function sendWithOutlook(opts: { companyId: string; userId?: string; to: string; subject: string; body: string }) {
  const tokenDoc = await getOAuthTokenDoc(opts.companyId, "outlook", "default", "default", opts.userId || undefined);
  if (!tokenDoc) throw new Error("No Outlook OAuth connected");
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

export const processEmailOutbox = onValueCreated(
  { ref: "admin/email/outbox/{outboxId}", region: "europe-west1" },
  async (event) => {
    const companyId = "admin";
    const outboxId = event.params.outboxId as string;
    const val: any = event.data.val();

    const outRef = adminDb.ref(`admin/email/outbox/${outboxId}`);

    try {
      const to = String(val?.to || "").trim();
      const subject = String(val?.subject || "").trim();
      const body = String(val?.body || "");
      if (!to || !subject) {
        await outRef.update({ status: "failed", error: "Missing to/subject", updatedAt: Date.now() });
        return;
      }

      await outRef.update({ status: "sending", updatedAt: Date.now() });

      // Prefer gmail if connected; otherwise outlook
      let sent: { fromEmail: string } | null = null;
      try {
        sent = await sendWithGmail({ companyId, to, subject, body });
      } catch (e) {
        sent = await sendWithOutlook({ companyId, to, subject, body });
      }

      const now = Date.now();
      const msgRef = adminDb.ref(`admin/email/messages`).push();
      await msgRef.set({
        provider: sent?.fromEmail ? (sent.fromEmail.includes("@") ? "gmail" : "outlook") : "gmail",
        direction: "outbound",
        from: sent?.fromEmail || "",
        to,
        subject,
        bodyPreview: body.slice(0, 500),
        body,
        createdAt: now,
        updatedAt: now,
      });

      await outRef.update({ status: "sent", sentAt: now, updatedAt: now });
    } catch (e: any) {
      console.error("processEmailOutbox error", e);
      await outRef.update({ status: "failed", error: e.message || "Unknown error", updatedAt: Date.now() });
    }
  },
);

// Per-user outbox processing (Admin Email should be per current account)
export const processEmailOutboxUser = onValueCreated(
  { ref: "admin/email/users/{userId}/outbox/{outboxId}", region: "europe-west1" },
  async (event) => {
    const companyId = "admin";
    const userId = String(event.params.userId || "");
    const outboxId = event.params.outboxId as string;
    const val: any = event.data.val();

    const outRef = adminDb.ref(`admin/email/users/${userId}/outbox/${outboxId}`);

    try {
      const to = String(val?.to || "").trim();
      const subject = String(val?.subject || "").trim();
      const body = String(val?.body || "");
      if (!to || !subject) {
        await outRef.update({ status: "failed", error: "Missing to/subject", updatedAt: Date.now() });
        return;
      }

      await outRef.update({ status: "sending", updatedAt: Date.now() });

      let sent: { fromEmail: string } | null = null;
      try {
        sent = await sendWithGmail({ companyId, userId, to, subject, body });
      } catch (e) {
        sent = await sendWithOutlook({ companyId, userId, to, subject, body });
      }

      const now = Date.now();
      const msgRef = adminDb.ref(`admin/email/users/${userId}/messages`).push();
      await msgRef.set({
        provider: sent?.fromEmail ? (sent.fromEmail.includes("@") ? "gmail" : "outlook") : "gmail",
        direction: "outbound",
        from: sent?.fromEmail || "",
        to,
        subject,
        bodyPreview: body.slice(0, 500),
        body,
        createdAt: now,
        updatedAt: now,
      });

      await outRef.update({ status: "sent", sentAt: now, updatedAt: now });
    } catch (e: any) {
      console.error("processEmailOutboxUser error", e);
      await outRef.update({ status: "failed", error: e.message || "Unknown error", updatedAt: Date.now() });
    }
  },
);

