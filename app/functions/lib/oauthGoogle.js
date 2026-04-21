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
exports.oauthCallbackGmail = exports.oauthGoogle = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
async function getGoogle() {
    // Lazy import to keep deploy-time export analysis fast.
    const mod = await Promise.resolve().then(() => __importStar(require("googleapis")));
    return mod.google;
}
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
        const google = await getGoogle();
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const companyId = req.query.company_id || "";
        const siteId = req.query.site_id || "default";
        const subsiteId = req.query.subsite_id || "default";
        const userId = req.query.user_id || "anonymous";
        // Prefer return_url (full absolute URL) over return_path (relative, broken for cross-origin)
        const returnUrl = req.query.return_url || "";
        const returnPath = req.query.return_path || "/admin/email";
        const state = Buffer.from(JSON.stringify({ provider: "gmail", companyId, siteId, subsiteId, userId, returnUrl, returnPath, ts: Date.now() })).toString("base64url");
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
// Helper: build the final redirect URL from decoded state.
// Prefers returnUrl (full absolute URL) over returnPath (relative path, legacy).
function buildReturnRedirect(decoded, fallback) {
    if (decoded === null || decoded === void 0 ? void 0 : decoded.returnUrl)
        return decoded.returnUrl;
    if (decoded === null || decoded === void 0 ? void 0 : decoded.returnPath)
        return decoded.returnPath;
    return fallback;
}
exports.oauthCallbackGmail = (0, https_1.onRequest)(async (req, res) => {
    // We'll determine the redirect target after decoding state.
    let redirectBase = '/admin/email'; // ultimate fallback
    try {
        const { code, state, error } = req.query;
        // Attempt an early state decode so even error/missing-param redirects go to the right place.
        let decoded = null;
        if (state) {
            try {
                decoded = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"));
                redirectBase = buildReturnRedirect(decoded, redirectBase);
            }
            catch ( /* keep default */_a) { /* keep default */ }
        }
        if (error) {
            console.error('Gmail OAuth error:', error);
            res.redirect(`${redirectBase}?error=oauth_failed&message=${encodeURIComponent(error)}`);
            return;
        }
        if (!code || !state) {
            res.redirect(`${redirectBase}?error=missing_parameters`);
            return;
        }
        // Get OAuth credentials
        const clientId = keys_1.FUNCTION_KEYS.google.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.google.clientSecret;
        const redirectUri = keys_1.FUNCTION_KEYS.google.redirectUri || `${req.protocol}://${req.get('host')}/oauthCallbackGmail`;
        if (!clientId || !clientSecret) {
            res.redirect(`${redirectBase}?error=missing_oauth_credentials`);
            return;
        }
        const google = await getGoogle();
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Extract context from state (already partially decoded above)
        const companyId = (decoded === null || decoded === void 0 ? void 0 : decoded.companyId) || req.query.company_id || '';
        const siteId = (decoded === null || decoded === void 0 ? void 0 : decoded.siteId) || req.query.site_id || 'default';
        const subsiteId = (decoded === null || decoded === void 0 ? void 0 : decoded.subsiteId) || req.query.subsite_id || 'default';
        const userId = (decoded === null || decoded === void 0 ? void 0 : decoded.userId) || req.query.user_id || 'anonymous';
        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (!companyId) {
            throw new Error('Company ID is required for OAuth token storage');
        }
        // Store tokens in Firestore with proper company/site/subsite association.
        // IMPORTANT: include userId so tokens are per-account (admin section should not share tokens).
        const tokenDocId = `${companyId}_${siteId}_${subsiteId}_${userId}_gmail`;
        await admin_1.firestore.collection('oauth_tokens').doc(tokenDocId).set({
            provider: 'gmail',
            email: userInfo.data.email,
            tokens: tokens,
            companyId: companyId,
            siteId: siteId,
            subsiteId: subsiteId,
            userId: userId,
            connectedAt: new Date(),
            lastUsed: new Date()
        });
        // Redirect back to the app with success
        const separator = redirectBase.includes('?') ? '&' : '?';
        res.redirect(`${redirectBase}${separator}success=true&provider=gmail&email=${encodeURIComponent(userInfo.data.email || '')}`);
    }
    catch (error) {
        console.error('Gmail OAuth callback error:', error);
        const separator = redirectBase.includes('?') ? '&' : '?';
        res.redirect(`${redirectBase}${separator}error=oauth_callback_failed`);
    }
});
//# sourceMappingURL=oauthGoogle.js.map