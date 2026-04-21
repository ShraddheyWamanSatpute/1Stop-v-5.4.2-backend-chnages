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
exports.onBugReportCreated = void 0;
const database_1 = require("firebase-functions/v2/database");
const admin_1 = require("./admin");
const nodemailer = __importStar(require("nodemailer"));
function normStr(v) {
    return String(v !== null && v !== void 0 ? v : "").trim();
}
function firstNameFromName(fullName) {
    const raw = normStr(fullName);
    if (!raw)
        return "there";
    const token = raw.split(/\s+/).filter(Boolean)[0];
    return token || "there";
}
async function readOpsSender() {
    const snap = await admin_1.db.ref("admin/ops/authEmails/sender").get();
    const v = (snap.val() || {});
    return {
        provider: normStr(v.provider) || "gmailAppPassword",
        email: normStr(v.email) || undefined,
        senderName: normStr(v.senderName) || undefined,
        appPassword: normStr(v.appPassword) || undefined,
    };
}
async function sendViaOpsSender(params) {
    const sender = await readOpsSender();
    if (!sender.email || !sender.appPassword) {
        throw new Error("Bug auto-reply sender not configured (Ops → Auth Emails → Sender)");
    }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: sender.email, pass: sender.appPassword },
    });
    const fromName = sender.senderName || "1Stop";
    const from = fromName ? `"${fromName}" <${sender.email}>` : sender.email;
    return transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
    });
}
exports.onBugReportCreated = (0, database_1.onValueCreated)({
    ref: "companies/{companyId}/bugReports/{reportId}",
}, async (event) => {
    var _a, _b, _c, _d;
    const companyId = String(((_a = event.params) === null || _a === void 0 ? void 0 : _a.companyId) || "");
    const reportId = String(((_b = event.params) === null || _b === void 0 ? void 0 : _b.reportId) || "");
    const report = (((_c = event.data) === null || _c === void 0 ? void 0 : _c.val()) || {});
    const toEmail = normStr(report === null || report === void 0 ? void 0 : report.reportedByEmail);
    if (!toEmail)
        return;
    // Best-effort de-dupe (in case of replays)
    const markerRef = admin_1.db.ref(`companies/${companyId}/bugReports/${reportId}/autoReply`);
    const markerSnap = await markerRef.get();
    if (markerSnap.exists() && ((_d = markerSnap.val()) === null || _d === void 0 ? void 0 : _d.sentAt))
        return;
    const firstName = firstNameFromName((report === null || report === void 0 ? void 0 : report.reportedByName) || "");
    const title = normStr(report === null || report === void 0 ? void 0 : report.title) || "Bug report";
    const appName = "1Stop";
    const subject = `We received your bug report: ${title}`;
    const text = `Hi ${firstName},\n\nThanks for reporting this. We've received your bug report and our team will review it.\n\nSummary: ${title}\n\nThanks,\n${appName} Team`;
    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <p>Hi ${firstName},</p>
  <p>Thanks for reporting this. We've received your bug report and our team will review it.</p>
  <p><strong>Summary:</strong> ${title}</p>
  <p>Thanks,<br/>${appName} Team</p>
</div>`;
    const info = await sendViaOpsSender({ to: toEmail, subject, text, html });
    await markerRef.set({
        sentAt: Date.now(),
        messageId: (info === null || info === void 0 ? void 0 : info.messageId) || null,
        toEmail,
    });
});
//# sourceMappingURL=bugReportAutoReply.js.map