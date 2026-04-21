"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthCallbackOutlook = exports.oauthOutlook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
exports.oauthOutlook = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Get OAuth credentials from centralized keys
        const clientId = keys_1.FUNCTION_KEYS.outlook.clientId;
        const redirectUri = keys_1.FUNCTION_KEYS.outlook.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackOutlook`;
        if (!clientId) {
            res.status(500).send('Missing Outlook OAuth client id (OUTLOOK_CLIENT_ID or MICROSOFT_CLIENT_ID).');
            return;
        }
        const companyId = req.query.company_id || "";
        const siteId = req.query.site_id || "default";
        const subsiteId = req.query.subsite_id || "default";
        const userId = req.query.user_id || "anonymous";
        const returnPath = req.query.return_path || "/admin/email";
        const state = Buffer.from(JSON.stringify({ provider: "outlook", companyId, siteId, subsiteId, userId, returnPath, ts: Date.now() })).toString("base64url");
        const scope = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Mail.Send",
        ].join(" ");
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}&` +
            `response_type=code&` +
            `response_mode=query&` +
            `state=${encodeURIComponent(state)}&` +
            `prompt=consent`;
        res.redirect(authUrl);
    }
    catch (error) {
        console.error('Outlook OAuth error:', error);
        res.status(500).send('OAuth initialization failed');
    }
});
exports.oauthCallbackOutlook = (0, https_1.onRequest)(async (req, res) => {
    try {
        const { code, state, error } = req.query;
        let returnPath = req.query.return_path || "/admin/email";
        if (error) {
            console.error('Outlook OAuth error:', error);
            res.redirect(`${returnPath}?error=oauth_failed&message=${encodeURIComponent(error)}`);
            return;
        }
        if (!code || !state) {
            res.redirect(`${returnPath}?error=missing_parameters`);
            return;
        }
        let companyId;
        let siteId;
        let subsiteId;
        let userId;
        try {
            const decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
            companyId = decoded.companyId;
            siteId = decoded.siteId;
            subsiteId = decoded.subsiteId;
            userId = decoded.userId;
            if (decoded.returnPath)
                returnPath = decoded.returnPath;
        }
        catch (_a) {
            companyId = req.query.company_id;
            siteId = req.query.site_id;
            subsiteId = req.query.subsite_id;
            userId = req.query.user_id;
        }
        // Get OAuth credentials
        const clientId = keys_1.FUNCTION_KEYS.outlook.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.outlook.clientSecret;
        const redirectUri = keys_1.FUNCTION_KEYS.outlook.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackOutlook`;
        if (!clientId || !clientSecret) {
            res.redirect(`${returnPath}?error=missing_oauth_credentials`);
            return;
        }
        const scope = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Mail.Send",
        ].join(" ");
        // Exchange code for tokens using Microsoft Graph API
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope
            })
        });
        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for tokens');
        }
        const tokens = await tokenResponse.json();
        // Get user info from Microsoft Graph
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });
        if (!userResponse.ok) {
            throw new Error('Failed to get user info');
        }
        const userInfo = await userResponse.json();
        if (!companyId) {
            throw new Error('Company ID is required for OAuth token storage');
        }
        // Store tokens in Firestore with proper company/site/subsite association.
        // IMPORTANT: include userId so tokens are per-account (admin section should not share tokens).
        const tokenDocId = `${companyId}_${siteId || 'default'}_${subsiteId || 'default'}_${userId || 'default'}_outlook`;
        await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).set({
            provider: 'outlook',
            email: userInfo.mail || userInfo.userPrincipalName,
            tokens: tokens,
            companyId: companyId,
            siteId: siteId || 'default',
            subsiteId: subsiteId || 'default',
            userId: userId || 'anonymous',
            connectedAt: new Date(),
            lastUsed: new Date()
        });
        // Redirect back to settings with success
        res.redirect(`${returnPath}?success=true&provider=outlook&email=${encodeURIComponent(userInfo.mail || userInfo.userPrincipalName || '')}`);
    }
    catch (error) {
        console.error('Outlook OAuth callback error:', error);
        const returnPath = req.query.return_path || '/admin/email';
        res.redirect(`${returnPath}?error=oauth_callback_failed`);
    }
});
//# sourceMappingURL=oauthOutlook.js.map