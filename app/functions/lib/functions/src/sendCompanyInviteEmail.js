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
exports.sendCompanyInviteEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const nodemailer = __importStar(require("nodemailer"));
const keys_1 = require("./keys");
exports.sendCompanyInviteEmail = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    try {
        const { recipientEmail, inviteLink, companyName } = req.body || {};
        if (!recipientEmail || !inviteLink) {
            res.status(400).json({ success: false, error: "recipientEmail and inviteLink are required" });
            return;
        }
        const mail = keys_1.FUNCTION_KEYS.mail;
        if (!(mail === null || mail === void 0 ? void 0 : mail.host) || !(mail === null || mail === void 0 ? void 0 : mail.user) || !(mail === null || mail === void 0 ? void 0 : mail.pass) || !(mail === null || mail === void 0 ? void 0 : mail.from)) {
            res.status(500).json({ success: false, error: "Mail credentials not configured" });
            return;
        }
        const transporter = nodemailer.createTransport({
            host: mail.host,
            port: Number(mail.port),
            secure: Boolean(mail.secure),
            auth: {
                user: mail.user,
                pass: mail.pass,
            },
        });
        const safeCompanyName = String(companyName || "your company");
        const subject = `You're invited to manage ${safeCompanyName} on 1Stop`;
        const textBody = `Hello,

You have been invited to manage ${safeCompanyName} on 1Stop.

To accept the invitation, click the link below:
${inviteLink}

If you weren't expecting this email, you can ignore it.

Thanks,
1Stop Team`;
        const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hello,</p>
        <p>You have been invited to manage <strong>${escapeHtml(safeCompanyName)}</strong> on 1Stop.</p>
        <p>
          <a href="${escapeHtml(inviteLink)}" style="display:inline-block;padding:10px 14px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;">
            Accept invitation
          </a>
        </p>
        <p style="word-break: break-all;">
          Or paste this link into your browser:<br/>
          <a href="${escapeHtml(inviteLink)}">${escapeHtml(inviteLink)}</a>
        </p>
        <p>If you weren't expecting this email, you can ignore it.</p>
        <p>Thanks,<br/>1Stop Team</p>
      </div>
    `;
        const info = await transporter.sendMail({
            from: mail.from,
            to: String(recipientEmail),
            subject,
            text: textBody,
            html: htmlBody,
        });
        res.status(200).json({ success: true, messageId: info.messageId });
    }
    catch (error) {
        console.error("sendCompanyInviteEmail error", error);
        res.status(500).json({ success: false, error: (error === null || error === void 0 ? void 0 : error.message) || "Failed to send email" });
    }
});
function escapeHtml(input) {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
//# sourceMappingURL=sendCompanyInviteEmail.js.map