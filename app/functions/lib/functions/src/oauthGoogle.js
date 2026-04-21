"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthCallbackGmail = exports.oauthGoogle = void 0;
const https_1 = require("firebase-functions/v2/https");
const googleapis_1 = require("googleapis");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
exports.oauthGoogle = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Get OAuth credentials from centralized keys
        const clientId = keys_1.FUNCTION_KEYS.google.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.google.clientSecret;
        const redirectUri = keys_1.FUNCTION_KEYS.google.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackGmail`;
        if (!clientId || !clientSecret) {
            res.status(500).send('Missing Google OAuth credentials (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).');
            return;
        }
        console.log('OAuth Google function called with:', { hasClientId: !!clientId, redirectUri });
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const companyId = req.query.company_id || "";
        const siteId = req.query.site_id || "default";
        const subsiteId = req.query.subsite_id || "default";
        const userId = req.query.user_id || "anonymous";
        const returnPath = req.query.return_path || "/admin/email";
        const state = Buffer.from(JSON.stringify({ provider: "gmail", companyId, siteId, subsiteId, userId, returnPath, ts: Date.now() })).toString("base64url");
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'openid',
                'email',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly',
            ],
            state,
            prompt: 'consent'
        });
        res.redirect(authUrl);
    }
    catch (error) {
        console.error('Gmail OAuth error:', error);
        res.status(500).send('OAuth initialization failed');
    }
});
exports.oauthCallbackGmail = (0, https_1.onRequest)(async (req, res) => {
    try {
        const { code, state, error } = req.query;
        let returnPath = req.query.return_path || '/admin/email';
        if (error) {
            console.error('Gmail OAuth error:', error);
            res.redirect(`${returnPath}?error=oauth_failed&message=${encodeURIComponent(error)}`);
            return;
        }
        if (!code || !state) {
            res.redirect(`${returnPath}?error=missing_parameters`);
            return;
        }
        // Get OAuth credentials
        const clientId = keys_1.FUNCTION_KEYS.google.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.google.clientSecret;
        const redirectUri = keys_1.FUNCTION_KEYS.google.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackGmail`;
        if (!clientId || !clientSecret) {
            res.redirect(`${returnPath}?error=missing_oauth_credentials`);
            return;
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Decode state for context (preferred)
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
            // fallback to query params (legacy)
            companyId = req.query.company_id;
            siteId = req.query.site_id;
            subsiteId = req.query.subsite_id;
            userId = req.query.user_id;
        }
        // Get user info
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (!companyId) {
            throw new Error('Company ID is required for OAuth token storage');
        }
        // Store tokens in Firestore with proper company/site/subsite association.
        // IMPORTANT: include userId so tokens are per-account (admin section should not share tokens).
        const tokenDocId = `${companyId}_${siteId || 'default'}_${subsiteId || 'default'}_${userId || 'default'}_gmail`;
        await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).set({
            provider: 'gmail',
            email: userInfo.data.email,
            tokens: tokens,
            companyId: companyId,
            siteId: siteId || 'default',
            subsiteId: subsiteId || 'default',
            userId: userId || 'anonymous',
            connectedAt: new Date(),
            lastUsed: new Date()
        });
        // Redirect back to settings with success
        res.redirect(`${returnPath}?success=true&provider=gmail&email=${encodeURIComponent(userInfo.data.email || '')}`);
    }
    catch (error) {
        console.error('Gmail OAuth callback error:', error);
        const returnPath = req.query.return_path || '/admin/email';
        res.redirect(`${returnPath}?error=oauth_callback_failed`);
    }
});
//# sourceMappingURL=oauthGoogle.js.map