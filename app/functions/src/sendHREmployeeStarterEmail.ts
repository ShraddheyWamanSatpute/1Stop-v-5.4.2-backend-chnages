import { onRequest } from "firebase-functions/v2/https"
import { db } from "./admin"
import * as nodemailer from "nodemailer"
import { loadMailboxConfig } from "./mailConfigSecrets"

export const sendHREmployeeStarterEmail = onRequest({ cors: true }, async (req, res) => {
  // Explicit CORS headers (preflight + error paths).
  // Note: If the function isn't deployed, you'll still see CORS errors because the 404 response is served before this code runs.
  res.set("Access-Control-Allow-Origin", "*")
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.set("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" })
    return
  }

  try {
    const { companyId, siteId, subsiteId, employeeId, to, subject, body, inviteCode } = req.body || {}

    const companyIdStr = String(companyId || "").trim()
    const siteIdStr = String(siteId || "default").trim()
    const subsiteIdStr = String(subsiteId || "default").trim()
    const employeeIdStr = String(employeeId || "").trim()
    const inviteCodeStr = String(inviteCode || "").trim()
    const toStr = String(to || "").trim()
    const subjectStr = String(subject || "").trim()
    const bodyStr = String(body || "")

    if (!companyIdStr) {
      res.status(400).json({ success: false, error: "companyId is required" })
      return
    }
    if (!employeeIdStr) {
      res.status(400).json({ success: false, error: "employeeId is required" })
      return
    }
    if (!toStr || !subjectStr || !bodyStr) {
      res.status(400).json({ success: false, error: "to, subject, and body are required" })
      return
    }

    const basePath = `companies/${companyIdStr}/sites/${siteIdStr}/subsites/${subsiteIdStr}`
    const configPath = `${basePath}/hrEmailConfig`
    const emailConfig = await loadMailboxConfig(basePath, configPath, "hr")

    if (!emailConfig?.email || !emailConfig?.appPassword) {
      res.status(404).json({
        success: false,
        error: "HR mailbox not configured. Please add Gmail email + App Password in HR → Settings → Integrations.",
      })
      return
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailConfig.email,
        pass: emailConfig.appPassword,
      },
    })

    const from = `"${emailConfig.senderName || "1Stop HR"}" <${emailConfig.email}>`

    let messageId: string | undefined
    try {
      const info = await transporter.sendMail({
        from,
        to: toStr,
        subject: subjectStr,
        text: bodyStr,
        html: bodyStr.replace(/\n/g, "<br>"),
      })
      messageId = info.messageId
    } catch (e: any) {
      const now = Date.now()
      const msgRef = db.ref(`${basePath}/hr/email/messages`).push()
      await msgRef.set({
        direction: "outbound",
        status: "failed",
        provider: "gmail",
        error: e?.code === "EAUTH" ? "Authentication failed. Check Gmail app password." : (e?.message || "Failed to send"),
        employeeId: employeeIdStr,
        inviteCode: inviteCodeStr,
        from: emailConfig.email,
        to: toStr,
        subject: subjectStr,
        bodyPreview: bodyStr.slice(0, 500),
        body: bodyStr,
        createdAt: now,
        updatedAt: now,
      })

      res.status(500).json({
        success: false,
        error: e?.code === "EAUTH" ? "Authentication failed. Please check your Gmail App Password." : (e?.message || "Failed to send email"),
      })
      return
    }

    const now = Date.now()
    const msgRef = db.ref(`${basePath}/hr/email/messages`).push()
    await msgRef.set({
      direction: "outbound",
      status: "sent",
      provider: "gmail",
      employeeId: employeeIdStr,
      inviteCode: inviteCodeStr,
      from: emailConfig.email,
      to: toStr,
      subject: subjectStr,
      bodyPreview: bodyStr.slice(0, 500),
      body: bodyStr,
      messageId: messageId || "",
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    })

    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${toStr}`,
      messageId: messageId || "",
    })
  } catch (error: any) {
    console.error("Error sending HR starter email:", error)
    res.status(500).json({ success: false, error: error?.message || "Failed to send email" })
  }
})
