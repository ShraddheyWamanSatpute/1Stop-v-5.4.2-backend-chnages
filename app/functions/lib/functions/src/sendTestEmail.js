"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const googleapis_1 = require("googleapis");
const keys_1 = require("./keys");
exports.sendTestEmail = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        const { provider, recipientEmail, companyId, siteId, subsiteId } = req.body;
        if (!provider || !recipientEmail) {
            res.status(400).json({
                success: false,
                error: 'Provider and recipient email are required'
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
        const tokenDocId = `${companyId}_${siteId || 'default'}_${subsiteId || 'default'}_${provider}`;
        console.log('Looking for OAuth token:', tokenDocId);
        // Get OAuth tokens from Firestore
        const tokenDoc = await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).get();
        if (!tokenDoc.exists) {
            res.status(404).json({
                success: false,
                error: `No ${provider} account connected. Please connect your account first.`
            });
            return;
        }
        const tokenData = tokenDoc.data();
        if (!(tokenData === null || tokenData === void 0 ? void 0 : tokenData.tokens)) {
            res.status(404).json({
                success: false,
                error: 'Invalid token data'
            });
            return;
        }
        if (provider === 'gmail') {
            await sendGmailTestEmail(tokenData.tokens, recipientEmail, tokenData.email);
            // Update last used timestamp
            await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).update({
                lastUsed: new Date()
            });
            res.status(200).json({
                success: true,
                message: `Test email sent successfully to ${recipientEmail} from ${tokenData.email}`
            });
        }
        else if (provider === 'outlook') {
            await sendOutlookTestEmail(tokenData.tokens, recipientEmail, tokenData.email);
            // Update last used timestamp
            await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).update({
                lastUsed: new Date()
            });
            res.status(200).json({
                success: true,
                message: `Test email sent successfully to ${recipientEmail} from ${tokenData.email}`
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Unsupported provider. Use "gmail" or "outlook"'
            });
        }
    }
    catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            error: `Failed to send test email: ${error.message}`
        });
    }
});
async function sendGmailTestEmail(tokens, recipientEmail, senderEmail) {
    const oauth2Client = new googleapis_1.google.auth.OAuth2(keys_1.FUNCTION_KEYS.google.clientId, keys_1.FUNCTION_KEYS.google.clientSecret);
    oauth2Client.setCredentials(tokens);
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    // Create email content
    const subject = 'Test Email from 1Stop System';
    const body = `Hello,

This is a test email from your 1Stop booking system to verify that your email configuration is working correctly.

Email sent from: ${senderEmail}
Sent at: ${new Date().toLocaleString()}

If you received this email, your email integration is working properly!

Best regards,
1Stop Team`;
    // Encode email in base64
    const message = [
        `To: ${recipientEmail}`,
        `From: ${senderEmail}`,
        `Subject: ${subject}`,
        '',
        body
    ].join('\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });
}
async function sendOutlookTestEmail(tokens, recipientEmail, senderEmail) {
    const subject = 'Test Email from 1Stop System';
    const body = `Hello,

This is a test email from your 1Stop booking system to verify that your email configuration is working correctly.

Email sent from: ${senderEmail}
Sent at: ${new Date().toLocaleString()}

If you received this email, your email integration is working properly!

Best regards,
1Stop Team`;
    const emailMessage = {
        message: {
            subject: subject,
            body: {
                contentType: 'Text',
                content: body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: recipientEmail
                    }
                }
            ]
        },
        saveToSentItems: 'true'
    };
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailMessage)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send Outlook email: ${response.statusText} - ${errorText}`);
    }
}
//# sourceMappingURL=sendTestEmail.js.map