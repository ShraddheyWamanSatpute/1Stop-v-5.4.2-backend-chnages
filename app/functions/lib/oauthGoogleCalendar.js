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
exports.oauthCallbackGoogleCalendar = exports.oauthGoogleCalendar = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const keys_1 = require("./keys");
function resolveProto(req) {
    var _a;
    const xf = String(((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-proto"]) || "").split(",")[0].trim();
    return xf || req.protocol || "https";
}
exports.oauthGoogleCalendar = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Lazy import to keep deploy-time export analysis fast.
        const { google } = await Promise.resolve().then(() => __importStar(require("googleapis")));
        const clientId = keys_1.FUNCTION_KEYS.google.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.google.clientSecret;
        const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackGoogleCalendar`;
        if (!clientId || !clientSecret) {
            res.status(500).send("Missing Google OAuth credentials (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET).");
            return;
        }
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const companyId = req.query.company_id || "";
        const siteId = req.query.site_id || "default";
        const subsiteId = req.query.subsite_id || "default";
        const userId = req.query.user_id || "anonymous";
        const returnPath = req.query.return_path || "/Admin/Calendar";
        const state = Buffer.from(JSON.stringify({
            provider: "google_calendar",
            companyId,
            siteId,
            subsiteId,
            userId,
            returnPath,
            ts: Date.now(),
        })).toString("base64url");
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: ["openid", "email", "https://www.googleapis.com/auth/calendar"],
            state,
            prompt: "consent",
        });
        res.redirect(authUrl);
    }
    catch (error) {
        console.error("Google Calendar OAuth init error:", error);
        res.status(500).send("OAuth initialization failed");
    }
});
exports.oauthCallbackGoogleCalendar = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Lazy import to keep deploy-time export analysis fast.
        const { google } = await Promise.resolve().then(() => __importStar(require("googleapis")));
        const { code, state, error } = req.query;
        let returnPath = req.query.return_path || "/Admin/Calendar";
        if (error) {
            console.error("Google Calendar OAuth error:", error);
            res.redirect(`${returnPath}?error=oauth_failed&message=${encodeURIComponent(error)}`);
            return;
        }
        if (!code || !state) {
            res.redirect(`${returnPath}?error=missing_parameters`);
            return;
        }
        const clientId = keys_1.FUNCTION_KEYS.google.clientId;
        const clientSecret = keys_1.FUNCTION_KEYS.google.clientSecret;
        const redirectUri = `${resolveProto(req)}://${req.get("host")}/oauthCallbackGoogleCalendar`;
        if (!clientId || !clientSecret) {
            res.redirect(`${returnPath}?error=missing_oauth_credentials`);
            return;
        }
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
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
        if (!companyId)
            throw new Error("Company ID is required for OAuth token storage");
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email || "";
        const tokenDocId = `${companyId}_${siteId || "default"}_${subsiteId || "default"}_google_calendar`;
        await admin_1.firestore.collection("oauth_tokens").doc(tokenDocId).set({
            provider: "google_calendar",
            email,
            tokens,
            companyId,
            siteId: siteId || "default",
            subsiteId: subsiteId || "default",
            userId: userId || "anonymous",
            connectedAt: new Date(),
            lastUsed: new Date(),
        });
        res.redirect(`${returnPath}?success=true&provider=google_calendar&email=${encodeURIComponent(email)}`);
    }
    catch (err) {
        console.error("Google Calendar OAuth callback error:", err);
        const returnPath = req.query.return_path || "/Admin/Calendar";
        res.redirect(`${returnPath}?error=oauth_callback_failed`);
    }
});
//# sourceMappingURL=oauthGoogleCalendar.js.map