"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthCallbackOutlookCalendar = exports.oauthOutlookCalendar = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
function resolveProto(req) {
    var _a;
    const xf = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-proto"]) || "").split(",")[0].trim();
    return xf || req.protocol || "https";
}
exports.oauthOutlookCalendar = (0, https_1.onRequest)(async (req, res) => {
    try {
        const clientId = keys_1.FUNCTION_KEYS.outlook.clientId;
        const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackOutlookCalendar`;
        if (!clientId) {
            res.status(500).send("Missing Outlook OAuth client id (OUTLOOK_CLIENT_ID or MICROSOFT_CLIENT_ID).");
            return;
        }
        const companyId = req.query.company_id || "";
        const siteId = req.query.site_id || "default";
        const subsiteId = req.query.subsite_id || "default";
        const userId = req.query.user_id || "anonymous";
        const returnPath = req.query.return_path || "/Admin/Calendar";
        const state = Buffer.from(JSON.stringify({
            provider: "outlook_calendar",
            companyId,
            siteId,
            subsiteId,
            userId,
            returnPath,
            ts: Date.now(),
        })).toString("base64url");
        const scope = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "https://graph.microsoft.com/User.Read",
            "https://graph.microsoft.com/Calendars.ReadWrite",
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
        console.error("Outlook Calendar OAuth init error:", error);
        res.status(500).send("OAuth initialization failed");
    }
});
exports.oauthCallbackOutlookCalendar = (0, https_1.onRequest)(async (req, res) => {
    try {
        const { code, state, error } = req.query;
        let returnPath = req.query.return_path || "/Admin/Calendar";
        if (error) {
            console.error("Outlook Calendar OAuth error:", error);
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
        const clientId = keys_1.FUNCTION_KEYS.outlook.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.outlook.clientSecret;
        const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackOutlookCalendar`;
        if (!clientId || !clientSecret) {
            res.redirect(`${returnPath}?error=missing_oauth_credentials`);
            return;
        }
        const scope = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "https://graph.microsoft.com/User.Read",
            "https://graph.microsoft.com/Calendars.ReadWrite",
        ].join(" ");
        const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                scope,
            }),
        });
        if (!tokenResponse.ok)
            throw new Error("Failed to exchange code for tokens");
        const tokens = await tokenResponse.json();
        const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (!userResponse.ok)
            throw new Error("Failed to get user info");
        const userInfo = await userResponse.json();
        if (!companyId)
            throw new Error("Company ID is required for OAuth token storage");
        const email = userInfo.mail || userInfo.userPrincipalName || "";
        const tokenDocId = `${companyId}_${siteId || "default"}_${subsiteId || "default"}_outlook_calendar`;
        await admin_1.firestore.collection("oauth_tokens").doc(tokenDocId).set({
            provider: "outlook_calendar",
            email,
            tokens,
            companyId,
            siteId: siteId || "default",
            subsiteId: subsiteId || "default",
            userId: userId || "anonymous",
            connectedAt: new Date(),
            lastUsed: new Date(),
        });
        res.redirect(`${returnPath}?success=true&provider=outlook_calendar&email=${encodeURIComponent(email)}`);
    }
    catch (err) {
        console.error("Outlook Calendar OAuth callback error:", err);
        const returnPath = req.query.return_path || "/Admin/Calendar";
        res.redirect(`${returnPath}?error=oauth_callback_failed`);
    }
});
//# sourceMappingURL=oauthOutlookCalendar.js.map