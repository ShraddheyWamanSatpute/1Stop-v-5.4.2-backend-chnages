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
exports.sendEmailWithGmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const nodemailer = __importStar(require("nodemailer"));
exports.sendEmailWithGmail = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    try {
        const { recipientEmail, subject, body, companyId, siteId, subsiteId } = req.body;
        if (!recipientEmail || !subject || !body) {
            res.status(400).json({
                success: false,
                error: 'recipientEmail, subject, and body are required'
            });
            return;
        }
        if (!companyId) {
            res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
            return;
        }
        // Get email configuration from database
        const configPath = `companies/${companyId}/sites/${siteId || 'default'}/subsites/${subsiteId || 'default'}/emailConfig`;
        const configSnapshot = await admin_1.db.ref(configPath).once('value');
        const emailConfig = configSnapshot.val();
        if (!emailConfig || !emailConfig.email || !emailConfig.appPassword) {
            res.status(404).json({
                success: false,
                error: 'Email not configured. Please configure your Gmail and App Password in Bookings Settings.'
            });
            return;
        }
        // Create transporter using Gmail App Password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailConfig.email,
                pass: emailConfig.appPassword
            }
        });
        // Send email
        const info = await transporter.sendMail({
            from: `"${emailConfig.senderName || '1Stop System'}" <${emailConfig.email}>`,
            to: recipientEmail,
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
        });
        console.log('Email sent:', info.messageId);
        res.status(200).json({
            success: true,
            message: `Email sent successfully to ${recipientEmail}`,
            messageId: info.messageId
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        let errorMessage = 'Failed to send email';
        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Please check your Gmail App Password.';
        }
        else if (error.message) {
            errorMessage = error.message;
        }
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});
//# sourceMappingURL=sendEmailWithGmail.js.map