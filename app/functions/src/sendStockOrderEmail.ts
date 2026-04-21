import { onRequest } from "firebase-functions/v2/https"
import { db } from "./admin"
import * as nodemailer from "nodemailer"
import { loadMailboxConfig } from "./mailConfigSecrets"

export const sendStockOrderEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("")
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" })
    return
  }

  try {
    const {
      companyId,
      siteId,
      subsiteId,
      purchaseId,
      supplierId,
      to,
      subject,
      body,
    } = req.body || {}

    const companyIdStr = String(companyId || "").trim()
    const siteIdStr = String(siteId || "default").trim()
    const subsiteIdStr = String(subsiteId || "default").trim()
    const purchaseIdStr = String(purchaseId || "").trim()
    const supplierIdStr = String(supplierId || "").trim()
    const toStr = String(to || "").trim()
    const subjectStr = String(subject || "").trim()
    const bodyStr = String(body || "")

    if (!companyIdStr) {
      res.status(400).json({ success: false, error: "companyId is required" })
      return
    }
    if (!purchaseIdStr) {
      res.status(400).json({ success: false, error: "purchaseId is required" })
      return
    }
    if (!toStr || !subjectStr || !bodyStr) {
      res.status(400).json({ success: false, error: "to, subject, and body are required" })
      return
    }

    const basePath = `companies/${companyIdStr}/sites/${siteIdStr}/subsites/${subsiteIdStr}`
    const configPath = `${basePath}/stockEmailConfig`
    const emailConfig = await loadMailboxConfig(basePath, configPath, "stock")

    if (!emailConfig?.email || !emailConfig?.appPassword) {
      res.status(404).json({
        success: false,
        error: "Stock Orders mailbox not configured. Please add Gmail email + App Password in Order Delivery.",
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

    const from = `"${emailConfig.senderName || "1Stop Stock"}" <${emailConfig.email}>`

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
      // Log failed send
      const now = Date.now()
      const msgRef = db.ref(`${basePath}/stock/email/messages`).push()
      await msgRef.set({
        direction: "outbound",
        status: "failed",
        error: e?.code === "EAUTH" ? "Authentication failed. Check Gmail app password." : (e?.message || "Failed to send"),
        provider: "gmail",
        purchaseId: purchaseIdStr,
        supplierId: supplierIdStr,
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

    // Log success
    const now = Date.now()
    const msgRef = db.ref(`${basePath}/stock/email/messages`).push()
    await msgRef.set({
      direction: "outbound",
      status: "sent",
      provider: "gmail",
      purchaseId: purchaseIdStr,
      supplierId: supplierIdStr,
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
    console.error("Error sending stock order email:", error)
    res.status(500).json({ success: false, error: error?.message || "Failed to send email" })
  }
})

