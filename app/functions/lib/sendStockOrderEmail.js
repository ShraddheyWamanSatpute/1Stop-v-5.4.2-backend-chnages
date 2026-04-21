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
exports.sendStockOrderEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const nodemailer = __importStar(require("nodemailer"));
const mailConfigSecrets_1 = require("./mailConfigSecrets");
exports.sendStockOrderEmail = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    try {
        const { companyId, siteId, subsiteId, purchaseId, supplierId, to, subject, body, } = req.body || {};
        const companyIdStr = String(companyId || "").trim();
        const siteIdStr = String(siteId || "default").trim();
        const subsiteIdStr = String(subsiteId || "default").trim();
        const purchaseIdStr = String(purchaseId || "").trim();
        const supplierIdStr = String(supplierId || "").trim();
        const toStr = String(to || "").trim();
        const subjectStr = String(subject || "").trim();
        const bodyStr = String(body || "");
        if (!companyIdStr) {
            res.status(400).json({ success: false, error: "companyId is required" });
            return;
        }
        if (!purchaseIdStr) {
            res.status(400).json({ success: false, error: "purchaseId is required" });
            return;
        }
        if (!toStr || !subjectStr || !bodyStr) {
            res.status(400).json({ success: false, error: "to, subject, and body are required" });
            return;
        }
        const basePath = `companies/${companyIdStr}/sites/${siteIdStr}/subsites/${subsiteIdStr}`;
        const configPath = `${basePath}/stockEmailConfig`;
        const emailConfig = await (0, mailConfigSecrets_1.loadMailboxConfig)(basePath, configPath, "stock");
        if (!(emailConfig === null || emailConfig === void 0 ? void 0 : emailConfig.email) || !(emailConfig === null || emailConfig === void 0 ? void 0 : emailConfig.appPassword)) {
            res.status(404).json({
                success: false,
                error: "Stock Orders mailbox not configured. Please add Gmail email + App Password in Order Delivery.",
            });
            return;
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailConfig.email,
                pass: emailConfig.appPassword,
            },
        });
        const from = `"${emailConfig.senderName || "1Stop Stock"}" <${emailConfig.email}>`;
        let messageId;
        try {
            const info = await transporter.sendMail({
                from,
                to: toStr,
                subject: subjectStr,
                text: bodyStr,
                html: bodyStr.replace(/\n/g, "<br>"),
            });
            messageId = info.messageId;
        }
        catch (e) {
            // Log failed send
            const now = Date.now();
            const msgRef = admin_1.db.ref(`${basePath}/stock/email/messages`).push();
            await msgRef.set({
                direction: "outbound",
                status: "failed",
                error: (e === null || e === void 0 ? void 0 : e.code) === "EAUTH" ? "Authentication failed. Check Gmail app password." : ((e === null || e === void 0 ? void 0 : e.message) || "Failed to send"),
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
            });
            res.status(500).json({
                success: false,
                error: (e === null || e === void 0 ? void 0 : e.code) === "EAUTH" ? "Authentication failed. Please check your Gmail App Password." : ((e === null || e === void 0 ? void 0 : e.message) || "Failed to send email"),
            });
            return;
        }
        // Log success
        const now = Date.now();
        const msgRef = admin_1.db.ref(`${basePath}/stock/email/messages`).push();
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
        });
        res.status(200).json({
            success: true,
            message: `Email sent successfully to ${toStr}`,
            messageId: messageId || "",
        });
    }
    catch (error) {
        console.error("Error sending stock order email:", error);
        res.status(500).json({ success: false, error: (error === null || error === void 0 ? void 0 : error.message) || "Failed to send email" });
    }
});
//# sourceMappingURL=sendStockOrderEmail.js.map