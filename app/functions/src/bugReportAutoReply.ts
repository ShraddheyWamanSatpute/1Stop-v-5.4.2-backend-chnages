import { onValueCreated } from "firebase-functions/v2/database"
import { db as adminDb } from "./admin"
import * as nodemailer from "nodemailer"

type SenderConfig = {
  provider?: "gmailAppPassword" | "smtp"
  email?: string
  senderName?: string
  appPassword?: string
}

function normStr(v: any): string {
  return String(v ?? "").trim()
}

function firstNameFromName(fullName: string): string {
  const raw = normStr(fullName)
  if (!raw) return "there"
  const token = raw.split(/\s+/).filter(Boolean)[0]
  return token || "there"
}

async function readOpsSender(): Promise<SenderConfig> {
  const snap = await adminDb.ref("admin/ops/authEmails/sender").get()
  const v = (snap.val() || {}) as any
  return {
    provider: (normStr(v.provider) as any) || "gmailAppPassword",
    email: normStr(v.email) || undefined,
    senderName: normStr(v.senderName) || undefined,
    appPassword: normStr(v.appPassword) || undefined,
  }
}

async function sendViaOpsSender(params: { to: string; subject: string; text: string; html: string }) {
  const sender = await readOpsSender()
  if (!sender.email || !sender.appPassword) {
    throw new Error("Bug auto-reply sender not configured (Ops → Auth Emails → Sender)")
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: sender.email, pass: sender.appPassword },
  })
  const fromName = sender.senderName || "1Stop"
  const from = fromName ? `"${fromName}" <${sender.email}>` : sender.email
  return transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  })
}

export const onBugReportCreated = onValueCreated(
  {
    ref: "companies/{companyId}/bugReports/{reportId}",
  },
  async (event) => {
    const companyId = String((event.params as any)?.companyId || "")
    const reportId = String((event.params as any)?.reportId || "")
    const report = (event.data?.val() || {}) as any

    const toEmail = normStr(report?.reportedByEmail)
    if (!toEmail) return

    // Best-effort de-dupe (in case of replays)
    const markerRef = adminDb.ref(`companies/${companyId}/bugReports/${reportId}/autoReply`)
    const markerSnap = await markerRef.get()
    if (markerSnap.exists() && markerSnap.val()?.sentAt) return

    const firstName = firstNameFromName(report?.reportedByName || "")
    const title = normStr(report?.title) || "Bug report"
    const appName = "1Stop"

    const subject = `We received your bug report: ${title}`
    const text = `Hi ${firstName},\n\nThanks for reporting this. We've received your bug report and our team will review it.\n\nSummary: ${title}\n\nThanks,\n${appName} Team`
    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <p>Hi ${firstName},</p>
  <p>Thanks for reporting this. We've received your bug report and our team will review it.</p>
  <p><strong>Summary:</strong> ${title}</p>
  <p>Thanks,<br/>${appName} Team</p>
</div>`

    const info = await sendViaOpsSender({ to: toEmail, subject, text, html })
    await markerRef.set({
      sentAt: Date.now(),
      messageId: (info as any)?.messageId || null,
      toEmail,
    })
  },
)

